import {BaseInvoiceDataExtractor} from "../abstructs/BaseInvoiceDataExtractor";
import {ExtractDataParams} from "../../types/ExtractDataParams";
import {InvoiceData, InvoiceDataSchema} from "../../schemas/InvoiceData";
import {exportLocalStorageInvoiceData} from "../ExportLocalStorageInvoiceData";
import axios from "axios";

export class Phi4Extractor extends BaseInvoiceDataExtractor {
  protected createPrompt(params: ExtractDataParams): string {
    return `
      以下の請求書のテキストから、JSONフォーマットで情報を抽出してください。

      制約条件：
      1. 請求元（payee）と請求先（payer）の判別方法：
        - 請求先は「御中」「様」などの文字が付随する会社情報を請求先として扱う
        - 請求先は「請求書」、「御請求書」の右側にある、会社情報を指す
        - 請求先は比較的PDFの右上にあることが多い
        - 請求元は請求先以外に存在する会社情報のまとまりを扱う
        - 請求元は比較的PDFの左側か下にある会社情報であることが多い
        - 印鑑や社印がある方を請求元として扱う

      2. データフォーマット：
        - 単価(item_unit_price)と金額(item_amount)を明確に区別すること
        - 単価は1個あたりの価格を示す
        - 単価は表のレコード内の金額より、右側にあることが多い
        - 金額は単価と数量の積であることが多いが、消費税も掛け合わせてある数値であることがある
        - 表の同じレコード内にある単価＊数量に近い数値を金額として扱う
        - 金額はフォーマットによっては「価格」の列を示すことがある
        - 数量は単価と数量は同じ表のレコードに存在することがほとんどで、真ん中ら辺にあることが多い
        - 日付はYYYY/MM/DD形式で統一すること
        - 数値データはカンマを除去し、数値型として処理すること
        - 郵便番号はTは削除して返すこと
        - 銀行名(bank_name)は〇〇銀行まで入れて、支店名まである場合は、支店名は削除する
        - 支店名(bank_store_type)は、銀行名の後ろにある場合は、その支店名を設定する
        - 口座種別(bank_type)は、預金の文字がある場合は、預金の文字は削除する（普通か当座になる）

      3. 判別のプロセス：
        まず、テキスト内の会社情報を特定し、上記の判別基準に基づいて請求元と請求先を分類してください。
        その後、それぞれの情報を適切なフィールドに割り当ててください。
        文書に記載されている内容をできるだけ原文のまま抽出
        不要な加工や解釈を避ける
        表記ゆれの統一は最小限に留める

      必須項目および任意項目を含む全ての情報を抽出してください：

      請求元情報:
      - payee_company_name: 請求元会社名 (必須)
      - payee_postal_code: 請求元郵便番号 (必須)
      - payee_address: 請求元住所 (必須)
      - payee_tel: 請求元電話番号
      - payee_email: 請求元メールアドレス
      - payee_person_name: 請求元担当者名

      請求先情報:
      - payer_company_name: 請求先会社名/個人名 (必須)
      - payer_address: 請求先住所
      - payer_postal_code: 請求先郵便番号
      - payer_person_name: 請求先担当者名

      請求書情報:
      - invoice_date: 請求日
      - due_date: 支払期日
      - invoice_number: 請求書番号
      - total_amount: 合計金額 (必須)
      - sub_total_amount: 小計 (必須)
      - total_tax_amount: 消費税合計 (必須)

      銀行情報:
      - bank_name: 銀行名
      - bank_account_name: 口座名義
      - bank_store_type: 支店名/本店
      - bank_type: 口座種別（普通預金/当座預金,普通/当座）
      - bank_number: 口座番号

      明細情報 (invoice_details配列):
      - item_date: 日付 (必須)
      - item_description: 項目説明 (必須)
      - item_amount: 金額 (必須)
      - item_quantity: 数量 (必須)
      - item_unit_price: 単価 (必須)

      備考：
      - memo: 備考欄のテキスト

      全ての金額は数値として返してください（カンマや通貨記号は除去）。
      日付は "YYYY-MM-DD" 形式で返してください。
      見つからない項目は null として返してください。

      判別プロセスの説明も含めて、以下のような形式でJSONを返してください：

      {
        "analysis": {
          "payee_identification_reason": "この会社を請求元と判断した理由",
          "payer_identification_reason": "この会社を請求先と判断した理由"
        },
        // 通常のデータフィールド
        ...
      }

      テキスト:
      ${params.text}
      `;
  }

  async extractData(params: ExtractDataParams): Promise<InvoiceData> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < this.maxRetries) {
      try {
        const response = await axios.post("http://localhost:8080/analyze-invoice", {
          text: this.createPrompt(params),
        });

        if (response.data.status !== "success") {
          throw new Error("Phi4 APIでの分析に失敗しました");
        }

        const invoiceData = response.data.analysis;

        // LLMの分析結果を保存
        await exportLocalStorageInvoiceData(JSON.stringify(invoiceData), "phi4_analysis_results");

        // バリデーション
        const validationResult = InvoiceDataSchema.safeParse(invoiceData);
        if (!validationResult.success) {
          throw new Error(`バリデーションエラー: ${validationResult.error.message}`);
        }


        return invoiceData;
      } catch (error) {
        const err = error as Error;
        lastError = err;
        attempts++;
        console.warn(`試行 ${attempts}/${this.maxRetries} 失敗: ${err.message}`);

        if (attempts === this.maxRetries) {
          throw new Error(`データ抽出に失敗しました: ${lastError.message}`);
        }
      }
    }

    throw lastError;
  }
}

export async function processPhi4InvoiceData(ocrResponse: any) {
  try {
    const extractor = new Phi4Extractor();
    return await extractor.extractData({
      text: ocrResponse.text,
    });
  } catch (error) {
    throw new Error("請求書データをPhi4で整形できませんでした");
  }
}
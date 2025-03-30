import {BaseInvoiceDataExtractor} from "../abstructs/BaseInvoiceDataExtractor";
import {ExtractDataParams} from "../../types/ExtractDataParams";
import {InvoiceData, InvoiceDataSchema} from "../../schemas/InvoiceData";
import {exportLocalStorageInvoiceData} from "../ExportLocalStorageInvoiceData";
import axios from "axios";

export class Extractor extends BaseInvoiceDataExtractor {
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

      4. 重要：レスポンスのフォーマットについて
        - ネストされた構造は使用せず、すべてのフィールドをトップレベルに配置してください
        - 例えば、payee_information.company_name ではなく、直接 payee_company_name として返してください
        - 同様に、invoice_information.total_amount ではなく、直接 total_amount として返してください

      必須項目および任意項目を含む全ての情報を抽出してください：

      {
        "analysis": {
          "payee_identification_reason": "この会社を請求元と判断した理由",
          "payer_identification_reason": "この会社を請求先と判断した理由"
        },
        "payee_company_name": "string (必須)",
        "payee_postal_code": "string (必須)",
        "payee_address": "string (必須)",
        "payee_tel": "string | null",
        "payee_email": "string | null",
        "payee_person_name": "string | null",
        "payer_company_name": "string (必須)",
        "payer_address": "string | null",
        "payer_postal_code": "string | null",
        "payer_person_name": "string | null",
        "invoice_date": "string | null",
        "due_date": "string | null",
        "invoice_number": "string | null",
        "total_amount": "number (必須)",
        "sub_total_amount": "number (必須)",
        "total_tax_amount": "number (必須)",
        "bank_name": "string | null",
        "bank_account_name": "string | null",
        "bank_store_type": "string | null",
        "bank_type": "string | null",
        "bank_number": "string | null",
        "invoice_details": [
          {
            "item_date": "string (必須)",
            "item_description": "string (必須)",
            "item_amount": "number (必須)",
            "item_quantity": "number (必須)",
            "item_unit_price": "number (必須)"
          }
        ],
        "memo": "string | null"
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

        console.log("Phi4 APIレスポンス:", JSON.stringify(response.data, null, 2));

        // レスポンスデータを解析
        const rawData = response.data.analysis;
        let invoiceData;
        
        try {
          if (typeof rawData === "string") {
            // Markdownブロックを探す
            const jsonMatch = rawData.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
              // Markdownブロック内のJSONをパース
              invoiceData = JSON.parse(jsonMatch[1]);
            } else {
              // 直接JSONとしてパース
              invoiceData = JSON.parse(rawData);
            }
          } else {
            invoiceData = rawData;
          }

          // 必須フィールドの存在確認と値の設定
          if (!invoiceData.payee_company_name && invoiceData.payee?.company_name) {
            invoiceData.payee_company_name = invoiceData.payee.company_name;
          }
          if (!invoiceData.payee_address && invoiceData.payee?.address) {
            invoiceData.payee_address = invoiceData.payee.address;
          }
          if (!invoiceData.payee_postal_code && invoiceData.payee?.postal_code) {
            invoiceData.payee_postal_code = invoiceData.payee.postal_code;
          }
          if (!invoiceData.payee_person_name && invoiceData.payee?.person_name) {
            invoiceData.payee_person_name = invoiceData.payee.person_name;
          }

          // 請求先情報
          if (!invoiceData.payer_company_name && (invoiceData.payer?.company_name || invoiceData.payer?.individual_name)) {
            invoiceData.payer_company_name = invoiceData.payer.company_name || invoiceData.payer.individual_name;
          }
          if (!invoiceData.payer_address && invoiceData.payer?.address) {
            invoiceData.payer_address = invoiceData.payer.address;
          }
          if (!invoiceData.payer_postal_code && invoiceData.payer?.postal_code) {
            invoiceData.payer_postal_code = invoiceData.payer.postal_code;
          }

          // 請求書情報
          if (!invoiceData.invoice_date && invoiceData.invoice_information?.invoice_date) {
            invoiceData.invoice_date = invoiceData.invoice_information.invoice_date;
          }
          if (!invoiceData.due_date && invoiceData.invoice_information?.due_date) {
            invoiceData.due_date = invoiceData.invoice_information.due_date;
          }
          if (!invoiceData.invoice_number && invoiceData.invoice_information?.invoice_number) {
            invoiceData.invoice_number = invoiceData.invoice_information.invoice_number;
          }
          if (!invoiceData.total_amount && invoiceData.invoice_information?.total_amount) {
            invoiceData.total_amount = invoiceData.invoice_information.total_amount;
          }
          if (!invoiceData.sub_total_amount && invoiceData.invoice_information?.sub_total_amount) {
            invoiceData.sub_total_amount = invoiceData.invoice_information.sub_total_amount;
          }
          if (!invoiceData.total_tax_amount && invoiceData.invoice_information?.total_tax_amount) {
            invoiceData.total_tax_amount = invoiceData.invoice_information.total_tax_amount;
          }

          // 銀行情報
          if (!invoiceData.bank_name && invoiceData.bank_information?.bank_name) {
            invoiceData.bank_name = invoiceData.bank_information.bank_name;
          }
          if (!invoiceData.bank_account_name && invoiceData.bank_information?.bank_account_name) {
            invoiceData.bank_account_name = invoiceData.bank_information.bank_account_name;
          }
          if (!invoiceData.bank_store_type && invoiceData.bank_information?.bank_store_type) {
            invoiceData.bank_store_type = invoiceData.bank_information.bank_store_type;
          }
          if (!invoiceData.bank_type && invoiceData.bank_information?.bank_type) {
            invoiceData.bank_type = invoiceData.bank_information.bank_type;
          }
          if (!invoiceData.bank_number && invoiceData.bank_information?.bank_number) {
            invoiceData.bank_number = invoiceData.bank_information.bank_number;
          }

          // 必須フィールドのデフォルト値設定
          invoiceData.payee_company_name = invoiceData.payee_company_name || "不明";
          invoiceData.payee_postal_code = invoiceData.payee_postal_code || "不明";
          invoiceData.payee_address = invoiceData.payee_address || "不明";
          invoiceData.payer_company_name = invoiceData.payer_company_name || "不明";
          invoiceData.total_amount = invoiceData.total_amount || 0;
          invoiceData.sub_total_amount = invoiceData.sub_total_amount || 0;
          invoiceData.total_tax_amount = invoiceData.total_tax_amount || 0;

        } catch (error) {
          console.error("JSONパースエラー:", error);
          throw new Error("レスポンスデータの解析に失敗しました");
        }

        console.log("パース後のデータ:", JSON.stringify(invoiceData, null, 2));

        // ネストされた構造を平坦な構造に変換
        const flattenedData = {
          analysis: invoiceData.analysis,
          payee_company_name: invoiceData.payee_company_name || invoiceData.payee_information?.payee_company_name || "不明",
          payee_address: invoiceData.payee_address || invoiceData.payee_information?.payee_address || "不明",
          payee_postal_code: invoiceData.payee_postal_code || invoiceData.payee_information?.payee_postal_code || "不明",
          payee_tel: invoiceData.payee_tel || invoiceData.payee_information?.payee_tel || null,
          payee_email: invoiceData.payee_email || invoiceData.payee_information?.payee_email || null,
          payee_person_name: invoiceData.payee_person_name || invoiceData.payee_information?.payee_person_name || null,
          payer_company_name: invoiceData.payer_company_name || invoiceData.payer_information?.payer_company_name || "不明",
          payer_address: invoiceData.payer_address || invoiceData.payer_information?.payer_address || null,
          payer_postal_code: invoiceData.payer_postal_code || invoiceData.payer_information?.payer_postal_code || null,
          payer_person_name: invoiceData.payer_person_name || invoiceData.payer_information?.payer_person_name || null,
          invoice_date: invoiceData.invoice_date || invoiceData.invoice_information?.invoice_date || null,
          due_date: invoiceData.due_date || invoiceData.invoice_information?.due_date || null,
          invoice_number: invoiceData.invoice_number || invoiceData.invoice_information?.invoice_number || null,
          total_amount: invoiceData.total_amount || invoiceData.invoice_information?.total_amount || 0,
          sub_total_amount: invoiceData.sub_total_amount || invoiceData.invoice_information?.sub_total_amount || 0,
          total_tax_amount: invoiceData.total_tax_amount || invoiceData.invoice_information?.total_tax_amount || 0,
          bank_name: invoiceData.bank_name || invoiceData.bank_information?.bank_name || null,
          bank_account_name: invoiceData.bank_account_name || invoiceData.bank_information?.bank_account_name || null,
          bank_store_type: invoiceData.bank_store_type || invoiceData.bank_information?.bank_store_type || null,
          bank_type: invoiceData.bank_type || invoiceData.bank_information?.bank_type || null,
          bank_number: invoiceData.bank_number || invoiceData.bank_information?.bank_number || null,
          invoice_details: invoiceData.invoice_details || [],
          memo: invoiceData.memo || null,
        };

        console.log("変換後のデータ:", JSON.stringify(flattenedData, null, 2));

        // LLMの分析結果を保存
        await exportLocalStorageInvoiceData(flattenedData, "phi4_analysis_results");

        // バリデーション
        const validationResult = InvoiceDataSchema.safeParse(flattenedData);
        if (!validationResult.success) {
          throw new Error(`バリデーションエラー: ${validationResult.error.message}`);
        }

        return flattenedData;
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
    const extractor = new Extractor();
    return await extractor.extractData({
      text: ocrResponse.text,
    });
  } catch (error) {
    throw new Error("請求書データをPhi4で整形できませんでした");
  }
}

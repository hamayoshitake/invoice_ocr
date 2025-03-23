import {BaseInvoiceDataExtractor} from "../abstructs/BaseInvoiceDataExtractor";
import {SecretParam} from "firebase-functions/lib/params/types";
import {OpenAIError} from "openai";
import {InvoiceDataSchema} from "../../schemas/InvoiceData";
import {ExtractDataParams} from "../../types/ExtractDataParams";
import {OpenAiApi4oService} from "../AiModels/OpenAiApi4oService";
import {exportLocalStorageInvoiceData} from "../ExportLocalStorageInvoiceData";
export class LinesExtractor extends BaseInvoiceDataExtractor {
  protected createPrompt(lines: any): string {
    return `
      OCRデータから請求書の情報を抽出し、以下の形式でJSONを返してください。

      前提条件
      contentは、pdfの行ごとのテキストデータ
      polygonは、contentが存在する位置（座標
      spanは、contentの開始位置と長さ

      抽出ルール:
      1. 請求元（payee）と請求先（payer）の判別方法：
        - 請求先は「御中」「様」などの文字が付随する会社情報を請求先として扱う
        - 請求先は「請求書」、「御請求書」右側にある、会社情報を指す
        - 請求先は比較的PDFの右上にあることが多い
        - 請求元は請求先以外に存在する会社情報のまとまりを扱う
        - 請求元は比較的PDFの左側か下にある会社情報であることが多い
        - 印鑑や社印がある方を請求元として扱う
        - 会社名は、「株式会社」「有限会社」などの文字の近く（前後）にある会社情報を扱う

       2. データフォーマット：
        - 日付はYYYY/MM/DD形式で統一すること
        - 数値データはカンマを除去し、数値型として処理すること
        - 郵便番号はTは削除して返すこと
        - 銀行名(bank_name)は〇〇銀行まで入れて、支店名まである場合は、支店名は削除する
        - 支店名(bank_store_type)は、銀行名の後ろにある場合は、その支店名を設定する
        - 口座種別(bank_type)は、預金の文字がある場合は、預金の文字は削除する（普通か当座になる）

      3. 判別のプロセス：
        1. OCRデータの、polygonとcontent文字の位置情報を取得する
        2. 抽出ルールから、テキスト内の会社情報を特定し、上記の判別基準に基づいて請求元と請求先を分類する
        3. それぞれの情報を適切なフィールドに抽出する

      4. 抽出時の注意点：
        - contentは、テキストの内容をそのまま抽出する

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

      備考：
      - memo: 備考欄のテキスト

      判別プロセスの説明も含めて、以下のような形式でJSONを返してください：

      {
        "analysis": {
          "payee_identification_reason": "この会社を請求元と判断した理由",
          "payer_identification_reason": "この会社を請求先と判断した理由"
        },
        // 通常のデータフィールド
        {
          "payee_company_name": "",
          "payee_postal_code": "",
          "payee_address": "",
          "payee_tel": "",
          ...
        }
      }

      OCRデータ:
      ${JSON.stringify(lines, null, 2)}
    `;
  }

  async extractData(params: ExtractDataParams, openaiApiKey: SecretParam): Promise<any> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < this.maxRetries) {
      try {
        const openAiApiFormatService = new OpenAiApi4oService(openaiApiKey);
        const response = await openAiApiFormatService.postOpenAiApi(
          this.createPrompt(params)
        );

        exportLocalStorageInvoiceData(response, "openAiExtractedLines");

        // バリデーション
        const validationResult = InvoiceDataSchema.safeParse(response);
        if (!validationResult.success) {
          throw new Error(`バリデーションエラー: ${validationResult.error.message}`);
        }

        return response;
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

export async function extractLines(
  lines: any,
  openaiApiKey: SecretParam
) {
  try {
    const extractor = new LinesExtractor();

    return await extractor.extractData({text: lines}, openaiApiKey);
  } catch (error) {
    throw new OpenAIError("請求書データをAIで整形できませんでした");
  }
}

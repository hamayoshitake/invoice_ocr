import {BaseInvoiceDataExtractor} from "./abstructs/BaseInvoiceDataExtractor";
import {ExtractDataParams} from "../types/ExtractDataParams";
import {SecretParam} from "firebase-functions/lib/params/types";
import {OpenAIError} from "openai";

export class DocumentIntelligenceExtractor extends BaseInvoiceDataExtractor {
  protected createPrompt(analyzeLayout: ExtractDataParams): string {
    return `
      OCRデータから請求書の情報を抽出し、以下の形式でJSONを返してください。
      位置情報（polygon）とconfidenceスコアを考慮して、高精度な情報を抽出してください。

      テーブルのデータは、invoice_detailsが入るデータは、tablesのcellの中で改行されて一つのセルになっていることがあるので、
      tablesとcontentの内容を比較して、invoice_detailsのデータを抽出してください。

      抽出ルール:
      1. 請求元と請求先の判別:
        - 「御中」「様」がある会社名は請求先
        - 印鑑/社印がある方は請求元
        - 住所と郵便番号のセットで判断

      2. 金額の判別:
        - 数値の前後の「円」「¥」を除去
        - カンマを除去して数値型で返却
        - 消費税は税率（8%/10%）の近くの金額を確認

      3. 日付の形式:
        - 全てYYYY-MM-DD形式に統一
        - 和暦は西暦に変換

      4. 明細情報:
        - 表形式のデータから行ごとに抽出
        - 単価と金額は別々に識別（単価×数量＝金額）

      必須項目（confidence 0.9以上）:
      {
        "payee_company_name": "請求元会社名",
        "payee_postal_code": "請求元郵便番号（ハイフンあり）",
        "payee_address": "請求元住所",
        "payer_company_name": "請求先会社名",
        "total_amount": number（合計金額）,
        "sub_total_amount": number（税抜合計）,
        "total_tax_amount": number（消費税額）,
        "invoice_details": [
          {
            "item_date": "YYYY-MM-DD",
            "item_description": "項目説明",
            "item_amount": number（金額）,
            "item_quantity": number（数量）,
            "item_unit_price": number（単価）
          }
        ]
      }

      任意項目（confidence 0.8以上、ない場合はnull）:
      {
        "payee_tel": "請求元電話番号",
        "payee_email": "請求元メールアドレス",
        "payee_person_name": "請求元担当者名",
        "payer_address": "請求先住所",
        "payer_postal_code": "請求先郵便番号",
        "payer_person_name": "請求先担当者名",
        "invoice_date": "YYYY-MM-DD",
        "due_date": "YYYY-MM-DD",
        "invoice_number": "請求書番号",
        "bank_name": "銀行名（〇〇銀行まで）",
        "bank_account_name": "口座名義",
        "bank_store_type": "支店名/本店",
        "bank_type": "口座種別（普通/当座）",
        "bank_number": "口座番号"
      }

      OCRデータ:
      ${JSON.stringify(analyzeLayout, null, 2)}
    `;
  }
}

export async function extractDocumentIntelligence(
  analyzeLayout: any,
  openaiApiKey: SecretParam
) {
  try {
    const extractor = new DocumentIntelligenceExtractor(openaiApiKey.value());

    return await extractor.extractData({text: analyzeLayout});
  } catch (error) {
    throw new OpenAIError("請求書データをAIで整形できませんでした");
  }
}

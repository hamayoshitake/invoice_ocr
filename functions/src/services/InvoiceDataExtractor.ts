

import {ExtractDataParams} from "../types/ExtractDataParams";
import {BaseInvoiceDataExtractor} from "./abstructs/BaseInvoiceDataExtractor";
import {SecretParam} from "firebase-functions/lib/params/types";

export class InvoiceDataExtractor extends BaseInvoiceDataExtractor {
  protected createPrompt(params: ExtractDataParams): string {
    return `
      以下の請求書のテキストから、JSONフォーマットで情報を抽出してください。
      請求元の会社名は "${params.payeeCompanyName}" です。
      請求先は、テキスト内で "${params.payeeCompanyName}" 以外の会社名または個人名を抽出してください。

      制約条件：
      1. 単価(item_unit_price)と金額(item_amount)を明確に区別すること
      2. 単価は1個あたりの価格を示す
      3. 金額はフォーマットによっては「価格」の列を示す
      4. 日付はYYYY/MM/DD形式で統一すること
      5. 数値データはカンマを除去し、数値型として処理すること

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

      テキスト:
      ${params.text}
      `;
  }
}

export async function processInvoiceDataWithLLM(
  ocrResponse: any,
  payeeCompanyName: string,
  openaiApiKey: SecretParam
) {
  const extractor = new InvoiceDataExtractor(openaiApiKey.value());
  return await extractor.extractData({
    text: ocrResponse.text,
    payeeCompanyName,
  });
}

import {BaseInvoiceDataExtractor} from "../abstructs/BaseInvoiceDataExtractor";
import {SecretParam} from "firebase-functions/lib/params/types";
import {OpenAIError} from "openai";
import {InvoiceData, InvoiceDataSchema} from "../../schemas/InvoiceData";
import {ExtractDataParams} from "../../types/ExtractDataParams";

export class LinesExtractor extends BaseInvoiceDataExtractor {
  protected createPrompt(lines: any): string {
    return `
      OCRデータから請求書の情報を抽出し、以下の形式でJSONを返してください。

      抽出ルール:
      1. 請求元と請求先の判別:
        - 請求先情報はpdfの左上に存在することが多い
        - 請求先ではない方の会社は請求元
        - 「御中」「様」がある会社名は請求先
        - 住所と郵便番号のセットで判断

      2. 金額の判別:
        - 数値の前後の「円」「¥」を除去
        - カンマを除去して数値型で返却
        - 消費税は税率（8%/10%）の近くの金額を確認

      3. 日付の形式:
        - 全てYYYY-MM-DD形式に統一
        - 和暦は西暦に変換

      注意事項
       - 文字化けしている場合は、文字化けしている文字を信頼しない

      必須項目:
      {
        "payee_company_name": "請求元会社名",
        "payee_postal_code": "請求元郵便番号（ハイフンあり）",
        "payee_address": "請求元住所",
        "payer_company_name": "請求先会社名",
        "total_amount": number（合計金額）,
        "sub_total_amount": number（税抜合計）,
        "total_tax_amount": number（消費税額）,
      }

      任意項目:
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
      ${JSON.stringify(lines, null, 2)}
    `;
  }

  // 共通のデータ抽出処理
  async extractData(params: ExtractDataParams): Promise<InvoiceData> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < this.maxRetries) {
      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          temperature: 0.1, // 一貫性のある応答を生成するため
          messages: [
            {
              role: "system",
              content: "請求書のテキストからJSON形式で情報を抽出するアシスタントです。",
            },
            {
              role: "user",
              content: this.createPrompt(params),
            },
          ],
          response_format: {type: "json_object"},
        });

        const content = response.choices[0].message.content;
        if (!content) {
          throw new Error("LLMからの応答が空です");
        }

        // JSONの抽出とパース処理
        const extractedData = await this.parseJsonContent(content);

        // バリデーション
        const validationResult = InvoiceDataSchema.safeParse(extractedData);
        if (!validationResult.success) {
          throw new Error(`バリデーションエラー: ${validationResult.error.message}`);
        }

        return extractedData;
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
  linesAndTables: any,
  openaiApiKey: SecretParam
) {
  try {
    const extractor = new LinesExtractor(openaiApiKey.value());

    return await extractor.extractData({text: linesAndTables.lines});
  } catch (error) {
    throw new OpenAIError("請求書データをAIで整形できませんでした");
  }
}

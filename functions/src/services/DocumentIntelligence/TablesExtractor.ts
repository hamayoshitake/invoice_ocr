import {BaseInvoiceDataExtractor} from "../abstructs/BaseInvoiceDataExtractor";
import {ExtractDataParams} from "../../types/ExtractDataParams";
import {SecretParam} from "firebase-functions/lib/params/types";
import {OpenAIError} from "openai";
import {InvoiceData, TablesRequiredSchema} from "../../schemas/InvoiceData";
import {exportLocalStorageInvoiceData} from "../ExportLocalStorageInvoiceData";

export class TablesExtractor extends BaseInvoiceDataExtractor {
  protected createPrompt(linesAndTables: ExtractDataParams): string {
    return `
      OCRデータから請求書の明細行を抽出し、以下の形式でJSONを返してください。

      抽出ルール:
      1. 明細行の構造:
        - item_date: 日付
      - item_description: 商品名/説明
        - item_amount: 金額
        - item_quantity: 数量
        - item_unit_price: 単価

      形式：
      {
        "invoice_details": [
          {
            "item_date": "2024-01-01",
            "item_description": "商品A",
            "item_amount": 1000,
            "item_quantity": 1,
            "item_unit_price": 1000
          }
        ]
      }

      2. データ変換規則:
        - 日付: YYYY-MM-DD形式に統一
        - 数値: カンマを除去し数値型に変換
        - 項目名: 改行文字（\n）はそのまま保持
        - 不要な項目（税率、行摘要など）は除外

      3. ヘッダー行の処理:
        - 最初の行はヘッダー行として扱い、以降の行から明細データを抽出
        - ヘッダーの項目名が異なる場合でも、意味的に対応する項目を判断
          例: 「納品日」→「item_date」
              「商品名」→「item_description」
              「個数」→「item_quantity」
              など

      4. データの検証:
        - 日付の妥当性
        - 数値の妥当性（単価×数量＝金額）
        - 必須項目の存在確認

      入力データ:
      ${JSON.stringify(linesAndTables, null, 2)}

      注意事項:
      - 文字化けしている場合は、その項目は信頼しない
      - 数値の検証に失敗した場合は、元の値をそのまま使用
      - 日付のフォーマットが不正な場合は、null を設定
      `;
  }

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

        exportLocalStorageInvoiceData(extractedData, "openaiExtractedTables");

        // バリデーション
        const validationResult = TablesRequiredSchema.safeParse(extractedData);
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

export async function extractTables(
  linesAndTables: any,
  openaiApiKey: SecretParam
) {
  try {
    const extractor = new TablesExtractor(openaiApiKey.value());

    return await extractor.extractData({text: linesAndTables.tableData});
  } catch (error) {
    throw new OpenAIError("請求書データをAIで整形できませんでした");
  }
}

import {OpenAI} from "openai";
import {InvoiceData, InvoiceDataSchema} from "../../schema/InvoiceData";
import {exportLocalStorageInvoiceData} from "../../service/ExportLocalStorageInvoiceData";
import {ExtractDataParams} from "../../type/ExtractDataParams";

// 基底クラスを作成
export abstract class BaseInvoiceDataExtractor {
  protected openai: OpenAI;
  protected maxRetries = 3;

  constructor(openaiApiKeyValue: string) {
    this.openai = new OpenAI({
      apiKey: openaiApiKeyValue,
    });
  }

  // 共通のデータ抽出処理
  async extractData(params: ExtractDataParams): Promise<InvoiceData> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < this.maxRetries) {
      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-4-0125-preview",
          temperature: 0.1,
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
        const extractedData = this.parseJsonContent(content);

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

  // 継承先で実装するメソッド
  protected abstract createPrompt(params: ExtractDataParams): string;

  // 共通のパース処理
  private parseJsonContent(content: string): any {
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      } else {
        return JSON.parse(content);
      }
    } catch (error) {
      const err = error as Error;
      exportLocalStorageInvoiceData(content, "errorLog");
      throw new Error(`JSONパースエラー: ${err.message}`);
    }
  }
}

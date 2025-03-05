import {InvoiceData} from "../../schemas/InvoiceData";
import {exportLocalStorageInvoiceData} from "../ExportLocalStorageInvoiceData";
import {ExtractDataParams} from "../../types/ExtractDataParams";
import {SecretParam} from "firebase-functions/lib/params/types";

// 基底クラスを作成
export abstract class BaseInvoiceDataExtractor {
  protected maxRetries = 3;

  protected abstract extractData(params: ExtractDataParams, openaiApiKey: SecretParam): Promise<InvoiceData>;

  // 継承先で実装するメソッド
  protected abstract createPrompt(params: ExtractDataParams): string;

  protected async parseJsonContent(content: string): Promise<any> {
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

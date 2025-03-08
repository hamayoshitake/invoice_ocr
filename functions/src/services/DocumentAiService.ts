import {DocumentProcessorServiceClient} from "@google-cloud/documentai";
import {Secrets} from "../schemas/secret";
import {DocumentAIError} from "../errors/CustomErrors";

export class DocumentAIService {
  private client: DocumentProcessorServiceClient;

  constructor() {
    this.client = new DocumentProcessorServiceClient();
  }

  async processDocument(base64File: string, secrets: Secrets): Promise<any> {
    try {
      const request = {
        name: `projects/${secrets.projectOcrId.value()}/locations/${secrets.location.value()}/processors/${secrets.processorOcrId.value()}`,
        rawDocument: {
          content: base64File,
          mimeType: "application/pdf",
        },
      };

      // ドキュメントの処理
      const startTime = new Date().getTime();
      const [result] = await this.client.processDocument(request);
      const endTime = new Date().getTime();
      const processingTime = endTime - startTime;
      console.log(`処理時間: ${processingTime}ms (${(processingTime / 1000).toFixed(2)}秒)`);

      if (!result || !result.document || !result.document.text) {
        throw new DocumentAIError("ドキュメントの解析に失敗しました");
      }

      // 請求書かどうかの判定
      if (!this.isInvoiceDocument(result.document)) {
        throw new DocumentAIError("請求書をアップロードしてください");
      }

      return result;
    } catch (error: any) {
      console.error("DocumentAIError:", error);
      throw new DocumentAIError(error.message);
    }
  }

  // 請求書かどうかを判定するロジック
  private isInvoiceDocument(document: any): boolean {
    const text = document.text.toLowerCase();
    const keywords = [
      // 基本的な表記
      "請求書",
      "御請求書",
      "ご請求書",
      "invoice",
      "bill",

      // 類似表記
      "請求金額",
      "ご請求金額",
      "請求金",
      "請求金総額",

      // 関連用語
      "支払期限",
      "お支払期限",
      "振込期限",
      "お振込期限",

      // 請求書番号関連
      "請求番号",
      "請求書no",
      "請求書番号",

      // 振込先情報
      "振込先",
      "お振込先",
      "振込口座",

      // 税関連
      "消費税",
      "税込合計",
      "税抜金額",
    ];

    // キーワードの出現回数をカウントが2以上であれば請求書と判断
    const keywordCount = keywords.reduce((count, keyword) => {
      return count + (text.includes(keyword) ? 1 : 0);
    }, 0);

    return keywordCount >= 2;
  }
}

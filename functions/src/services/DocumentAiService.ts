import {DocumentProcessorServiceClient} from "@google-cloud/documentai";
import {Secrets} from "../schemas/secret";

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
      const [result] = await this.client.processDocument(request);

      if (!result || !result.document || !result.document.text) {
        throw new Error("請求書データが取得できませんでした。");
      }

      // 請求書かどうかの判定
      if (!this.isInvoiceDocument(result.document)) {
        throw new Error( "請求書をアップロードしてください。");
      }

      return result;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  // 請求書かどうかを判定するロジック
  private isInvoiceDocument(document: any): boolean {
    const text = document.text.toLowerCase();
    const keywords = [
      "請求書",
      "invoice",
      "Invoice",
      "御請求書",
      "ご請求書",
      "請求金額",
      "合計金額",
      "支払期限",
      "お支払金額",
      "合計",
      "請求番号",
    ];

    // キーワードの出現回数をカウントが2以上であれば請求書と判断
    const keywordCount = keywords.reduce((count, keyword) => {
      return count + (text.includes(keyword) ? 1 : 0);
    }, 0);

    return keywordCount >= 2;
  }
}

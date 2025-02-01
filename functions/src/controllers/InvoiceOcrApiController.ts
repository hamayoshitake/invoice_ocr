import {Request} from "firebase-functions/v2/https";
import {Response} from "express";
import {processInvoiceDataWithoutPayeeName} from "../services/InvoiceDataNonPayeeNameExtractor";
import busboy from "busboy";
import {exportLocalStorageInvoiceData} from "../services/ExportLocalStorageInvoiceData";
import {DocumentAIService} from "../services/DocumentAiService";
import {Secrets} from "../schemas/secret";

export const InvoiceOcrApiController = {
  async handleInvoiceOcr(req: Request, res: Response, secrets: Secrets) {
    let fileBuffer: Buffer | null = null;

    const bb = busboy({headers: req.headers});

    bb.on("file", (fieldname, file, {mimeType}) => {
      if (mimeType !== "application/pdf") {
        file.resume();
        throw new Error("PDFファイルのみ対応しています");
      }

      const chunks: Buffer[] = [];
      file.on("data", (chunk) => chunks.push(chunk));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    bb.on("finish", async () => {
      if (!fileBuffer) {
        throw new Error("ファイルが必要です");
      }

      try {
        // Document AIを使用して請求書データを取得
        const base64File = fileBuffer.toString("base64");
        const documentAIService = new DocumentAIService();
        const result = await documentAIService.processDocument(base64File, secrets);

        // ローカルストレージに請求書データを保存
        exportLocalStorageInvoiceData(result.document);

        // 請求書データをAIで整形
        const invoiceData = await processInvoiceDataWithoutPayeeName(
          result.document,
          secrets.openaiApiKey
        );

        // ローカルストレージにaiで整形したsデータを保存
        exportLocalStorageInvoiceData(invoiceData, "llmData");

        res.json({
          status: "success",
          data: invoiceData,
        });
      } catch (error: any) {
        res.status(500).json({
          error: error instanceof Error ? error.message : "サーバーエラーが発生しました。",
        });
      }
    });

    bb.on("error", (error) => {
      console.error("Busboy error:", error);
      res.status(500).json({error: "File processing error"});
    });

    bb.end(req.body);
  },
};

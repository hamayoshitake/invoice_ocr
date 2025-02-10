import {Request} from "firebase-functions/v2/https";
import {Response} from "express";
import {processInvoiceDataWithoutPayeeName} from "../services/InvoiceDataNonPayeeNameExtractor";
import busboy from "busboy";
import {exportLocalStorageInvoiceData} from "../services/ExportLocalStorageInvoiceData";
import {DocumentAIService} from "../services/DocumentAiService";
import {Secrets} from "../schemas/secret";
import {DocumentAIError, ValidationError} from "../errors/CustomErrors";
import {OpenAIError} from "openai";


export const InvoiceOcrApiController = {
  async performInvoiceOcr(req: Request, res: Response, secrets: Secrets) {
    let fileBuffer: Buffer | null = null;

    const bb = busboy({headers: req.headers});

    bb.on("file", (fieldname, file, {mimeType}) => {
      if (mimeType !== "application/pdf") {
        file.resume();
        throw new ValidationError("PDFファイルのみ対応しています");
      }

      const chunks: Buffer[] = [];
      file.on("data", (chunk) => chunks.push(chunk));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    bb.on("finish", async () => {
      if (!fileBuffer) {
        throw new ValidationError("ファイルが必要です");
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

        return res.status(200).json({
          status: "success",
          data: invoiceData,
        });
      } catch (error: any) {
        console.error("Error details:", error);

        if (error instanceof ValidationError) {
          return res.status(400).json({
            status: "error",
            code: "VALIDATION_ERROR",
            message: error.message,
          });
        } else if (error instanceof OpenAIError) {
          return res.status(422).json({
            status: "error",
            code: "DOCUMENT_PROCESSING_ERROR",
            message: "一時的なエラーが発生しました。時間をおいて再度お試しください",
          });
        } else if (error instanceof DocumentAIError) {
          return res.status(422).json({
            status: "error",
            code: "DOCUMENT_PROCESSING_ERROR",
            message: error.message,
          });
        }

        return res.status(500).json({
          status: "error",
          code: "INTERNAL_SERVER_ERROR",
          message: "サーバー内部でエラーが発生しました",
        });
      }
    });

    bb.on("error", (error) => {
      console.error("Busboy error:", error);
      return res.status(500).json({error: "File processing error"});
    });

    bb.end(req.body);
  },
};

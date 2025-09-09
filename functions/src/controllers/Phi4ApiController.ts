import {Request} from "firebase-functions/v2/https";
import {Response} from "express";
import busboy from "busboy";
import {ValidationError, DocumentAIError} from "../errors/CustomErrors";
import {InvoiceDataSchema} from "../schemas/InvoiceData";
import {Secrets} from "../schemas/secret";
import {DocumentAIService} from "../services/DocumentAiService";
import {processPhi4InvoiceData} from "../services/Phi4/Extractor";
import {exportLocalStorageInvoiceData} from "../services/ExportLocalStorageInvoiceData";

export const Phi4ApiController = {
  async performInvoiceOcr(req: Request, res: Response, secrets: Secrets) {
    console.log("Phi4 OCR処理を開始します");

    if (req.method !== "POST") {
      return res.status(405).json({
        status: "error",
        code: "METHOD_NOT_ALLOWED",
        message: "POSTメソッドのみ対応しています",
      });
    }

    try {
      const fileBuffer = await new Promise<Buffer>((resolve, reject) => {
        const bb = busboy({headers: req.headers});
        let buffer: Buffer | null = null;

        bb.on("file", (fieldname, file, info) => {
          console.log(`ファイル受信: ${fieldname}, タイプ: ${info.mimeType}`);

          if (info.mimeType !== "application/pdf") {
            file.resume();
            reject(new ValidationError("PDFファイルのみ対応しています"));
            return;
          }

          const chunks: Buffer[] = [];
          file.on("data", (chunk) => chunks.push(chunk));
          file.on("end", () => {
            buffer = Buffer.concat(chunks);
            console.log(`ファイルサイズ: ${buffer.length} bytes`);
          });
        });

        bb.on("finish", () => {
          if (!buffer) {
            reject(new ValidationError("ファイルが必要です"));
            return;
          }
          resolve(buffer);
        });

        bb.on("error", (error) => {
          console.error("Busboy error:", error);
          reject(new Error("ファイル処理中にエラーが発生しました"));
        });

        if (req.rawBody) {
          bb.end(req.rawBody);
        } else {
          req.pipe(bb);
        }
      });

      console.log("Document AI処理を開始します");
      const base64File = fileBuffer.toString("base64");
      const documentAIService = new DocumentAIService();
      const result = await documentAIService.processDocument(base64File, secrets);

      // // Document AIの結果をログに出力
      await exportLocalStorageInvoiceData(result.document, "document_ai_results");

      console.log("Phi4処理を開始します");
      const invoiceData = await processPhi4InvoiceData(result.document);

      // // Phi4の結果をログに出力
      await exportLocalStorageInvoiceData(invoiceData, "phi4_results");

      // バリデーション
      console.log("バリデーションを実行します");
      const validationResult = InvoiceDataSchema.safeParse(invoiceData);
      if (!validationResult.success) {
        return res.status(400).json({
          status: "error",
          code: "VALIDATION_ERROR",
          message: `バリデーションエラー: ${validationResult.error.message}`,
        });
      }

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
  },
};

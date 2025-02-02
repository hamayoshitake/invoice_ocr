import {Request} from "firebase-functions/v2/https";
import {Response} from "express";
import {processInvoiceDataWithoutPayeeName} from "../services/InvoiceDataNonPayeeNameExtractor";
import {getCsvContent} from "../services/CsvGenerator";
import busboy from "busboy";
import {uploadInvoiceCsvToStorage, getStorageSavedFileUrl} from "../storage";
import {DocumentAIService} from "../services/DocumentAiService";
import * as admin from "firebase-admin";
import {generateJstTimestamp} from "../Utils/date";
import {Secrets} from "../schemas/secret";
import {CsvConversionError, DocumentAIError, GcsStorageGetSignedUrlError, GcsStorageSaveError, ValidationError} from "../errors/CustomErrors";
import {OpenAIError} from "openai";


export const InvoiceOcrCsvController = {
  async performCsvUpload(req: Request, res: Response, secrets: Secrets) {
    let fileBuffer: Buffer | null = null;

    // Busboyインスタンス
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

      const csvFileName = `csv/upload/invoice_${generateJstTimestamp()}.csv`;

      try {
        // Document AIを使用して請求書データを取得
        const base64File = fileBuffer.toString("base64");

        const documentAIService = new DocumentAIService();
        const result = await documentAIService.processDocument(base64File, secrets);

        // 請求書のデータをAIで整形
        const invoiceData = await processInvoiceDataWithoutPayeeName(result.document, secrets.openaiApiKey);

        // CSV用のデータを作成
        const csvContent = getCsvContent(invoiceData);
        if (csvContent[0] === "") {
          throw new CsvConversionError();
        }

        // GCSにCSV形式で保存
        const fileName = await uploadInvoiceCsvToStorage(csvFileName, csvContent);

        // クライアントにCSVのURLを返す
        const url = await getStorageSavedFileUrl(fileName);
        res.json({downloadUrl: url});
      } catch (error: any) {
        // ファイルが存在したら、削除する
        const bucket = admin.storage().bucket();
        const file = bucket.file(csvFileName);
        const [exists] = await file.exists();
        if (exists) {
          await file.delete().catch((deleteError) => {
            console.error("Error deleting file:", deleteError);
          });
        }

        console.error("Error details:", error);

        if (error instanceof ValidationError) {
          res.status(400).json({
            status: "error",
            code: "VALIDATION_ERROR",
            message: error.message || "入力内容を確認してください",
          });
        } else if (error instanceof OpenAIError) {
          res.status(422).json({
            status: "error",
            code: "DOCUMENT_PROCESSING_ERROR",
            message: "一時的なエラーが発生しました。時間をおいて再度お試しください",
          });
        } else if (
          error instanceof DocumentAIError ||
          error instanceof GcsStorageSaveError ||
          error instanceof GcsStorageGetSignedUrlError ||
          error instanceof CsvConversionError
        ) {
          res.status(422).json({
            status: "error",
            code: "DOCUMENT_PROCESSING_ERROR",
            message: error.message,
          });
        }

        res.status(500).json({
          status: "error",
          code: "INTERNAL_SERVER_ERROR",
          message: "サーバー内部でエラーが発生しました",
        });
      }
    });

    // エラーハンドリング
    bb.on("error", (error) => {
      console.error("Busboy error:", error);
      res.status(500).json({error: "File processing error"});
    });

    bb.end(req.body);
  },
};

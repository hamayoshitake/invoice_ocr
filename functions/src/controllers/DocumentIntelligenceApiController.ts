import {Request} from "firebase-functions/v2/https";
import {Response} from "express";
import busboy from "busboy";
import {DocumentIntelligencePostService} from "../services/DocumentIntelligence/documentIntelligencePostService";
import {Secrets} from "../schemas/secret";
import {DocumentAIError, ValidationError} from "../errors/CustomErrors";
import {OpenAIError} from "openai";
import {extractDocumentIntelligence} from "../services/DocumentIntelligenceExtractor";
import {exportLocalStorageInvoiceData} from "../services/ExportLocalStorageInvoiceData";
import {AnalyzerService} from "../services/DocumentIntelligence/AnalyzerService";

export const DocumentIntelligenceApiController = {
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
        const documentIntelligencePostService = new DocumentIntelligencePostService();
        const result = await documentIntelligencePostService.process(base64File);

        // レスポンスデータを必要なデータに整形
        const analyzerService = new AnalyzerService();
        const analyzeLayout = analyzerService.analyzeDocument(result);

        // ローカルストレージに請求書データを保存
        exportLocalStorageInvoiceData(analyzeLayout, "documentIntelligenceAnalyzer");

        // aiで整形したデータを返す
        const returnAiData = await extractDocumentIntelligence(analyzeLayout, secrets.openaiApiKey);

        // ローカルストレージに請求書データを保存
        exportLocalStorageInvoiceData(returnAiData, "exportAiDocumentIntelligence");

        return res.status(200).json({
          status: "success",
          data: returnAiData,
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

import {Request} from "firebase-functions/v2/https";
import {Response} from "express";
import busboy from "busboy";
import {DocumentIntelligencePost} from "../services/DocumentIntelligence/DocumentIntelligencePost";
import {Secrets} from "../schemas/secret";
import {DocumentAIError, ValidationError} from "../errors/CustomErrors";
import {OpenAIError} from "openai";
import {extractLines} from "../services/DocumentIntelligence/LinesExtractor";
import {extractTables} from "../services/DocumentIntelligence/TablesExtractor";
import {exportLocalStorageInvoiceData} from "../services/ExportLocalStorageInvoiceData";
import {TablesService} from "../services/DocumentIntelligence/TablesService";

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
        const documentIntelligencePost = new DocumentIntelligencePost(secrets);
        const intelligenceResult = await documentIntelligencePost.process(base64File);
        exportLocalStorageInvoiceData(intelligenceResult, "documentIntelligenceResult");

        // 並列で実行する
        const [invoiceHeaderData, invoiceDetailData] = await Promise.all([
          (async () => {
            // // レスポンスデータを必要なデータに整形
            const tablesService = new TablesService(secrets.openaiApiKey);
            const data = await tablesService.process(intelligenceResult);
            return await extractTables(data, secrets.openaiApiKey);
          })(),
          (async () => {
            return await extractLines(intelligenceResult.analyzeResult?.pages[0].lines, secrets.openaiApiKey);
          })(),
        ]);

        // ローカルストレージに請求書データを保存
        const returnAiData = {
          ...invoiceHeaderData,
          ...invoiceDetailData,
        };

        await exportLocalStorageInvoiceData(returnAiData, "exportAiDocumentIntelligence");

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

import {Request} from "firebase-functions/v2/https";
import {Response} from "express";
import {processInvoiceDataWithLLM} from "../service/InvoiceDataExtractor";
import {getCsvContent} from "../service/CsvGenerator";
import busboy from "busboy";
import {DocumentProcessorServiceClient} from "@google-cloud/documentai";
import {uploadInvoiceCsvToStorage, getStorageSavedFileUrl} from "../storage";
import * as admin from "firebase-admin";

interface Secrets {
  projectOcrId: any;
  location: any;
  processorOcrId: any;
  openaiApiKey: any;
}

export const InvoiceOcrCsvController = {
  async performCsvUpload(req: Request, res: Response, secrets: Secrets) {
    let payeeCompanyName: string | null = null;
    let fileBuffer: Buffer | null = null;

    // Busboyインスタンス
    const bb = busboy({headers: req.headers});

    // フィールドデータの処理
    bb.on("field", (fieldname, val) => {
      if (fieldname === "payeeCompanyName") {
        payeeCompanyName = val;
      }
    });

    // ファイルデータの処理
    bb.on("file", (fieldname, file, {mimeType}) => {
      if (mimeType !== "application/pdf") {
        file.resume(); // ストリームを終了
        res.status(400).json({
          error: "Invalid file type",
          details: {message: "PDFファイルのみ対応しています"},
        });
        return;
      }

      const chunks: Buffer[] = [];

      file.on("data", (chunk) => {
        chunks.push(chunk);
      });

      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    // 全データの処理完了時
    bb.on("finish", async () => {
      // バリデーション
      if (!payeeCompanyName) {
        res.status(400).json({
          error: "Missing payeeCompanyName",
          details: {message: "請求元会社名が必要です"},
        });
        return;
      }

      if (!fileBuffer) {
        res.status(400).json({
          error: "No file uploaded",
          details: {message: "ファイルが必要です"},
        });
        return;
      }

      // Document AIのリクエスト
      const base64File = fileBuffer.toString("base64");
      const request = {
        name: `projects/${secrets.projectOcrId.value()}/locations/${secrets.location.value()}/processors/${secrets.processorOcrId.value()}`,
        rawDocument: {
          content: base64File,
          mimeType: "application/pdf",
        },
      };

      const client = new DocumentProcessorServiceClient();
      const [result] = await client.processDocument(request);
      if (!result) {
        res.status(500).json({error: "No Document data from Document AI", details: result});
        return;
      }

      // 日本時間で現在の日時を取得
      const date = new Date();
      const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000)); // UTC+9の日本時間に調整

      // ファイル名用のフォーマット（YYYYMMDD_HHmmss）
      const now = jstDate.toISOString()
        .replace(/[-:]/g, "") // ハイフンとコロンを削除
        .replace(/\..+/, "") // ミリ秒以降を削除
        .replace("T", "_"); // Tをアンダースコアに置換

      const csvFileName = `csv/upload/invoice_${now}.csv`;

      try {
        // 請求書のデータを抽出
        const invoiceData = await processInvoiceDataWithLLM(result.document, payeeCompanyName, secrets.openaiApiKey);

        // CSV用のデータを作成
        const csvContent = getCsvContent(invoiceData);
        if (csvContent[0] === "") {
          throw new Error("No data extracted to create CSV");
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

        res.status(500).json({
          error: error instanceof Error ? error.message : "Unknown error",
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

import * as functions from "firebase-functions";
import * as path from "path";
import fs from "fs";
import {processInvoice} from "./service/InvoiceDataExtractor";
import {getCsvContent} from "./service/CsvGenerator";
import busboy from "busboy";
import {DocumentProcessorServiceClient} from "@google-cloud/documentai";
import {https} from "firebase-functions/v2";
import dotenv from "dotenv";

interface Config {
  project: { id: string };
  location: string;
  processor: { ocr: { id: string } };
}
let config: Config;
if (process.env.APP_ENV === "prod") {
  dotenv.config();
  config = {
    project: {id: process.env.PROJECT_ID || ""},
    location: process.env.LOCATION || "",
    processor: {ocr: {id: process.env.PROCESSOR_ID || ""}},
  };
} else {
  config = functions.config() as Config;
}

// PDF処理エンドポイント (変更)
export const upload = https.onRequest({
  cors: true,
}, async (req, res) => {

   // リクエストパラメータを保持する変数
   let payeeCompanyName: string | null = null;
   let fileBuffer: Buffer | null = null;

   // Busboyインスタンスの作成
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
     try {
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

       // base64に変換
       const base64File = fileBuffer.toString("base64");

       // Document AIのリクエスト
       const request = {
         name: `projects/${config.project.id}/locations/${config.location}/processors/${config.processor.ocr.id}`,
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

       // 日付を定義
       const today = new Date();
       const now = `${today.getFullYear()}${today.getMonth() + 1}
         ${today.getDate()}${today.getHours()}${today.getMinutes()}
         ${today.getSeconds()}`;

       // 請求書のデータを抽出
       const invoiceData = await processInvoice(result.document, payeeCompanyName);

       // ファイル保存前にディレクトリを作成
       const storageDir = "./storage/invoiceData";
       ensureDirectoryExists(storageDir);

       // ファイル保存
       const filePath = path.join(storageDir, `invoiceData_${now}.txt`);
       fs.writeFileSync(filePath, JSON.stringify(invoiceData, null, 2));


       // CSV作成
       const csvContent = getCsvContent(invoiceData);
       if (csvContent[0] === "") {
         res.status(204).json({message: "No data extracted to create CSV"});
         return;
       }

       // ファイル保存前にディレクトリを作成
       const storageCsvDir = "./storage/csv";
       ensureDirectoryExists(storageCsvDir);
       const csvFileName = `invoice_${now}.csv`;
       const csvFilePath = path.join(storageCsvDir, csvFileName);
       fs.writeFileSync(csvFilePath, csvContent);


       // CSVファイルをダウンロードレスポンス
       res.download(csvFilePath, csvFileName, (err) => {
         if (err) {
           console.error("Error downloading file:", err);
           res.status(500).send("Error downloading file");
           return;
         }

         // ダウンロード後にファイルを削除する場合
         fs.unlinkSync(csvFilePath);
       });

     } catch (error) {
       console.error("Error:", error);
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

});

/**
 * 指定されたパスにディレクトリが存在しない場合、再帰的に作成します
 *
 * @param dirPath - 作成するディレクトリのパス
 * @returns void
 *
 * @throws {Error} ディレクトリ作成に失敗した場合
 * @example
 */
const ensureDirectoryExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, {recursive: true});
  }
};

// ヘルスチェックエンドポイント
export const health = https.onRequest({
  cors: true,
}, (_, res) => {
});
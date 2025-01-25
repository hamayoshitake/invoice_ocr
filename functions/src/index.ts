// import * as path from "path";
// import fs from "fs";
// import {processInvoice} from "./service/InvoiceDataExtractor";
// import {getCsvContent} from "./service/CsvGenerator";
// import busboy from "busboy";
// import {DocumentProcessorServiceClient} from "@google-cloud/documentai";
import {https} from "firebase-functions/v2";
// import {defineSecret} from "firebase-functions/params";
import {uploadController} from "./controller/InvoiceOcrCsvController";
import * as admin from "firebase-admin";
import {secrets} from "./secret";

// 環境に応じた初期化
if (process.env.APP_ENV === 'local') {
  // ローカル環境用の初期化
  const serviceAccount = require('../firebase/secretKey/invoice-ocr-app-668f6-firebase-adminsdk-8saw5-e731b401ea.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'invoice-ocr-app-668f6.firebasestorage.app'
  });
} else {
  // 本番環境用の初期化
  admin.initializeApp();
}

export const upload = https.onRequest({
  cors: [
    "http://localhost:5173/*",
    "https://invoice-ocr-app-668f6--pr2-feature-api-multer-c-pteqx1xp.web.app/*",
  ],
  secrets: [
    secrets.projectOcrId,
    secrets.location,
    secrets.processorOcrId,
    secrets.openaiApiKey,
  ],
  invoker: "public",
}, (req, res) => uploadController.handleUpload(req, res, secrets));

// ヘルスチェックエンドポイント
export const health = https.onRequest({
  cors: true,
  invoker: "public",
}, (_, res) => {
  res.json({status: "ok"});
});

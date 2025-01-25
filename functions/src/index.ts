import {https} from "firebase-functions/v2";
import {uploadController} from "./controller/InvoiceOcrCsvController";
import * as admin from "firebase-admin";
import {secrets} from "./secret";
import serviceAccount from "./secretKey/invoice-ocr-app-668f6-firebase-adminsdk-8saw5-e731b401ea.json";
import {uploadCors} from "./cors";

// 環境に応じた初期化処理
if (process.env.APP_ENV === "local") {
  const serviceAccountTyped = serviceAccount as admin.ServiceAccount;
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountTyped),
    storageBucket: "invoice-ocr-app-668f6.firebasestorage.app",
  });
} else {
  admin.initializeApp();
}

export const upload = https.onRequest({
  cors: uploadCors,
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

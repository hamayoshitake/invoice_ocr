import {https} from "firebase-functions/v2";
import {InvoiceOcrCsvController} from "./controllers/InvoiceOcrCsvController";
import * as admin from "firebase-admin";
import {secrets} from "./secret";
import serviceAccount from "./secretKeys/invoice-ocr-app-668f6-firebase-adminsdk-8saw5-e731b401ea.json";
import {uploadCors} from "./cors";
import {InvoiceOcrApiController} from "./controllers/InvoiceOcrApiController";

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
}, (req, res) => InvoiceOcrCsvController.performCsvUpload(req, res, secrets));

export const api = https.onRequest({
  cors: uploadCors,
  secrets: [
    secrets.projectOcrId,
    secrets.location,
    secrets.processorOcrId,
    secrets.openaiApiKey,
  ],
  invoker: "public",
}, (req, res) => {
  if (req.path === "/ocr/invoice") {
    InvoiceOcrApiController.handleInvoiceOcr(req, res, secrets);
  } else {
    res.status(404).send("Not Found");
  }
});

// ヘルスチェックエンドポイント
export const health = https.onRequest({
  cors: true,
  invoker: "public",
}, (_, res) => {
  res.json({status: "ok"});
});

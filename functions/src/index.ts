import {https, setGlobalOptions} from "firebase-functions/v2";
import {InvoiceOcrCsvController} from "./controllers/InvoiceOcrCsvController";
import * as admin from "firebase-admin";
import {secrets} from "./secret";
import * as serviceAccount from "./secretKeys/invoice-ocr-app-668f6-firebase-adminsdk-8saw5-e731b401ea.json";
import {DocumentAiApiController} from "./controllers/DocumentAiApiController";
import {DocumentIntelligenceApiController} from "./controllers/DocumentIntelligenceApiController";
import {validateApiKey} from "./middleware/apiKeyAuth";
import {logApiAccess} from "./services/operation/ApiLogger";
import {ApiKeyCreateContoroller} from "./controllers/ApiKeyCreateContoroller";

setGlobalOptions({
  region: "asia-northeast1",
});

// 環境に応じた初期化処理
if (process.env.FUNCTIONS_EMULATOR) {
  console.log("エミュレータ環境");
  const serviceAccountTyped = serviceAccount as admin.ServiceAccount;
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountTyped),
    projectId: "invoice-ocr-app-668f6",
    storageBucket: "invoice-ocr-app-668f6.firebasestorage.app",
  });
} else {
  console.log("本番環境");
  admin.initializeApp();
}

export const api = https.onRequest({
  cors: true,
  timeoutSeconds: 600,
  secrets: [
    secrets.projectOcrId,
    secrets.location,
    secrets.processorOcrId,
    secrets.openaiApiKey,
    secrets.azureOcrEndpoint,
    secrets.azureOcrApiKey,
  ],
  invoker: "public",
}, async (req, res) => {
  const startTime = Date.now();
  await validateApiKey(req, res, () => {
    if (req.path === "/csv/download") {
      InvoiceOcrCsvController.performCsvDownload(req, res, secrets);
    } else if (req.path === "/invoice/document-ai/analyze") {
      DocumentAiApiController.performInvoiceOcr(req, res, secrets);
    } else if (req.path === "/invoice/document-intelligence/analyze") {
      DocumentIntelligenceApiController.performInvoiceOcr(req, res, secrets);
    } else {
      res.status(404).send("Not Found");
    }
  });

  // ログ記録
  await logApiAccess(req, res, startTime);
});

export const key = https.onRequest({
  cors: true,
  invoker: "public",
}, async (req, res) => {
  if (req.path === "/create") {
    await ApiKeyCreateContoroller.handleKeyCreate(res);
  } else {
    res.status(404).send("Not Found");
  }
});

// ヘルスチェックエンドポイント
export const health = https.onRequest({
  cors: true,
  invoker: "public",
}, async (req, res) => {
  await validateApiKey(req, res, () => {
    res.json({status: "ok"});
  });
});

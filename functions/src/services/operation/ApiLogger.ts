import * as admin from "firebase-admin";
import {Request} from "firebase-functions/v2/https";
import {Response} from "express";
import {FieldValue} from "firebase-admin/firestore";

interface ApiLogData {
  apiKey: string;
  endpoint: string;
  method: string;
  requestBody: any;
  responseStatus: number;
  processingTime: number;
  timestamp: Date;
  ipAddress: string;
}

export const logApiAccess = async (req: Request, res: Response, startTime: number) => {
  const logData: ApiLogData = {
    apiKey: req.headers["x-api-key"] as string,
    endpoint: req.path,
    method: req.method,
    requestBody: req.body,
    responseStatus: res.statusCode,
    processingTime: Date.now() - startTime,
    timestamp: new Date(),
    ipAddress: req.ip || "unknown",
  };

  try {
    await admin.firestore()
      .collection("api_logs")
      .add({
        ...logData,
        createdAt: FieldValue.serverTimestamp(),
      });
  } catch (error) {
    console.error("APIログ保存エラー:", error);
  }
};

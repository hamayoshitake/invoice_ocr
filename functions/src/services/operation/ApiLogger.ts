import {Request} from "firebase-functions/v2/https";
import {Response} from "express";
import {getFirestore, Timestamp} from "firebase-admin/firestore";

interface ApiLogData {
  apiKey: string;
  endpoint: string;
  method: string;
  requestBody: any;
  responseStatus: number;
  processingTime: Timestamp;
  timestamp: Timestamp;
  ipAddress: string;
}

export const logApiAccess = async (req: Request, res: Response, startTime: number) => {
  const logData: ApiLogData = {
    apiKey: req.headers["x-api-key"] as string,
    endpoint: req.path,
    method: req.method,
    requestBody: req.body,
    responseStatus: res.statusCode,
    processingTime: Timestamp.fromMillis(Date.now() - startTime),
    timestamp: Timestamp.now(),
    ipAddress: req.ip || "unknown",
  };

  try {
    await getFirestore()
      .collection("api_logs")
      .doc("version1")
      .set({
        ...logData,
        createdAt: Timestamp.now(),
      });
  } catch (error) {
    console.error("APIログ保存エラー:", error);
  }
};

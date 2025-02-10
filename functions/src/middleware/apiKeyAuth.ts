import {Request} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {Response} from "express";
import {getFirestore, Timestamp} from "firebase-admin/firestore";


interface ApiKeyData {
  apiKey: string;
  isActive: boolean;
  createdAt: Date;
  lastUsed: Date | null;
  expiresAt: Date;
}

export const createKey = async (apiKey: string) => {
  const db = getFirestore();

  // 90日後の日時を計算
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  const apiKeyData: Omit<ApiKeyData, "createdAt"> = {
    apiKey,
    isActive: true,
    lastUsed: null,
    expiresAt: expiresAt,
  };

  await db
    .collection("api_keys")
    .doc("version1")
    .set({
      ...apiKeyData,
      createdAt: Timestamp.now(),
    });

  return apiKeyData;
};

// APIキーのバリデーション
export const validateApiKey = async (req: Request, res: Response, next: () => void) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || typeof apiKey !== "string") {
    return res.status(401).json({
      status: "error",
      message: "APIキーが必要です",
    });
  }

  try {
    const doc = await admin.firestore()
      .collection("api_keys")
      .doc("version1")
      .get();

    if (!doc.exists) {
      return res.status(401).json({
        status: "error",
        message: "無効なAPIキーです",
      });
    }

    const keyData = doc.data() as ApiKeyData;
    const now = new Date();

    // 有効期限チェック
    if (now > new Date(keyData.expiresAt)) {
      return res.status(401).json({
        status: "error",
        message: "APIキーの有効期限が切れています",
      });
    }

    // 有効なAPIキーかチェック
    if (!keyData.isActive) {
      return res.status(403).json({
        status: "error",
        message: "APIキーが無効化されています",
      });
    }

    // 最終使用日時を更新
    await doc.ref.update({
      lastUsed: Timestamp.now(),
    });

    return next();
  } catch (error) {
    console.error("API認証エラー:", error);
    res.status(500).json({
      status: "error",
      message: "認証処理中にエラーが発生しました",
    });
  }
};

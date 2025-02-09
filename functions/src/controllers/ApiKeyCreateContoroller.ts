import {Response} from "express";
import * as crypto from "crypto";
import {createKey} from "../middleware/apiKeyAuth";

export class ApiKeyCreateContoroller {
  static async handleKeyCreate(res: Response) {
    try {
      const apiKey = crypto.randomBytes(32).toString("hex");

      // APIキーを生成（32バイトのランダムな16進数文字列）
      const createResult = await createKey(apiKey);

      res.json({
        status: "success",
        data: {
          apiKey,
          message: "このAPIキーは一度しか表示されません。大切に保管してください。",
          expiresAt: `有効期限は${createResult.expiresAt}です。`,
        },
      });
    } catch (error) {
      console.error("APIキー生成エラー:", error);
      res.status(500).json({
        status: "error",
        message: "APIキーの生成に失敗しました",
      });
    }
  }
}

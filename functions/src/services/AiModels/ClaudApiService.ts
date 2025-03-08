import Anthropic from "@anthropic-ai/sdk";
import {exportLocalStorageInvoiceData} from "../ExportLocalStorageInvoiceData";
import {secrets} from "../../secret";

const anthropic = new Anthropic({
  apiKey: secrets.anthropicApiKey.value(), // 使用の際にシークレットキーから取得
});

// NOTE:: クロードAIのサービス(現状使用箇所なし)
export class ClaudApiService {
  async postAnthropicAi(prompt: string, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await anthropic.messages.create({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 8192,
          messages: [
            {
              role: "user",
              content: `
                必ずJSON形式で応答してください。説明文は不要です。
                ${prompt}
              `,
            },
          ],
        });
        exportLocalStorageInvoiceData(response, "claudeAiAgentResponse");

        const textContent = (response.content[0] as { type: "text", text: string }).text;

        if (textContent) {
          exportLocalStorageInvoiceData(textContent, "claudeAiAgent");
          return JSON.parse(textContent);
        }
      } catch (error: any) {
        if (i === maxRetries - 1) throw error;
        // 529エラーの場合は待機してリトライ
        if (error.status === 529) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
          continue;
        }
        throw error;
      }
    }
    throw new Error("JSONが見つかりませんでした");
  }
}

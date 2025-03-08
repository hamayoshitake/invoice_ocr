import {SecretParam} from "firebase-functions/lib/params/types";
import OpenAI from "openai";

export class OpenAiApi4oMiniService {
  private openai: OpenAI;

  constructor(apiKey: SecretParam) {
    this.openai = new OpenAI({apiKey: apiKey.value()});
  }

  // 日本時間フォーマット関数
  private formatJapanTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
    });
  }

  async postOpenAiApi(prompt: string): Promise<any> {
    // 開始時間を記録
    const startTime = Date.now();
    const startTimeFormatted = this.formatJapanTime(startTime);

    console.log(`[OpenAI API呼び出し開始] ${startTimeFormatted}`);
    console.log(`[OpenAI API] プロンプト長: ${prompt.length}文字`);

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "請求書のテキストからJSON形式で情報を抽出するアシスタントです。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: {type: "json_object"},
    });

    // 終了時間を記録
    const endTime = Date.now();
    const endTimeFormatted = this.formatJapanTime(endTime);
    const processingTime = endTime - startTime;

    // トークン使用量の取得
    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;
    const totalTokens = response.usage?.total_tokens || 0;

    // 処理時間とトークン使用量をログに出力
    console.log(`[OpenAI API呼び出し終了] ${endTimeFormatted}`);
    console.log(`[OpenAI API処理時間] ${processingTime}ms (${(processingTime / 1000).toFixed(2)}秒)`);
    console.log(`[OpenAI APIトークン使用量] プロンプト: ${promptTokens}, 応答: ${completionTokens}, 合計: ${totalTokens}`);

    // トークンあたりの処理時間（パフォーマンス指標）
    const msPerToken = processingTime / totalTokens;
    console.log(`[OpenAI APIパフォーマンス] トークンあたり ${msPerToken.toFixed(2)}ms`);

    return JSON.parse(response.choices[0].message.content || "");
  }
}

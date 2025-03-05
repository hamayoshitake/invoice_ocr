import {SecretParam} from "firebase-functions/lib/params/types";
import OpenAI from "openai";

export class OpenAiApi4oService {
  private openai: OpenAI;

  constructor(apiKey: SecretParam) {
    this.openai = new OpenAI({apiKey: apiKey.value()});
  }

  async postOpenAiApi(prompt: string, temperature = 0.1): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
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
      temperature: temperature,
      response_format: {type: "json_object"},
    });

    return JSON.parse(response.choices[0].message.content || "");
  }
}

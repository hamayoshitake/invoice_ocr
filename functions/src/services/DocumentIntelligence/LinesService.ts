import {exportLocalStorageInvoiceData} from "../ExportLocalStorageInvoiceData";
import {SecretParam} from "firebase-functions/lib/params/types";
import {OpenAiApi4oService} from "../AiModels/OpenAiApi4oService";

// NOTE: 現状使ってない
export class LinesService {
  private openAiApi4oService: OpenAiApi4oService;

  constructor(apiKey: SecretParam) {
    // オープンAIで実行する（トークン量の関係で、レスポンスが安定しているため）
    this.openAiApi4oService = new OpenAiApi4oService(apiKey);
  }

  async process(result: any) {
    const resultData = await this.getLinesData(result.analyzeResult.pages[0].lines);

    exportLocalStorageInvoiceData(resultData, "linesData");

    return resultData;
  }

  async getLinesData(lines: any, retryCount = 3) {
    for (let i = 0; i < retryCount; i++) {
      try {
        const prompt = `

        以下のdocument intelligenceのレスポンスデータから、pdfの行ごとに読み取ったデータを抽出して整形してください。

        前提条件
        contentは、pdfの横ラインで読み取った文字列です。改行がある場合は、同じラインとはみなされません。
        polygonは、contentの文字列のpdfの左上からの座標データです。
        spanは、lengthが文字列の長さ、offsetが最初の文字列からの開始位置です。

        この情報をもとに、文字列と位置情報関連する文字列を出力してください。
        contentの文字列は改行がある場合があるので、他のlinesのオブジェクトの位置情報を参考にして、適切な文字列になるようにしてまとめてください。
        また、出力する文字列は、pdf上から順番に出力してください。

        出力形式は、以下の通りです。
        必ず以下のJSON形式で出力してください。他の説明は不要です。
        {
          "lines": [
            {
              "content": "行のテキスト内容",
              "polygon": [x1, y1, x2, y2],
              "span": {
                "offset": 開始位置,
                "length": 文字列の長さ
              }
            }
          ]
        }

        data:
        ${JSON.stringify(lines, null, 2)}
      `;

        const result = await this.openAiApi4oService.postOpenAiApi(prompt);

        exportLocalStorageInvoiceData(result, "openAiAPiAgentLines");

        if (!result) continue;

        if (await this.validateLineData(result)) {
          console.log(`linesDataの試行 ${i + 1}: 成功`);
          return result;
        }

        console.log(`linesDataの試行 ${i + 1}: データ形式が不正`);
        continue;
      } catch (error) {
        console.error(`linesDataの試行 ${i + 1} エラー:`, error);
        continue;
      }
    }

    throw new Error("AIの処理に失敗しました。");
  }

  private async validateLineData(data: any): Promise<boolean> {
    // レスポンスの基本構造のチェック
    if (!data || !Array.isArray(data.lines)) {
      console.log("基本構造が不正です");
      return false;
    }

    // 行数のチェック（10行以上）
    if (data.lines.length < 10) {
      console.log(`行数が不足しています: ${data.lines.length}行`);
      return false;
    }

    // 各行のデータ構造チェック
    return data.lines.every((line: any, index: number) => {
      // content のチェック
      if (typeof line.content !== "string" || line.content.trim() === "") {
        console.log(`Line ${index}: contentが不正です`);
        return false;
      }

      // polygon のチェック
      if (!Array.isArray(line.polygon) || line.polygon.length < 4) {
        console.log(`Line ${index}: polygonが不正です`);
        return false;
      }

      // polygon の要素が全て数値かチェック
      if (!line.polygon.every((coord: any) => typeof coord === "number")) {
        console.log(`Line ${index}: polygon座標が数値ではありません`);
        return false;
      }

      // span のチェック
      if (!line.span ||
          typeof line.span.offset !== "number" ||
          typeof line.span.length !== "number") {
        console.log(`Line ${index}: spanが不正です`);
        return false;
      }

      return true;
    });
  }
}

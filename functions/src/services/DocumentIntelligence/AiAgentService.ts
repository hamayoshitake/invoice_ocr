import {OpenAI} from "openai";
import {exportLocalStorageInvoiceData} from "../ExportLocalStorageInvoiceData";
import {SecretParam} from "firebase-functions/lib/params/types";

export class AiAgentService {
  private openai: OpenAI;
  constructor(apiKey: SecretParam) {
    this.openai = new OpenAI({apiKey: apiKey.value()});
  }

  async processLines(result: any) {
    const resultData = await this.getLinesData(result.analyzeResult.pages[0].lines);

    exportLocalStorageInvoiceData(resultData, "linesData");

    return resultData;
  }

  async processTables(result: any) {
    // テーブルからの明細データを抽出
    const resultData = await this.getTablesData(result.analyzeResult.tables);

    await exportLocalStorageInvoiceData(resultData, "tableData");

    return resultData;
  }

  async askAI(prompt: string) {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{role: "user", content: prompt}],
      temperature: 0.1,
      response_format: {type: "json_object"},
    });

    return response.choices[0].message.content || "";
  }

  async getTablesData(tables: any[], retryCount = 3) {
    for (let i = 0; i < retryCount; i++) {
      try {
        const prompt = `
          以下のテーブルデータから請求書の明細行を抽出してください。
          必ずjson形式で出力してください。

          要件：
          1. 各行には以下の項目が含まれます：
             - 行番号
             - 日付
             - 項目名
             - 数量
             - 単価
             - 金額
          2. 振込先や支払期日などの情報は除外
          3. ヘッダー行を最初の行として含める

          データの内容
          1. tablesのデータは、document intelligenceのレスポンスデータから抽出したテーブルデータ
          2. tablesのデータは、要素ごとにページを表している。
          3. cells.rowIndexは、テーブルの行番号
          4. cells.columnIndexは、テーブルの列番号
          5. cells.contentは、テーブルの内容
          6. cells.boundingBoxは、テーブルの座標

          手順
          1. tablesのcellls.rowIndex=0のデータから、contentの文字列が請求書の明細行のヘッダー行であることを特定する
          2. rowIndex=1以降のデータから、contentの文字列が請求書の明細行であることを特定する

          注意点
          1. ページがtableのrowIndexを跨る場合はかつ、1ページ以降にヘッダーがない場合は、rowIndex=0から始まる
          2. 請求書のフォーマットは違うため、特定する項目は似ている意味で探す
          3. contentの文字列は、セル内の折り返しで改行がある場合があるので、文字の中に\nがある場合は内容が続いている場合は、改行を含める

          出力形式：
          {
            "tableData": [
              {
                "content": string,  // 入力データのヘッダー行をそのまま使用
                "polygon": [x1, y1, x2, y2],
                "span": {
                  "offset": number,
                  "length": number
                }
              },
              {
                "content": string,  // 入力データの各行をそのまま使用
                "polygon": [x1, y1, x2, y2],
                "span": {
                  "offset": number,
                  "length": number
                }
              }
            ]
          }

          テーブルデータ:
          ${JSON.stringify(tables, null, 2)}
        `;

        const result = await this.askAI(prompt);
        if (!result) continue;

        const parsed = JSON.parse(result);

        // バリデーション
        if (await this.validateTableData(parsed)) {
          console.log(`試行 ${i + 1}: 成功`);
          return parsed;
        }

        console.log(`試行 ${i + 1}: データ形式が不正`);
        continue;
      } catch (error) {
        console.error(`試行 ${i + 1} エラー:`, error);
        continue;
      }
    }

    throw new Error("テーブルデータの抽出に失敗しました");
  }

  private async validateTableData(data: any): Promise<boolean> {
    await exportLocalStorageInvoiceData(data, "tableDataValidateTableData");

    if (!data?.tableData || !Array.isArray(data.tableData)) {
      console.log("lines配列が存在しません");
      return false;
    }

    if (data.tableData.length < 1) {
      console.log(`行数が不正です: ${data.tableData.length}行`);
      return false;
    }

    // ヘッダー行の検証
    const header = data.tableData[0].content;
    if (!header.includes("日付") || !header.includes("項目") || !header.includes("金額") || !header.includes("数量") || !header.includes("単価")) {
      console.log("ヘッダー行が不正です");
      return false;
    }

    // 各行のデータ構造を検証
    return data.tableData.every((table: any, index: number) => {
      if (!table.content || !Array.isArray(table.polygon) || !table.span) {
        console.log(`行 ${index}: データ構造が不正です`);
        return false;
      }

      return true;
    });
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

        const result = await this.askAI(prompt);

        if (!result) continue;


        // データ構造の検証
        const parsed = JSON.parse(result);
        if (await this.validateLineData(parsed)) {
          return parsed;
        }

        continue;
      } catch (error) {
        console.log(error);
      }
    }

    throw new Error("AIの処理に失敗しました。");
  }

  private async validateLineData(data: any): Promise<boolean> {
    // 基本構造のチェック
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

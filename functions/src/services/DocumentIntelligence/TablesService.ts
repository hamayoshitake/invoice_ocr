import {exportLocalStorageInvoiceData} from "../ExportLocalStorageInvoiceData";
import {SecretParam} from "firebase-functions/lib/params/types";
import {OpenAiApi4oService} from "../AiModels/OpenAiApi4oService";
import {extractTableData} from "../format/parseTables";

export class TablesService {
  private openAiApi4oService: OpenAiApi4oService;

  constructor(apiKey: SecretParam) {
    // オープンAIで実行する（トークン量の関係で、レスポンスが安定しているため）
    this.openAiApi4oService = new OpenAiApi4oService(apiKey);
  }

  async process(result: any) {
    // テーブルからの明細データを抽出
    const tables = extractTableData(result);
    exportLocalStorageInvoiceData(tables, "formatTableData");
    const resultData = await this.getTablesData(tables);

    await exportLocalStorageInvoiceData(resultData, "tableData");

    return resultData;
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
          1. tablesのデータは、要素ごとにページを表している。
          2. cells.rowIndexは、テーブルの行番号
          3. cells.columnIndexは、テーブルの列番号
          4. cells.contentは、テーブルの内容
          5. cells.boundingBoxは、テーブルの座標

          手順
          1. headersのデータから、請求書詳細データの項目を特定する
          2. rowsのデータから、請求書詳細データのテーブルデータを特定する
          4. 特定したheadersの次のオブジェクトを確認して、テーブルのデータが跨っているかチェックする
          5. 跨っている場合は、前ページの最後のテーブルの続きに取得していく

          注意点
          1. 請求書のフォーマットは違うため、特定する項目は似ている意味で探す
          2. 文字の中に\nがある場合は内容が続いている場合は、改行を含める

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

        const result = await this.openAiApi4oService.postOpenAiApi(prompt);
        exportLocalStorageInvoiceData(result, "openAiAPiAgentTables");

        if (!result) continue;

        // バリデーション
        if (await this.validateTableData(result)) {
          console.log(`tableDataの試行 ${i + 1}: 成功`);
          return result;
        }

        console.log(`tableDataの試行 ${i + 1}: データ形式が不正`);
        continue;
      } catch (error) {
        console.error(`tableDataの試行 ${i + 1} エラー:`, error);
        continue;
      }
    }

    throw new Error("テーブルデータの抽出に失敗しました");
  }

  private async validateTableData(data: any): Promise<boolean> {
    await exportLocalStorageInvoiceData(data, "tableDataValidateTableData");

    if (!data?.tableData || !Array.isArray(data.tableData)) {
      console.log("tableData配列が存在しません");
      return false;
    }

    if (data.tableData.length < 1) {
      console.log(`行数が不正です: ${data.tableData.length}行`);
      return false;
    }

    // ヘッダー行の検証
    const header = data.tableData[0].content;
    // 日付関連の正規表現
    const dateRegex = /(日付|取引日|日時|年月日|納品日)/;
    const hasDateColumn = dateRegex.test(header);

    // 項目関連の正規表現
    const itemRegex = /(項目|品目|商品|内容|納品)/;
    const hasItemColumn = itemRegex.test(header);

    // その他の必須項目
    const amountRegex = /(金額|価格)/;
    const quantityRegex = /数量/;
    const unitPriceRegex = /単価/;
    const unitRegex = /単位/;

    const hasAmount = amountRegex.test(header);
    const hasQuantity = quantityRegex.test(header);
    const hasUnitPrice = unitPriceRegex.test(header);
    const hasUnit = unitRegex.test(header);
    if (!hasDateColumn || !hasItemColumn || !hasAmount || !hasQuantity || !hasUnitPrice) {
      console.log("ヘッダー行が不正です");
      console.log(`日付カラム: ${hasDateColumn}, 項目カラム: ${hasItemColumn}, 金額: ${hasAmount}, 数量: ${hasQuantity}, 単価: ${hasUnitPrice}, 単位: ${hasUnit}`);
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
}

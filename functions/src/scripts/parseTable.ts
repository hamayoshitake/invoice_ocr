// NOTE:: scriptファイル
import * as fs from "fs";
import * as path from "path";
import {exportLocalStorageInvoiceData} from "../services/ExportLocalStorageInvoiceData";

interface TableData {
  headers: string[];
  rows: { [key: string]: string }[];
}

interface RowData {
  [key: string]: string;
}

function extractTableData(tableData: any): TableData[] {
  const tables = tableData?.analyzeResult?.tables || [];
  console.log(`テーブル数: ${tables.length}`);

  return tables.map((table: any, index: number) => {
    console.log(`テーブル${index + 1}の処理中...`);
    const cells = table.cells || [];
    console.log(`セル数: ${cells.length}`);

    const headers = cells
      .filter((cell: any) => cell.rowIndex === 0)
      .sort((a: any, b: any) => a.columnIndex - b.columnIndex)
      .map((cell: any) => cell.content);

    console.log(`テーブル${index + 1}のヘッダー:`, headers);

    const rows: RowData[] = [];
    const maxRowIndex = Math.max(...cells.map((cell: any) => cell.rowIndex));

    for (let rowIndex = 1; rowIndex <= maxRowIndex; rowIndex++) {
      const rowData: RowData = {};
      cells
        .filter((cell: any) => cell.rowIndex === rowIndex)
        .forEach((cell: any) => {
          rowData[headers[cell.columnIndex]] = cell.content;
        });
      rows.push(rowData);
    }

    return {headers, rows};
  });
}

// JSONファイルを読み込んで処理
// NOTE:: ローカルストレージに保存されているデータを読み込む
const filePath = path.join(__dirname, "../../storages/documentIntelligenceResult/invoice_20250226_070512.json");
const jsonData = JSON.parse(fs.readFileSync(filePath, "utf8"));
const result = extractTableData(jsonData); // jsonDataを直接渡す

console.log("結果:", JSON.stringify(result, null, 2));
exportLocalStorageInvoiceData(result, "invoice_20250226_070512");

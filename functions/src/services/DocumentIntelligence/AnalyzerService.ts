interface TableCell {
  content: string;
  rowIndex: number;
  columnIndex: number;
}

interface AnalyzeLayoutResult {
  content: string;
  lines: any[];
  tables: {
    cells: TableCell[];
  }[];
}

export class AnalyzerService {
  // レイアウト解析のメイン処理
  analyzeDocument(response: any): AnalyzeLayoutResult {
    const content = response.analyzeResult.content;

    // linesからcontentとpolygonのみを抽出
    const lines = response.analyzeResult.pages[0].lines.map((line: any) => ({
      content: line.content,
      polygon: line.polygon,
    }));

    // tablesからcontentとrowIndexとcolumnIndexのみを抽出
    const tables = response.analyzeResult.tables.map((table: any) => ({
      cells: table.cells.map((cell: any) => ({
        content: cell.content || "",
        rowIndex: cell.rowIndex,
        columnIndex: cell.columnIndex,
      })).filter((cell: TableCell) => cell.content !== ""), // 空のセルを除外
    }));

    return {
      content,
      lines,
      tables,
    };
  }

  // TODO: 使ってない
  getDocumentsFields(response: any): Array<{ [key: string]: any }> {
    return Object.entries(response.analyzeResult.documents[0].fields).map(
      ([key, field]: [string, any]) => {
        // Itemsの場合の特別処理
        if (key === "Items" && field?.valueArray) {
          return {
            [key]: field.valueArray.map((item: any) => {
              const valueObject = item?.valueObject || {};

              // 安全にオブジェクトを構築
              const result: any = {};

              // Amount
              if (valueObject.Amount) {
                result.Amount = {
                  type: valueObject.Amount.type,
                  content: valueObject.Amount.content,
                  value: valueObject.Amount?.valueCurrency?.amount,
                  currencyCode: valueObject.Amount?.valueCurrency?.currencyCode,
                  confidence: valueObject.Amount.confidence,
                  boundingRegions: valueObject.Amount.boundingRegions,
                };
              }

              // Date
              if (valueObject.Date) {
                result.Date = {
                  type: valueObject.Date.type,
                  content: valueObject.Date.content,
                  value: valueObject.Date.valueDate,
                  confidence: valueObject.Date.confidence,
                  boundingRegions: valueObject.Date.boundingRegions,
                };
              }

              // Description
              if (valueObject.Description) {
                result.Description = {
                  type: valueObject.Description.type,
                  content: valueObject.Description.content,
                  value: valueObject.Description.valueString,
                  confidence: valueObject.Description.confidence,
                  boundingRegions: valueObject.Description.boundingRegions,
                };
              }

              // UnitPrice
              if (valueObject.UnitPrice) {
                result.UnitPrice = {
                  type: valueObject.UnitPrice.type,
                  content: valueObject.UnitPrice.content,
                  value: valueObject.UnitPrice?.valueCurrency?.amount,
                  currencyCode: valueObject.UnitPrice?.valueCurrency?.currencyCode,
                  confidence: valueObject.UnitPrice.confidence,
                  boundingRegions: valueObject.UnitPrice.boundingRegions,
                };
              }

              return result;
            }),
          };
        }

        // その他のフィールドの処理
        return {
          [key]: {
            content: field?.content,
            type: field?.type,
          },
        };
      }
    );
  }

  // TODO: 使ってない
  getPagesLines(response: any): Array<{ [key: string]: any }> {
    return response.analyzeResult.pages.flatMap((page: any) =>
      page.lines.map((line: any) => ({
        content: line.content,
        polygon: line.polygon,
        spans: line.spans,
      }))
    );
  }
}

interface TextElement {
  text: string;
  polygon: number[];
  confidence: number;
}

interface Section {
  type: "payee" | "payer" | "invoice" | "bank" | "items" | "memo";
  elements: TextElement[];
  confidence: number;
}

export class LayoutAnalyzerService {
  // レイアウト解析のメイン処理
  analyzeLayout(response: any): Section[] {
    // console.log(JSON.stringify(response, null, 2));
    const elements = this.extractTextElements(response.analyzeResult);
    const content = response.content;
    console.log("content", content);
    console.log("elements", elements);
    const sections = this.detectSections(elements);

    console.log("sections", sections);
    return this.refineSections(sections);
  }

  // テキスト要素の抽出
  private extractTextElements(analyzeResult: any): TextElement[] {
    return analyzeResult.pages.flatMap((page: any) => {
      if (!Array.isArray(page.words)) {
        console.warn("Page words is not an array:", page);
        return [];
      }

      return page.words.map((word: any) => ({
        text: word.content || "",
        polygon: word.polygon || [],
        confidence: word.confidence || 0,
      }));
    });
  }

  // セクションの検出
  private detectSections(elements: TextElement[]): Section[] {
    const sections: Section[] = [];

    // キーワードベースのセクション検出
    const keywordPatterns = {
      payee: /(?:請求元|発行者|発行元)/,
      payer: /(?:請求先|宛先)/,
      invoice: /(?:請求書|インボイス)/,
      bank: /(?:振込先|口座|銀行)/,
      items: /(?:明細|品目|詳細)/,
      memo: /(?:備考|注意事項)/,
    };

    // 各セクションの検出
    Object.entries(keywordPatterns).forEach(([type, pattern]) => {
      const keywordElements = elements.filter((el) =>
        pattern.test(el.text)
      );

      keywordElements.forEach((keyElement) => {
        // キーワードの周辺要素を収集
        const nearbyElements = this.findNearbyElements(
          keyElement,
          elements,
          type as Section["type"]
        );

        if (nearbyElements.length > 0) {
          sections.push({
            type: type as Section["type"],
            elements: nearbyElements,
            confidence: this.calculateSectionConfidence(nearbyElements),
          });
        }
      });
    });

    return sections;
  }

  // 周辺要素の検出
  private findNearbyElements(
    keyElement: TextElement,
    allElements: TextElement[],
    type: Section["type"]
  ): TextElement[] {
    const searchRanges = {
      payee: {dx: 3.0, dy: 2.0},
      payer: {dx: 3.0, dy: 2.0},
      invoice: {dx: 2.0, dy: 1.0},
      bank: {dx: 4.0, dy: 2.0},
      items: {dx: 6.0, dy: 4.0},
      memo: {dx: 4.0, dy: 1.0},
    };

    const {dx, dy} = searchRanges[type];

    return allElements.filter((element) =>
      this.isWithinRange(element.polygon, keyElement.polygon, dx, dy)
    );
  }

  // 範囲内判定
  private isWithinRange(
    polygon1: number[],
    polygon2: number[],
    dx: number,
    dy: number
  ): boolean {
    // 中心点を使用して距離を計算
    const center1 = {
      x: (polygon1[0] + polygon1[4]) / 2,
      y: (polygon1[1] + polygon1[5]) / 2,
    };
    const center2 = {
      x: (polygon2[0] + polygon2[4]) / 2,
      y: (polygon2[1] + polygon2[5]) / 2,
    };

    return Math.abs(center1.x - center2.x) < dx &&
           Math.abs(center1.y - center2.y) < dy;
  }

  // セクションの信頼度計算
  private calculateSectionConfidence(elements: TextElement[]): number {
    return elements.reduce((sum, el) => sum + el.confidence, 0) / elements.length;
  }

  // セクションの精緻化
  private refineSections(sections: Section[]): Section[] {
    // 重複するセクションの統合
    // 信頼度の低いセクションの除去
    // セクション境界の調整
    return sections.filter((section) => section.confidence > 0.7);
  }

  getDocumentsFields(response: any): Array<{ [key: string]: any }> {
    return Object.entries(response.fields.documents).map(([key, field]: [string, any]) => ({
      [key]: {
        content: field.content,
        type: field.type,
      },
    }));
  }
}

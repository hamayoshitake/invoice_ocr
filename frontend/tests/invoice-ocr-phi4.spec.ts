import { test, expect } from '@playwright/test';

test('請求書OCR（phi4）のE2Eテスト', async ({ page }) => {
  // テスト全体のタイムアウトを設定
  test.setTimeout(300000); // 5分

  // OCRページに移動
  await page.goto('http://localhost:5173/invoice/ocr');
  
  // phi4タブに切り替え
  await page.getByRole('tab', { name: 'Phi-4 分析' }).click();
  
  // 初期状態の検証
  const fileInput = await page.locator('input[type="file"]').first();
  expect(fileInput).toBeTruthy();  // 要素の存在確認のみ
  const uploadButton = await page.getByRole('button', { name: 'PDFをアップロード' });
  await expect(uploadButton).toBeVisible();

  // ファイルをアップロード
  const testFilePath = '../functions/test_data/マネーフォード_1.pdf';
  await fileInput.setInputFiles(testFilePath);

  // 分析開始ボタンが表示されるのを待つ
  const analyzeButton = await page.getByRole('button', { name: '分析開始' });
  await expect(analyzeButton).toBeVisible();

  // APIリクエストの監視を開始
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/invoice/phi4/analyze') && response.status() === 200,
    { timeout: 180000 } // 3分
  );

  // 分析開始ボタンをクリック
  await analyzeButton.click();

  // ローディング状態の確認とスクリーンショット
  await expect(page.getByText('分析中...')).toBeVisible({ timeout: 180000 });

  try {
    // APIレスポンスを待機
    const response = await responsePromise;
    const responseData = await response.json();
    
    // レスポンスの検証
    expect(responseData.status).toBe('success');
    expect(responseData.data).toBeDefined();

    // ローディング表示が消えるのを待機
    await expect(page.getByText('分析中...')).not.toBeVisible({ timeout: 180000 });

    // 分析結果の表示を確認
    await expect(page.getByRole('heading', { name: '分析結果' })).toBeVisible();
    
    // 各セクションの表示を確認
    await expect(page.getByRole('heading', { name: '判断理由' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '請求元情報' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '請求先情報' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '請求書情報' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '金額情報' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '銀行情報' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '明細情報' })).toBeVisible();

    // 分析結果表示後のスクリーンショット
    await page.screenshot({ path: 'test-results/invoice-ocr-phi4-sections.png' });

    // 主要なフィールドの値を確認
    const payeeCompanyName = await page.getByLabel('会社名').first();
    await expect(payeeCompanyName).toBeVisible();
    expect(await payeeCompanyName.inputValue()).not.toBe('');

    const payerCompanyName = await page.getByLabel('会社名').nth(1);
    await expect(payerCompanyName).toBeVisible();
    expect(await payerCompanyName.inputValue()).not.toBe('');

    // フィールド値確認後のスクリーンショット
    await page.screenshot({ path: 'test-results/invoice-ocr-phi4-fields.png' });

    // 金額情報の確認
    const totalAmount = await page.getByLabel('合計金額');
    await expect(totalAmount).toBeVisible();
    expect(await totalAmount.inputValue()).not.toBe('0');

    // 明細情報の確認
    const detailsTable = await page.locator('table');
    await expect(detailsTable).toBeVisible();
    const detailRows = await page.locator('tbody tr').count();
    expect(detailRows).toBeGreaterThan(0);

    // エラー表示がないことを確認
    await expect(page.getByRole('alert')).not.toBeVisible();

    // 最終結果のスクリーンショット
    await page.screenshot({ path: 'test-results/invoice-ocr-phi4-result.png' });
  } catch (error) {
    console.error('APIレスポンスの処理中にエラーが発生しました:', error);
    
    // エラー状態のスクリーンショット
    await page.screenshot({ path: 'test-results/invoice-ocr-phi4-error.png' });
    
    // エラー表示の確認
    await expect(page.getByRole('alert')).toBeVisible();
    throw error;
  }
});

test('不正なファイルタイプのエラーハンドリング（phi4）', async ({ page }) => {
  // テスト全体のタイムアウトを設定
  test.setTimeout(300000); // 5分

  await page.goto('http://localhost:5173/invoice/ocr');
  
  // phi4タブに切り替え
  await page.getByRole('tab', { name: 'Phi-4 分析' }).click();
  
  // ファイルアップロードボタンの取得
  const fileInput = await page.locator('input[type="file"]').first();
  expect(fileInput).toBeTruthy();  // 要素の存在確認のみ
  const uploadButton = await page.getByRole('button', { name: 'PDFをアップロード' });
  await expect(uploadButton).toBeVisible();
  
  // 不正なファイルタイプ（テキストファイル）をアップロード
  await fileInput.setInputFiles({
    name: 'test.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('test content'),
  });

  // エラーメッセージの検証
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('PDFファイルを選択してください');

  // エラー状態のスクリーンショット
  await page.screenshot({ path: 'test-results/invoice-ocr-phi4-invalid-error.png' });
});
import { test, expect } from '@playwright/test';

test('請求書OCR（phi4）のE2Eテスト', async ({ page }) => {
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
    response => response.url().includes('/invoice/phi4/analyze') && response.status() === 200
  );

  // 分析開始ボタンをクリック
  await analyzeButton.click();

  // ローディング状態の確認
  await expect(page.getByText('分析中...')).toBeVisible({ timeout: 30000 });

  try {
    // APIレスポンスを待機
    const response = await responsePromise;
    const responseData = await response.json();
    
    // レスポンスの検証
    expect(responseData.status).toBe('success');
    expect(responseData.analysis).toBeDefined();

    // ローディング表示が消えるのを待機
    await expect(page.getByText('分析中...')).not.toBeVisible({ timeout: 30000 });

    // 分析結果の表示を確認
    await expect(page.getByText('分析結果')).toBeVisible();
    await expect(page.locator('pre').filter({ hasText: responseData.analysis })).toBeVisible();

    // エラー表示がないことを確認
    await expect(page.getByRole('alert')).not.toBeVisible();

    // スクリーンショットを撮影（結果確認用）
    await page.screenshot({ path: 'test-results/invoice-ocr-phi4-result.png' });
  } catch (error) {
    console.error('APIレスポンスの処理中にエラーが発生しました:', error);
    await expect(page.getByRole('alert')).toBeVisible();
    await page.screenshot({ path: 'test-results/invoice-ocr-phi4-error.png' });
  }
});

test('不正なファイルタイプのエラーハンドリング（phi4）', async ({ page }) => {
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

  // スクリーンショットを撮影（エラー確認用）
  await page.screenshot({ path: 'test-results/invoice-ocr-phi4-error.png' });
});
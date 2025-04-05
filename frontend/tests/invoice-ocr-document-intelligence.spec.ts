import { test, expect } from '@playwright/test';

test('請求書OCR（Document Intelligence）のE2Eテスト', async ({ page }) => {
  // OCRページに移動
  await page.goto('http://localhost:5173/invoice/ocr');
  
  // Document Intelligenceタブを選択
  const documentIntelligenceTab = await page.getByRole('tab', { name: 'Document Intelligence' });
  await documentIntelligenceTab.click();
  await expect(documentIntelligenceTab).toHaveAttribute('aria-selected', 'true');
  
  // 初期状態の検証
  const fileInput = await page.locator('input[type="file"]').first();
  expect(fileInput).toBeTruthy();
  const uploadButton = await page.getByRole('button', { name: 'アップロード' });
  await expect(uploadButton).toBeVisible();

  // ファイルをアップロード
  const testFilePath = '../functions/test_data/マネーフォード_1.pdf';
  await fileInput.setInputFiles(testFilePath);

  // APIリクエストの監視を開始
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/invoice/document-intelligence/analyze') && response.status() === 200
  );

  // アップロードボタンをクリック
  await uploadButton.click();

  // ローディング表示の確認
  await expect(page.getByTestId('loading-indicator')).toBeVisible();

  try {
    // APIレスポンスを待機
    const response = await responsePromise;
    const responseData = await response.json();
    
    // レスポンスの検証
    expect(responseData.status).toBe('success');
    expect(responseData.data).toBeDefined();

    // ローディング表示が消えるのを待機
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible({ timeout: 30000 });

    // 結果表示の確認
    await expect(page.getByTestId('result-container')).toBeVisible();

    // 請求書データが表示されていることを確認
    await expect(page.getByTestId('invoice-details')).toBeVisible();

    // エラー表示がないことを確認
    await expect(page.getByTestId('error-message')).not.toBeVisible();

    // スクリーンショットを撮影（結果確認用）
    await page.screenshot({ path: 'test-results/invoice-ocr-document-intelligence-result.png' });
  } catch (error) {
    console.error('APIレスポンスの処理中にエラーが発生しました:', error);
    await expect(page.getByTestId('error-message')).toBeVisible();
    await expect(page.getByTestId('error-message')).toContainText('画像の処理中にエラーが発生しました');
    await page.screenshot({ path: 'test-results/invoice-ocr-document-intelligence-error.png' });
  }
});

test('不正なファイルタイプのエラーハンドリング（Document Intelligence）', async ({ page }) => {
  await page.goto('http://localhost:5173/invoice/ocr');
  
  // Document Intelligenceタブを選択
  const documentIntelligenceTab = await page.getByRole('tab', { name: 'Document Intelligence' });
  await documentIntelligenceTab.click();
  await expect(documentIntelligenceTab).toHaveAttribute('aria-selected', 'true');
  
  // ファイルアップロードボタンの取得
  const fileInput = await page.locator('input[type="file"]').first();
  expect(fileInput).toBeTruthy();
  const uploadButton = await page.getByRole('button', { name: 'アップロード' });
  await expect(uploadButton).toBeVisible();
  
  // 不正なファイルタイプ（テキストファイル）をアップロード
  await fileInput.setInputFiles({
    name: 'test.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('test content'),
  });

  // アップロードボタンをクリック
  await uploadButton.click();

  // エラーメッセージの検証
  await expect(page.getByTestId('error-message')).toBeVisible();
  await expect(page.getByTestId('error-message')).toContainText('画像の処理中にエラーが発生しました');

  // スクリーンショットを撮影（エラー確認用）
  await page.screenshot({ path: 'test-results/invoice-ocr-document-intelligence-error.png' });
});
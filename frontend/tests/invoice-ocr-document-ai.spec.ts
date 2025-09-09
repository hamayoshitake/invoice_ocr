import { test, expect } from '@playwright/test';
import { INVOICE_FIELD_LABELS } from '../src/constants/labels/invoiceFieldLabels';
import { InvoiceData } from '../src/types/InvoiceData';

test('請求書OCRのE2Eテスト', async ({ page }) => {
  // OCRページに移動
  await page.goto('http://localhost:5173/invoice/ocr');
  
  // 初期状態の検証
  const fileInput = await page.locator('input[type="file"]').first();
  await expect(fileInput).toBeVisible();
  const uploadButton = await page.getByRole('button', { name: /アップロード/i });
  await expect(uploadButton).toBeVisible();

  // APIリクエストの監視を開始
  const responsePromise = page.waitForResponse(
    response => response.url().includes('/invoice/document-ai/analyze') && response.status() === 200
  );

  // ファイルをアップロード
  const testFilePath = '../functions/test_data/マネーフォード_1.pdf';
  await fileInput.setInputFiles(testFilePath);

  // アップロードボタンをクリック
  await uploadButton.click();

  // ローディング表示の確認
  await expect(page.getByTestId('loading-indicator')).toBeVisible();

  // APIレスポンスを待機
  const response = await responsePromise;
  const responseData = await response.json();
  
  // レスポンスの検証
  expect(responseData.status).toBe('success');
  expect(responseData.data).toBeDefined();

  // レスポンスの型チェック
  const data = responseData.data as InvoiceData;
  expect(data.analysis).toBeDefined();
  expect(data.analysis.payee_identification_reason).toBeDefined();
  expect(data.analysis.payer_identification_reason).toBeDefined();

  // 結果表示の確認
  await expect(page.getByTestId('result-container')).toBeVisible({ timeout: 30000 });

  // 各フィールドの表示確認
  for (const [key, label] of Object.entries(INVOICE_FIELD_LABELS)) {
    const fieldLocator = page.getByLabel(label);
    await expect(fieldLocator).toBeVisible();
    const value = data[key as keyof typeof INVOICE_FIELD_LABELS];
    if (value !== null && value !== undefined) {
      await expect(fieldLocator).toHaveValue(String(value));
      
      // 数値フィールドの型チェック
      if (typeof value === 'number') {
        expect(Number.isFinite(value)).toBeTruthy();
      }
    }
  }

  // 明細情報の確認
  if (data.invoice_details && data.invoice_details.length > 0) {
    const details = data.invoice_details;
    await expect(page.getByTestId('invoice-details')).toBeVisible();
    
    // 明細行数の検証
    const rows = await page.getByTestId('invoice-details').locator('tbody tr').count();
    expect(rows).toBe(details.length);
    
    // すべての明細行を検証
    for (let i = 0; i < details.length; i++) {
      const detail = details[i];
      const row = page.getByTestId('invoice-details').locator('tbody tr').nth(i);
      
      // 日付のフォーマット検証
      expect(detail.item_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      await expect(row.locator('input[type="date"]')).toHaveValue(detail.item_date);
      
      // テキストフィールドの検証
      expect(detail.item_description).toBeTruthy();
      await expect(row.locator('input[type="text"]')).toHaveValue(detail.item_description);
      
      // 数値フィールドの検証
      expect(Number.isFinite(detail.item_quantity)).toBeTruthy();
      expect(Number.isFinite(detail.item_unit_price)).toBeTruthy();
      expect(Number.isFinite(detail.item_amount)).toBeTruthy();
      expect(detail.item_amount).toBe(detail.item_quantity * detail.item_unit_price);
      
      await expect(row.locator('input[type="number"]').nth(0)).toHaveValue(String(detail.item_quantity));
      await expect(row.locator('input[type="number"]').nth(1)).toHaveValue(String(detail.item_unit_price));
      await expect(row.locator('input[type="number"]').nth(2)).toHaveValue(String(detail.item_amount));
      
      // コンソールにログを出力（デバッグ用）
      console.log(`明細行 ${i + 1} の検証完了:`, {
        日付: detail.item_date,
        説明: detail.item_description,
        数量: detail.item_quantity,
        単価: detail.item_unit_price,
        金額: detail.item_amount
      });
    }
  }

  // エラー表示がないことを確認
  await expect(page.getByTestId('error-message')).not.toBeVisible();

  // スクリーンショットを撮影（結果確認用）
  await page.screenshot({ path: 'test-results/invoice-ocr-result.png' });
});

test('不正なファイルタイプのエラーハンドリング', async ({ page }) => {
  await page.goto('http://localhost:5173/invoice/ocr');

  // ファイルアップロードボタンの取得
  const fileInput = await page.locator('input[type="file"]').first();
  const uploadButton = await page.getByRole('button', { name: /アップロード/i });
  await expect(uploadButton).toBeVisible();

  // 不正なファイルタイプ（テキストファイル）をアップロード
  await fileInput.setInputFiles({
    name: 'test.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('test content'),
  });

  // アップロードボタンをクリック
  await uploadButton.click();

  // エラーメッセージの検証（タイムアウトを30秒に設定）
  await expect(page.getByTestId('error-message')).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('error-message')).toContainText('画像の処理中にエラーが発生しました', { timeout: 30000 });

  // スクリーンショットを撮影（エラー確認用）
  await page.screenshot({ path: 'test-results/invoice-ocr-error.png' });
});
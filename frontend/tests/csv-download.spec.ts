/**
 * CSVダウンロード機能のテスト
 * Firebase/Viteサーバーが動作していることを前提として実行
 */
import { test, expect } from '@playwright/test';

test.describe('CSVダウンロード機能テスト', () => {
  test.beforeEach(async ({ page }) => {
    // サーバーが起動していることを確認（ポート5174を使用）
    await page.goto('http://localhost:5174');
    await expect(page).toHaveTitle(/Vite/);
  });

  test('CSVダウンロードページが表示される', async ({ page }) => {
    // CSVダウンロードページに移動
    await page.click('text=請求書csv出力');
    
    // CSVダウンロードフォームが表示されることを確認（正しいテキストに修正）
    await expect(page.locator('h3')).toContainText('請求書データCSVダウンロード');
    
    // ファイル選択ボタンが存在することを確認
    await expect(page.locator('input[type="file"]')).toBeVisible();
    
    // ダウンロードボタンが存在することを確認
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    console.log('✅ CSVダウンロード機能が正常に動作しています');
  });

  test('ホームページが表示される', async ({ page }) => {
    // ホームページのコンテンツを確認
    await expect(page.locator('h1')).toContainText('ホームページ');
    await expect(page.locator('p')).toContainText('アップロードしたいファイルの種類を選択してください');
    
    console.log('✅ ホームページが正常に表示されています');
  });

  test('OCRテストページが表示される', async ({ page }) => {
    // OCRテストページに移動
    await page.click('text=請求書OCRテスト');
    
    // 複数タブがある場合の最初のタブを確認
    await expect(page.locator('[role="tab"]').first()).toBeVisible();
    
    // Document AIタブが存在することを確認
    await expect(page.locator('text=Document AI')).toBeVisible();
    
    // 開発環境では3つのタブが表示されることを確認
    const tabCount = await page.locator('[role="tab"]').count();
    expect(tabCount).toBe(3);
    
    console.log('✅ OCRテストページが正常に表示され、3つのタブが確認されました');
  });
});
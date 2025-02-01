/**
 * 日本時間のタイムスタンプを生成する
 * @return {string} YYYYMMDD_HHmmss 形式の文字列
 */
export function generateJstTimestamp(): string {
  const date = new Date();
  const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000)); // UTC+9の日本時間に調整

  return jstDate.toISOString()
    .replace(/[-:]/g, "") // ハイフンとコロンを削除
    .replace(/\..+/, "") // ミリ秒以降を削除
    .replace("T", "_"); // Tをアンダースコアに置換
}

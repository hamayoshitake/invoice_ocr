import fs from "fs";
import path from "path";

export async function exportLocalStorageInvoiceData(data: any, savePath = "invoiceData") {
  // 一時ディレクトリを使用
  const storagePath = path.join(__dirname, `../../storages/${savePath}`);
  console.log("Storage path:", storagePath);

  // ディレクトリが存在しない場合は作成
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, {recursive: true});
  }

  const date = new Date();
  const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  const now = jstDate.toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..+/, "")
    .replace("T", "_");

  try {
    const invoiceDataFilePath = path.join(storagePath, `invoice_${now}.json`);
    await fs.promises.writeFile(
      invoiceDataFilePath,
      JSON.stringify(data, null, 2)
    );
    console.log(`Document AI response saved to: ${invoiceDataFilePath}`);
  } catch (error) {
    console.error("Error saving Document AI response:", error);
    throw error;
  }
}

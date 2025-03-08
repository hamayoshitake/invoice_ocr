import fs from "fs";
import path from "path";
import {generateJstTimestamp} from "../Utils/date";
import {LocalStorageError} from "../errors/CustomErrors";

export async function exportLocalStorageInvoiceData(data: any, savePath = "invoiceData", isJson = true) {
  // 一時ディレクトリを使用
  const storagePath = path.join(__dirname, `../../storages/${savePath}`);
  console.log("Storage path:", storagePath);

  // ディレクトリが存在しない場合は作成
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, {recursive: true});
  }

  try {
    const invoiceDataFilePath = path.join(storagePath, `invoice_${generateJstTimestamp()}.json`);
    await fs.promises.writeFile(
      invoiceDataFilePath,
      isJson ? JSON.stringify(data, null, 2) : data
    );
    console.log(`savePath saved to: ${invoiceDataFilePath}`);
  } catch (error) {
    throw new LocalStorageError(`${savePath}にデータを保存できませんでした。`);
  }
}

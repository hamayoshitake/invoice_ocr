import * as admin from "firebase-admin";
import {GcsStorageSaveError, GcsStorageGetSignedUrlError} from "./errors/CustomErrors";

// ファイルのアップロード用の関数
export const uploadInvoiceCsvToStorage = async (fileName: string, fileContent: string): Promise<string> => {
  try {
    const bucket = admin.storage().bucket();
    const fileBuffer = Buffer.from(fileContent);

    await bucket.file(fileName).save(fileBuffer, {
      contentType: "text/csv",
      metadata: {
        cacheControl: "no-cache",
      },
    });

    // アップロード後の存在確認
    const exists = await checkFileExists(fileName);
    if (!exists) {
      throw new Error("ファイルのアップロードに失敗しました（存在確認エラー）");
    }

    console.log(`File ${fileName} uploaded successfully`);
    return fileName;
  } catch (error) {
    throw new GcsStorageSaveError();
  }
};

// ファイルの存在確認用の関数
export const checkFileExists = async (filePath: string): Promise<boolean> => {
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);
    const [exists] = await file.exists();

    console.log(`ファイル ${filePath} の存在確認:`, exists);
    return exists;
  } catch (error) {
    console.error("ファイル存在確認エラー:", error);
    return false;
  }
};

// ファイルのURL取得用の関数
export const getStorageSavedFileUrl = async (fileName: string): Promise<string> => {
  try {
    const isExists = await checkFileExists(fileName);
    if (isExists) {
      console.log("ファイルが見つかりました");
    } else {
      throw new Error("ファイルが見つかりません");
    }

    const bucket = admin.storage().bucket();
    const file = bucket.file(fileName);

    // ファイルの存在確認
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error("ファイルが見つかりません");
    }

    // ローカル環境の場合は、手動でURLを生成する
    if (process.env.FUNCTIONS_EMULATOR) {
      // エミュレータ用のURL生成
      const downloadUrl = `http://localhost:9199/${bucket.name}/${fileName}`;
      console.log("エミュレータ環境 ダウンロードURL:", downloadUrl);
      return downloadUrl;
    }

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 15 * 60 * 1000, // 15分
    });

    return url;
  } catch (error) {
    throw new GcsStorageGetSignedUrlError();
  }
};

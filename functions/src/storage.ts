import * as admin from "firebase-admin";
import {GcsStorageSaveError, GcsStorageGetSignedUrlError} from "./errors/CustomErrors";

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

    console.log(`File ${fileName} uploaded successfully`);
    return fileName;
  } catch (error) {
    throw new GcsStorageSaveError();
  }
};

export const getStorageSavedFileUrl = async (fileName: string): Promise<string> => {
  try {
    const [url] = await admin.storage().bucket().file(fileName).getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000, // 15分間有効
    });

    return url;
  } catch (error) {
    throw new GcsStorageGetSignedUrlError();
  }
};

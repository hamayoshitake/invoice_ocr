export class CustomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends CustomError {
  constructor(message?: string) {
    super(message || "入力内容を確認してください");
  }
}

export class DocumentAIError extends CustomError {
  constructor(message?: string) {
    super(message || "ドキュメントの解析に失敗しました。PDFファイルの内容を確認の上、再度お試しください");
  }
}

export class LocalStorageError extends CustomError {
  constructor(message?: string) {
    super(message || "一時的なエラーが発生しました。時間をおいて再度お試しください");
  }
}

export class CsvConversionError extends CustomError {
  constructor(message?: string) {
    super(message || "CSVファイルの作成に失敗しました。請求書の内容を確認の上、再度お試しください");
  }
}

export class GcsStorageSaveError extends CustomError {
  constructor(message?: string|null) {
    super(message || "ファイルの保存に失敗しました。時間をおいて再度お試しください");
  }
}

export class GcsStorageGetSignedUrlError extends CustomError {
  constructor(message?: string|null) {
    super(message || "ダウンロードURLの取得に失敗しました。時間をおいて再度お試しください");
  }
}

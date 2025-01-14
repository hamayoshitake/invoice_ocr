import * as functions from 'firebase-functions';
import express, { Application } from 'express';
import fs from 'fs';
import dotenv from 'dotenv';
import { processInvoice } from './service/InvoiceDataExtractor';
import { getCsvContent } from './service/CsvGenerator';
import cors from 'cors';
import Busboy from 'busboy';
import * as path from 'path';

dotenv.config();
const app: Application = express();

app.use(cors());

interface Config {
  project: { id: string };
  location: string;
  processor: { ocr: { id: string } };
}

const config = functions.config() as Config;

// // JSONとURLエンコードされたリクエストボディのパース
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // multerの設定を修正
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: 10 * 1024 * 1024,  // 10MB
//     files: 1
//   }
// });

const {DocumentProcessorServiceClient} =
  require('@google-cloud/documentai').v1beta3;

const client = new DocumentProcessorServiceClient();

// ディレクトリが存在しない場合は作成
const ensureDirectoryExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};


// PDF処理エンドポイント (変更)
app.post('/upload', async (req, res) => {
  // console.log('req.body', req.body);
  // const handler = async (): Promise<void> => {

  // リクエストパラメータを保持する変数
  let payeeCompanyName: string | null = null;
  let fileBuffer: Buffer | null = null;

  // Busboyインスタンスの作成
  const busboy = Busboy({
    headers: req.headers,
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB
    }
  });

  // フィールドデータの処理
  busboy.on('field', (fieldname, val) => {
    console.log('fieldname', fieldname);
    console.log('val', val);
    if (fieldname === 'payeeCompanyName') {
      payeeCompanyName = val;
    }
  });

  // ファイルデータの処理
  busboy.on('file', (fieldname, file, { filename, encoding, mimeType }) => {

    if (mimeType !== 'application/pdf') {
      file.resume(); // ストリームを終了
      res.status(400).json({
        error: 'Invalid file type',
        details: { message: 'PDFファイルのみ対応しています' }
      });
      return;
    }

    // console.log('Receiving file:', {
    //   fieldName: fieldname,    // フォームのフィールド名（'file'）
    //   fileName: filename,      // 元のファイル名
    //   mimeType: mimeType,     // ファイルタイプ
    //   encoding: encoding      // エンコーディング
    // });
    
    const chunks: Buffer[] = [];

    file.on('data', (chunk) => {
      chunks.push(chunk);
    });

    file.on('end', () => {
      fileBuffer = Buffer.concat(chunks);
    });
  });

  // 全データの処理完了時
  busboy.on('finish', async () => {

    // console.log(dotenv.config());
    try {
      // バリデーション
      if (!payeeCompanyName) {
        res.status(400).json({
          error: 'Missing payeeCompanyName',
          details: { message: '請求元会社名が必要です' }
        });
        return;
      }

      if (!fileBuffer) {
        res.status(400).json({
          error: 'No file uploaded',
          details: { message: 'ファイルが必要です' }
        });
        return;
      }

      // base64に変換
      const base64File = fileBuffer.toString('base64');

      // Document AIのリクエスト
      const request = {
        name: `projects/${config.project.id}/locations/${config.location}/processors/${config.processor.ocr.id}`,
        rawDocument: {
          content: base64File,
          mimeType: 'application/pdf',
        },
      };

      const [result] = await client.processDocument(request);
      if(!result){
        res.status(500).json({ error: 'No Document data from Document AI', details: result });
        return;
      }

      // 日付を定義
      const today = new Date();
      const now = `${today.getFullYear()}${today.getMonth() + 1}${today.getDate()}${today.getHours()}${today.getMinutes()}${today.getSeconds()}`;
  
      // 請求書のデータを抽出
      const invoiceData = await processInvoice(result.document, payeeCompanyName);


      // ファイル保存前にディレクトリを作成
      const storageDir = './storage/invoiceData';
      ensureDirectoryExists(storageDir);

      // ファイル保存
      const filePath = path.join(storageDir, `invoiceData_${now}.txt`);
      fs.writeFileSync(filePath, JSON.stringify(invoiceData, null, 2));

      
      // // テキストファイルにnowをつけて保存
      // const invoiceDataFilePath = `./storage/invoiceData/invoiceData_${now}.txt`;
      // fs.writeFileSync(invoiceDataFilePath, JSON.stringify(invoiceData, null, 2));
      
      // CSV作成
      const csvContent = getCsvContent(invoiceData);
      if(csvContent[0] === ""){
        res.status(204).json({ message: 'No data extracted to create CSV'});
        return;
      }
      
      // ファイル保存前にディレクトリを作成
      const storageCsvDir = './storage/csv';
      ensureDirectoryExists(storageCsvDir);
      const csvFileName = `invoice_${now}.csv`;
      const csvFilePath = path.join(storageCsvDir, csvFileName);
      fs.writeFileSync(csvFilePath, csvContent);
  
  
      // CSVファイルをダウンロードレスポンス
      res.download(csvFilePath, csvFileName, (err) => {
        if (err) {
          console.error('Error downloading file:', err);
          res.status(500).send('Error downloading file');
          return;
        }
  
        // ダウンロード後にファイルを削除する場合
        fs.unlinkSync(csvFilePath);
      });

    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // エラーハンドリング
  busboy.on('error', (error) => {
    console.error('Busboy error:', error);
    res.status(500).json({ error: 'File processing error' });
  });

  busboy.end(req.body);
  // リクエストをBusboyにパイプ
  // req.pipe(busboy);

  // try {
  //   // ファイル読み込み
  //   // const fileContent = fs.readFileSync(process.env.FILE_PATH_INVOICE as string);
    
  //   // リクエストの請求元会社名を取得
  //   const payeeCompanyName = req.body.payeeCompanyName;
  //   if (!payeeCompanyName) {
  //     res.status(400).json({
  //       error: 'Missing payeeCompanyName',
  //       details: { message: '請求元会社名が必要です' }
  //     });
  //     return;
  //   }
    
  //   const file = req.file;
  //   if (!file) {
  //     res.status(400).send('No file uploaded.');
  //     return;
  //   }
  //   const base64File = file.buffer.toString('base64');

  //   // Document AIのリクエスト
  //   const request = {
  //     name: `projects/${process.env.PROJECT_ID}/locations/${process.env.LOCATION}/processors/${process.env.PROCESSOR_OCR_ID}`,
  //     rawDocument: {
  //       content: base64File,
  //       mimeType: 'application/pdf',
  //     },
  //   };

  //   const [result] = await client.processDocument(request);
  //   if(!result){
  //     res.status(500).json({ error: 'No Document data from Document AI', details: result });
  //     return;
  //   }

  //   // 日付を定義
  //   const today = new Date();
  //   const now = `${today.getFullYear()}${today.getMonth() + 1}${today.getDate()}${today.getHours()}${today.getMinutes()}${today.getSeconds()}`;

  //   // 請求書のデータを抽出
  //   const invoiceData = await processInvoice(result.document, payeeCompanyName);

  //   // テキストファイルにnowをつけて保存
  //   const invoiceDataFilePath = `./storage/invoiceData/invoiceData_${now}.txt`;
  //   fs.writeFileSync(invoiceDataFilePath, JSON.stringify(invoiceData, null, 2));

  //   // CSV作成
  //   const csvContent = getCsvContent(invoiceData);
  //   if(csvContent[0] === ""){
  //     res.status(204).json({ message: 'No data extracted to create CSV'});
  //     return;
  //   }

  //   const csvFilePath = `./storage/csv/invoice_${now}.csv`;
  //   fs.writeFileSync(csvFilePath, csvContent);


  //   // CSVファイルをダウンロードレスポンス
  //   res.download(csvFilePath, `invoice.csv`, (err) => {
  //     if (err) {
  //       console.error('Error downloading file:', err);
  //       res.status(500).send('Error downloading file');
  //       return;
  //     }

  //     // ダウンロード後にファイルを削除する場合
  //     fs.unlinkSync(csvFilePath);
  //   });

  // } catch (error) {
  //   console.error('Error processing document:', error);
  //   res.status(500).json({ error: 'Error processing document', details: error });
  //   return;
  // }
  // };

  // handler();

});

// functionsをエクスポートする形式に変更
export const api = functions.https.onRequest(app);
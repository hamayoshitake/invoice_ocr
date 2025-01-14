import * as functions from 'firebase-functions';
import express, { Application } from 'express';
import fs from 'fs';
import dotenv from 'dotenv';
import { processInvoice } from './service/InvoiceDataExtractor';
import { getCsvContent } from './service/CsvGenerator';
import cors from 'cors';
import multer from 'multer';

// google oauth認証でアクセスする

dotenv.config();
const app: Application = express();

app.use(cors());

// JSONとURLエンコードされたリクエストボディのパース
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// multerの設定を修正
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,  // 10MB
    files: 1
  }
});

const {DocumentProcessorServiceClient} =
  require('@google-cloud/documentai').v1beta3;

const client = new DocumentProcessorServiceClient();

// PDF処理エンドポイント (変更)
app.post('/upload', upload.single('file'), (req, res) => {
  console.log('req.body', req.body);
  const handler = async (): Promise<void> => {
    try {
      // ファイル読み込み
      // const fileContent = fs.readFileSync(process.env.FILE_PATH_INVOICE as string);
      
      // リクエストの請求元会社名を取得
      const payeeCompanyName = req.body.payeeCompanyName;
      if (!payeeCompanyName) {
        res.status(400).json({
          error: 'Missing payeeCompanyName',
          details: { message: '請求元会社名が必要です' }
        });
        return;
      }
      
      const file = req.file;
      if (!file) {
        res.status(400).send('No file uploaded.');
        return;
      }
      const base64File = file.buffer.toString('base64');

      // Document AIのリクエスト
      const request = {
        name: `projects/${process.env.PROJECT_ID}/locations/${process.env.LOCATION}/processors/${process.env.PROCESSOR_OCR_ID}`,
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

      // テキストファイルにnowをつけて保存
      const invoiceDataFilePath = `./storage/invoiceData/invoiceData_${now}.txt`;
      fs.writeFileSync(invoiceDataFilePath, JSON.stringify(invoiceData, null, 2));

      // CSV作成
      const csvContent = getCsvContent(invoiceData);
      if(csvContent[0] === ""){
        res.status(204).json({ message: 'No data extracted to create CSV'});
        return;
      }

      const csvFilePath = `./storage/csv/invoice_${now}.csv`;
      fs.writeFileSync(csvFilePath, csvContent);


      // CSVファイルをダウンロードレスポンス
      res.download(csvFilePath, `invoice.csv`, (err) => {
        if (err) {
          console.error('Error downloading file:', err);
          res.status(500).send('Error downloading file');
          return;
        }

        // ダウンロード後にファイルを削除する場合
        fs.unlinkSync(csvFilePath);
      });

    } catch (error) {
      console.error('Error processing document:', error);
      res.status(500).json({ error: 'Error processing document', details: error });
      return;
    }
  };

  handler();

});

// functionsをエクスポートする形式に変更
export const api = functions.https.onRequest(app);
import {Request} from "firebase-functions/v2/https";
import {Response} from "express";
import {processInvoiceDataWithoutPayeeName} from "../service/InvoiceDataNonPayeeNameExtractor";
import busboy from "busboy";
import {DocumentProcessorServiceClient} from "@google-cloud/documentai";
import {exportLocalStorageInvoiceData} from "../service/ExportLocalStorageInvoiceData";

interface Secrets {
  projectOcrId: any;
  location: any;
  processorOcrId: any;
  openaiApiKey: any;
}

export const InvoiceOcrApiController = {
  async handleInvoiceOcr(req: Request, res: Response, secrets: Secrets) {
    let fileBuffer: Buffer | null = null;

    const bb = busboy({headers: req.headers});


    bb.on("file", (fieldname, file, {mimeType}) => {
      if (mimeType !== "application/pdf") {
        file.resume();
        res.status(400).json({
          error: "Invalid file type",
          details: {message: "PDFファイルのみ対応しています"},
        });
        return;
      }

      const chunks: Buffer[] = [];
      file.on("data", (chunk) => chunks.push(chunk));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    bb.on("finish", async () => {
      if (!fileBuffer) {
        res.status(400).json({
          error: "Missing required fields",
          details: {message: "ファイルが必要です"},
        });
        return;
      }

      try {
        const base64File = fileBuffer.toString("base64");
        const request = {
          name: `projects/${secrets.projectOcrId.value()}/locations/${secrets.location.value()}/processors/${secrets.processorOcrId.value()}`,
          rawDocument: {
            content: base64File,
            mimeType: "application/pdf",
          },
        };

        const client = new DocumentProcessorServiceClient();
        const [result] = await client.processDocument(request);

        if (!result) {
          res.status(500).json({error: "No Document data from Document AI"});
          return;
        }

        exportLocalStorageInvoiceData(result.document);

        const invoiceData = await processInvoiceDataWithoutPayeeName(
          result.document,
          secrets.openaiApiKey
        );

        exportLocalStorageInvoiceData(invoiceData, "llmData");

        res.json({
          status: "success",
          data: invoiceData,
        });
      } catch (error: any) {
        res.status(500).json({
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    bb.on("error", (error) => {
      console.error("Busboy error:", error);
      res.status(500).json({error: "File processing error"});
    });

    bb.end(req.body);
  },
};

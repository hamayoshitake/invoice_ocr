import documentIntelligence, {DocumentIntelligenceClient, DocumentClassifierBuildOperationDetailsOutput, getLongRunningPoller, isUnexpected} from "@azure-rest/ai-document-intelligence";
import {AzureKeyCredential} from "@azure/core-auth";

export class DocumentIntelligencePostService {
  private client: DocumentIntelligenceClient;

  constructor() {
    const endpoint = process.env.AZURE_ENDPOINT || "https://invoice-ocr-2025-2-15.cognitiveservices.azure.com/";
    const key = process.env.AZURE_API_KEY || "5st2FfD8JXggAJH0WScCm7umqxTWQm92uViZwqR5Bccd2RmJIRHcJQQJ99BBACi0881XJ3w3AAAAACOGeJf4";

    this.client = documentIntelligence(endpoint, new AzureKeyCredential(key));
  }

  async process(base64File: string) {
    try {
      console.log("Starting document analysis...");

      const initialResponse = await this.client
        .path("/documentModels/{modelId}:analyze", "prebuilt-invoice")
        .post({
          contentType: "application/json",
          body: {
            base64Source: base64File,
          },
        });

      if (isUnexpected(initialResponse)) {
        throw initialResponse.body.error;
      }

      const poller = await getLongRunningPoller(this.client, initialResponse);
      const response = (await poller.pollUntilDone())
        .body as DocumentClassifierBuildOperationDetailsOutput;

      return response;
    } catch (error) {
      console.error("Document analysis failed:", error);
      throw error;
    }
  }
}

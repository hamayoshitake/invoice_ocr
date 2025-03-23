import documentIntelligence, {
  DocumentIntelligenceClient,
  getLongRunningPoller,
  isUnexpected,
  AnalyzeResultOperationOutput,
} from "@azure-rest/ai-document-intelligence";
import {AzureKeyCredential} from "@azure/core-auth";
import {Secrets} from "../../schemas/secret";

export class DocumentIntelligencePost {
  private client: DocumentIntelligenceClient;

  constructor(secrets: Secrets) {
    const endpoint = secrets.azureOcrEndpoint.value();
    const key = secrets.azureOcrApiKey.value();
    console.log("azureOcrEndpoint", endpoint);
    console.log("azureOcrApiKey", key);

    this.client = documentIntelligence(endpoint, new AzureKeyCredential(key));
  }

  async process(base64File: string) {
    try {
      console.log("Starting document analysis...");

      // ドキュメントの処理
      const startTime = new Date().getTime();

      const initialResponse = await this.client
        .path("/documentModels/{modelId}:analyze", "prebuilt-invoice")
        .post({
          contentType: "application/json",
          body: {
            base64Source: base64File,
          },
        });

      const endTime = new Date().getTime();
      const processingTime = endTime - startTime;
      console.log(`Intelligence API 処理時間: ${processingTime}ms (${(processingTime / 1000).toFixed(2)}秒)`);

      if (isUnexpected(initialResponse)) {
        throw initialResponse.body.error;
      }

      const poller = await getLongRunningPoller(this.client, initialResponse);
      const response = (await poller.pollUntilDone())
        .body as AnalyzeResultOperationOutput;

      return response;
    } catch (error) {
      console.error("Document analysis failed:", error);
      throw error;
    }
  }
}

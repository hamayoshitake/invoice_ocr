import documentIntelligence, {
  DocumentIntelligenceClient,
  getLongRunningPoller,
  isUnexpected,
  AnalyzeOperationOutput,
} from "@azure-rest/ai-document-intelligence";
import {SecretParam} from "firebase-functions/lib/params/types";

export class DocumentIntelligencePost {
  private client: DocumentIntelligenceClient;

  constructor(azureOcrApiKey: SecretParam, azureOcrEndpoint: SecretParam) {
    const endpoint = azureOcrEndpoint;
    const key = azureOcrApiKey;

    this.client = documentIntelligence(endpoint.value(), {key: key.value()});
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

      const poller = getLongRunningPoller(this.client, initialResponse);
      const result = (await poller.pollUntilDone()).body as AnalyzeOperationOutput;

      return result;
    } catch (error) {
      console.error("Document analysis failed:", error);
      throw error;
    }
  }
}

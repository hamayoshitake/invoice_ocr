import {defineSecret} from "firebase-functions/params";

export const secrets = {
  projectOcrId: defineSecret("PROJECT_OCR_ID"),
  location: defineSecret("LOCATION"),
  processorOcrId: defineSecret("PROCESSOR_OCR_ID"),
  openaiApiKey: defineSecret("OPENAI_API_KEY"),
  azureOcrEndpoint: defineSecret("AZURE_OCR_ENDPOINT"),
  azureOcrApiKey: defineSecret("AZURE_OCR_API_KEY"),
};

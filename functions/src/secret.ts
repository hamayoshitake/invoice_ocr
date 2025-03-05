import {defineSecret} from "firebase-functions/params";

export const secrets = {
  projectOcrId: defineSecret("PROJECT_OCR_ID"),
  location: defineSecret("LOCATION"),
  processorOcrId: defineSecret("PROCESSOR_OCR_ID"),
  openaiApiKey: defineSecret("OPENAI_API_KEY"),
  anthropicApiKey: defineSecret("ANTHROPIC_API_KEY"),
};

import { createOllama } from "ai-sdk-ollama";

/**
 * Returns an AI SDK language model bound to the user's local Ollama instance.
 * createOllama() accepts baseURL as a provider-level option, then the returned
 * function is called with the model name to produce the LanguageModel.
 * ai-sdk-ollama uses auto-environment detection (Node.js and browser/Tauri WebView).
 */
export function getOllamaModel(modelName: string, baseUrl: string) {
  const provider = createOllama({
    baseURL: baseUrl.replace(/\/$/, ""),
  });
  return provider(modelName);
}

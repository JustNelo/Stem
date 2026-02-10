import { z } from "zod";
import { safeInvoke } from "@/lib/tauri";
import { OllamaModelsSchema } from "@/types/schemas";
import { extractPlainText } from "@/lib/utils/text";
import { buildAIPrompt } from "@/lib/ai-prompts";

/**
 * AI service — single abstraction over Ollama IPC calls.
 */
export const AIService = {
  /**
   * Execute an AI command against the given note content.
   */
  async executeCommand(
    command: string,
    noteContent: string | null,
    model: string,
    ollamaUrl: string,
    args?: string,
  ): Promise<string> {
    if (!noteContent) {
      return "Aucune note sélectionnée.";
    }

    const text = extractPlainText(noteContent);
    if (!text.trim()) {
      return "Aucun contenu dans la note.";
    }

    const prompt = buildAIPrompt(command, text, args);

    const result = await safeInvoke("summarize_note", z.string(), {
      content: prompt,
      model,
      ollamaUrl,
    });

    return result || "Résultat vide.";
  },

  /**
   * Check whether Ollama is reachable at the given URL.
   */
  async checkConnection(ollamaUrl: string): Promise<boolean> {
    return safeInvoke("check_ollama_connection", z.boolean(), { ollamaUrl });
  },

  /**
   * Fetch available models from the Ollama instance.
   */
  async getModels(ollamaUrl: string): Promise<string[]> {
    return safeInvoke("get_ollama_models", OllamaModelsSchema, { ollamaUrl });
  },

  /**
   * Build a formatted context prompt for Ollama including system instructions
   * and the current note content.
   */
  formatContextPrompt(noteContent: string | null, systemInstruction: string): string {
    const text = extractPlainText(noteContent);
    return [
      "=== INSTRUCTIONS SYSTÈME ===",
      systemInstruction,
      "",
      "=== CONTENU DE LA NOTE ===",
      text || "(vide)",
    ].join("\n");
  },
};

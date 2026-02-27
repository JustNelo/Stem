import { z } from "zod";
import { safeInvoke } from "@/lib/tauri";
import { OllamaModelsSchema } from "@/types/schemas";
import { extractPlainText } from "@/lib/utils/text";
import { buildAIPrompt } from "@/lib/ai-prompts";
import { ChatResultSchema, type ChatMessage } from "@/services/ai-chat";

/**
 * AI service — single abstraction over Ollama IPC calls.
 * Uses ollama_chat (no tools) for simple prompt execution.
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
    return AIService.executeRawPrompt(prompt, model, ollamaUrl);
  },

  /**
   * Send a raw prompt directly to Ollama (used by slash commands).
   */
  async executeRawPrompt(
    prompt: string,
    model: string,
    ollamaUrl: string,
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: "Tu es un assistant intelligent. Réponds TOUJOURS en français sauf si l'utilisateur demande explicitement une autre langue. Utilise un style clair, structuré et pédagogique.",
      },
      { role: "user", content: prompt },
    ];

    const result = await safeInvoke("ollama_chat", ChatResultSchema, {
      messages,
      model,
      ollamaUrl,
      tools: null,
    });

    return result.content?.trim() || "Résultat vide.";
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

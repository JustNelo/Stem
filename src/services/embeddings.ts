import { z } from "zod";
import { safeInvoke, invokeVoid } from "@/lib/tauri";
import { SemanticResultArraySchema } from "@/types/schemas";
import { extractPlainText } from "@/lib/utils/text";
import type { SemanticResult } from "@/types";

/**
 * Embedding service — handles semantic search via Ollama embeddings.
 */
export const EmbeddingService = {
  /**
   * Generate and store an embedding for a note.
   * Extracts plain text from note content before sending.
   */
  async generateForNote(
    noteId: string,
    noteContent: string | null,
    model: string,
    ollamaUrl: string,
  ): Promise<void> {
    const text = extractPlainText(noteContent);
    if (!text.trim()) return;

    await invokeVoid("generate_embedding", {
      noteId,
      text,
      model,
      ollamaUrl,
    });
  },

  /**
   * Search for semantically similar notes given a query string.
   */
  async searchSimilar(
    query: string,
    model: string,
    ollamaUrl: string,
    limit = 5,
  ): Promise<SemanticResult[]> {
    if (!query.trim()) return [];

    return safeInvoke("search_similar_notes", SemanticResultArraySchema, {
      query,
      model,
      ollamaUrl,
      limit,
    });
  },

  /**
   * Delete the stored embedding for a note.
   */
  async deleteForNote(noteId: string): Promise<void> {
    await invokeVoid("delete_embedding", { noteId });
  },

  /**
   * Check if the embedding model is available via Ollama.
   */
  async checkModel(model: string, ollamaUrl: string): Promise<boolean> {
    try {
      const models = await safeInvoke(
        "get_ollama_models",
        z.array(z.string()),
        { ollamaUrl },
      );
      return models.some((m) => m.includes(model));
    } catch {
      return false;
    }
  },
};

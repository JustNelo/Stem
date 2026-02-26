import { tool } from "ai";
import { z } from "zod";
import { dispatchToolCall, type StoreCallbacks } from "@/services/ai-tools-dispatcher";

export interface AIToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIToolResult {
  tool: string;
  result: string;
  isError?: boolean;
}

/**
 * Builds the AI SDK tool map with Zod-validated inputs and integrated execute functions.
 * StoreCallbacks are injected so mutations (create/update/delete) update the UI in real time.
 *
 * Using tool() + Zod gives us:
 * - Input validation before execution (no more crashes on missing note_id)
 * - AI SDK's built-in repairToolCall for malformed inputs from small models
 * - Type-safe arguments in every execute() function
 */
export function buildTools(callbacks?: StoreCallbacks) {
  return {
    list_notes: tool({
      description: "Liste toutes les notes disponibles avec leur titre et date de modification. Utilise cet outil pour savoir quelles notes existent.",
      inputSchema: z.object({}),
      execute: async () => {
        const result = await dispatchToolCall({ name: "list_notes", arguments: {} }, callbacks);
        return result.result;
      },
    }),

    read_note: tool({
      description: "Lit le contenu complet d'une note par son ID. Utilise list_notes d'abord pour obtenir les IDs.",
      inputSchema: z.object({
        note_id: z.string().describe("L'identifiant unique de la note à lire"),
      }),
      execute: async ({ note_id }) => {
        const result = await dispatchToolCall({ name: "read_note", arguments: { note_id } }, callbacks);
        return result.result;
      },
    }),

    create_note: tool({
      description: "Crée une nouvelle note avec un titre et un contenu en Markdown. Le contenu doit être riche et détaillé : utilise des titres (## ###), listes (- ou 1.), blocs de code (```langage), **gras**, *italique*. Minimum 5-10 paragraphes pour un sujet technique.",
      inputSchema: z.object({
        title: z.string().describe("Le titre de la nouvelle note"),
        content: z.string().optional().describe("Le contenu complet en Markdown avec titres, listes, code blocks et mise en forme"),
      }),
      execute: async ({ title, content }) => {
        const result = await dispatchToolCall({ name: "create_note", arguments: { title, content } }, callbacks);
        return result.result;
      },
    }),

    update_note: tool({
      description: "Met à jour le titre ou le contenu d'une note existante. Le contenu doit être en Markdown riche.",
      inputSchema: z.object({
        note_id: z.string().describe("L'identifiant unique de la note à modifier"),
        title: z.string().optional().describe("Le nouveau titre"),
        content: z.string().optional().describe("Le nouveau contenu complet en Markdown avec titres, listes, code blocks et mise en forme"),
      }),
      execute: async ({ note_id, title, content }) => {
        const result = await dispatchToolCall({ name: "update_note", arguments: { note_id, title, content } }, callbacks);
        return result.result;
      },
    }),

    delete_note: tool({
      description: "Supprime définitivement une note par son ID.",
      inputSchema: z.object({
        note_id: z.string().describe("L'identifiant unique de la note à supprimer"),
      }),
      execute: async ({ note_id }) => {
        const result = await dispatchToolCall({ name: "delete_note", arguments: { note_id } }, callbacks);
        return result.result;
      },
    }),

    append_to_note: tool({
      description: "Ajoute du contenu Markdown à la fin d'une note existante SANS remplacer le contenu actuel. Utilise cet outil pour enrichir une note avec de nouvelles sections.",
      inputSchema: z.object({
        note_id: z.string().describe("L'identifiant unique de la note à enrichir"),
        content: z.string().describe("Le contenu Markdown à ajouter à la fin de la note"),
      }),
      execute: async ({ note_id, content }) => {
        const result = await dispatchToolCall({ name: "append_to_note", arguments: { note_id, content } }, callbacks);
        return result.result;
      },
    }),

    search_notes: tool({
      description: "Recherche des notes par mot-clé dans le titre et le contenu.",
      inputSchema: z.object({
        query: z.string().describe("Le terme de recherche"),
      }),
      execute: async ({ query }) => {
        const result = await dispatchToolCall({ name: "search_notes", arguments: { query } }, callbacks);
        return result.result;
      },
    }),
  };
}

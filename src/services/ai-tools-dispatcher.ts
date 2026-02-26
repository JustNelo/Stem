import { z } from "zod";
import { safeInvoke } from "@/lib/tauri";
import { NoteRepository } from "@/services/db";
import { NoteArraySchema } from "@/types/schemas";
import { extractPlainText } from "@/lib/utils/text";
import type { AIToolCall, AIToolResult } from "@/lib/ai-tools";

/**
 * Executes a tool call coming from the Ollama model.
 * Each tool maps directly to an existing Tauri IPC command or local store operation.
 */
export async function dispatchToolCall(call: AIToolCall): Promise<AIToolResult> {
  try {
    const result = await executeToolCall(call);
    return { tool: call.name, result };
  } catch (error) {
    return {
      tool: call.name,
      result: `Erreur lors de l'exécution de l'outil "${call.name}": ${error}`,
      isError: true,
    };
  }
}

async function executeToolCall(call: AIToolCall): Promise<string> {
  switch (call.name) {
    case "list_notes": {
      const notes = await safeInvoke("get_all_notes", NoteArraySchema);
      if (notes.length === 0) return "Aucune note trouvée.";
      return notes
        .map((n) => `- ID: ${n.id} | Titre: "${n.title}" | Modifié: ${new Date(n.updated_at * 1000).toLocaleDateString("fr-FR")}${n.is_pinned ? " 📌" : ""}`)
        .join("\n");
    }

    case "read_note": {
      const { note_id } = call.arguments as { note_id: string };
      if (!note_id) throw new Error("note_id est requis");
      const note = await NoteRepository.getById(note_id);
      if (!note) return `Aucune note trouvée avec l'ID "${note_id}".`;
      const plainText = extractPlainText(note.content);
      return `Titre: ${note.title}\n\nContenu:\n${plainText || "(vide)"}`;
    }

    case "create_note": {
      const { title, content } = call.arguments as { title: string; content?: string };
      if (!title) throw new Error("title est requis");
      const note = await NoteRepository.create(title, content ?? null);
      return `Note créée avec succès. ID: ${note.id}, Titre: "${note.title}"`;
    }

    case "update_note": {
      const { note_id, title, content } = call.arguments as {
        note_id: string;
        title?: string;
        content?: string;
      };
      if (!note_id) throw new Error("note_id est requis");
      if (!title && !content) throw new Error("Au moins title ou content est requis");
      const updates: { title?: string; content?: string } = {};
      if (title) updates.title = title;
      if (content) updates.content = content;
      await NoteRepository.update(note_id, updates);
      return `Note "${note_id}" mise à jour avec succès.`;
    }

    case "search_notes": {
      const { query } = call.arguments as { query: string };
      if (!query) throw new Error("query est requis");
      const allNotes = await safeInvoke("get_all_notes", NoteArraySchema, undefined);
      const lower = query.toLowerCase();
      const matches = allNotes.filter(
        (n) =>
          n.title.toLowerCase().includes(lower) ||
          extractPlainText(n.content).toLowerCase().includes(lower),
      );
      if (matches.length === 0) return `Aucune note trouvée pour "${query}".`;
      return matches
        .map((n) => `- ID: ${n.id} | Titre: "${n.title}"`)
        .join("\n");
    }

    default:
      throw new Error(`Outil inconnu: "${call.name}"`);
  }
}

/**
 * Parses tool calls from an Ollama response that includes function call data.
 * Ollama returns tool_calls as a JSON array in the message.
 */
export function parseToolCalls(rawResponse: string): AIToolCall[] | null {
  try {
    const parsed = z.array(
      z.object({
        function: z.object({
          name: z.string(),
          arguments: z.unknown(),
        }),
      }),
    ).parse(JSON.parse(rawResponse));

    return parsed.map((tc) => ({
      name: tc.function.name,
      arguments:
        typeof tc.function.arguments === "string"
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments,
    }));
  } catch {
    return null;
  }
}

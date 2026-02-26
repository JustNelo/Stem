import { safeInvoke } from "@/lib/tauri";
import { NoteRepository } from "@/services/db";
import { NoteArraySchema } from "@/types/schemas";
import { extractPlainText } from "@/lib/utils/text";
import { markdownToBlockNoteJson, parseBlockNoteContent } from "@/lib/utils/markdown-to-blocknote";
import type { Note } from "@/types";
import type { AIToolCall, AIToolResult } from "@/lib/ai-tools";

export interface StoreCallbacks {
  onNoteCreated: (note: Note) => void;
  onNoteUpdated: (note: Note) => void;
  onNoteDeleted: (id: string) => void;
}

/**
 * Executes a tool call coming from the Ollama model.
 * Mutations (create/update/delete) call storeCallbacks to keep the UI in sync.
 */
export async function dispatchToolCall(
  call: AIToolCall,
  callbacks?: StoreCallbacks,
): Promise<AIToolResult> {
  try {
    const result = await executeToolCall(call, callbacks);
    return { tool: call.name, result };
  } catch (error) {
    return {
      tool: call.name,
      result: `Erreur lors de l'exécution de l'outil "${call.name}": ${error}`,
      isError: true,
    };
  }
}

async function executeToolCall(
  call: AIToolCall,
  callbacks?: StoreCallbacks,
): Promise<string> {
  switch (call.name) {
    case "list_notes": {
      const notes = await safeInvoke("get_all_notes", NoteArraySchema);
      if (notes.length === 0) return "Aucune note trouvée.";
      return notes
        .map(
          (n) =>
            `- ID: ${n.id} | Titre: "${n.title}" | Modifié: ${new Date(n.updated_at * 1000).toLocaleDateString("fr-FR")}${n.is_pinned ? " 📌" : ""}`,
        )
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
      const blockNoteContent = content ? markdownToBlockNoteJson(content) : null;
      const note = await NoteRepository.create(title, blockNoteContent);
      callbacks?.onNoteCreated(note);
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
      if (content) updates.content = markdownToBlockNoteJson(content);
      const updated = await NoteRepository.update(note_id, updates);
      callbacks?.onNoteUpdated(updated);
      return `Note "${updated.title}" mise à jour avec succès.`;
    }

    case "delete_note": {
      const { note_id } = call.arguments as { note_id: string };
      if (!note_id) throw new Error("note_id est requis");
      await NoteRepository.delete(note_id);
      callbacks?.onNoteDeleted(note_id);
      return `Note supprimée avec succès.`;
    }

    case "append_to_note": {
      const { note_id, content } = call.arguments as { note_id: string; content: string };
      if (!note_id) throw new Error("note_id est requis");
      if (!content) throw new Error("content est requis");
      const existingNote = await NoteRepository.getById(note_id);
      if (!existingNote) return `Aucune note trouvée avec l'ID "${note_id}".`;
      const existingBlocks = parseBlockNoteContent(existingNote.content);
      const newBlocks = JSON.parse(markdownToBlockNoteJson(content));
      const merged = JSON.stringify([...existingBlocks, ...newBlocks]);
      const appended = await NoteRepository.update(note_id, { content: merged });
      callbacks?.onNoteUpdated(appended);
      return `Contenu ajouté à la note "${appended.title}" avec succès.`;
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
      return matches.map((n) => `- ID: ${n.id} | Titre: "${n.title}"`).join("\n");
    }

    default:
      throw new Error(`Outil inconnu: "${call.name}"`);
  }
}


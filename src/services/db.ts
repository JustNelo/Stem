import { safeInvoke, invokeVoid } from "@/lib/tauri";
import { NoteSchema, NoteArraySchema } from "@/types/schemas";
import type { Note } from "@/types";

/**
 * Repository pattern for Note data access.
 * Single abstraction layer over Tauri IPC calls.
 */
export const NoteRepository = {
  async getAll(): Promise<Note[]> {
    return safeInvoke("get_all_notes", NoteArraySchema);
  },

  async getById(id: string): Promise<Note | null> {
    return safeInvoke("get_note", NoteSchema.nullable(), { id });
  },

  async create(title = "Sans titre", content: string | null = null): Promise<Note> {
    return safeInvoke("create_note", NoteSchema, {
      payload: { title, content },
    });
  },

  async update(id: string, updates: { title?: string; content?: string }): Promise<Note> {
    return safeInvoke("update_note", NoteSchema, {
      payload: { id, ...updates },
    });
  },

  async delete(id: string): Promise<void> {
    return invokeVoid("delete_note", { id });
  },

  async togglePin(id: string): Promise<Note> {
    return safeInvoke("toggle_pin_note", NoteSchema, { id });
  },
};

/**
 * Export / Import operations.
 */
export const DataRepository = {
  async exportAll(): Promise<string> {
    return safeInvoke("export_all_data", (await import("zod")).z.string());
  },

  async importAll(data: string): Promise<string> {
    return safeInvoke("import_all_data", (await import("zod")).z.string(), { data });
  },
};

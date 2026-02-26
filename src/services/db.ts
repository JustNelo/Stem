import { z } from "zod";
import { safeInvoke, invokeVoid } from "@/lib/tauri";
import { NoteSchema, NoteArraySchema, FolderSchema, FolderArraySchema } from "@/types/schemas";
import type { Note, Folder } from "@/types";

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
 * Repository pattern for Folder data access.
 */
export const FolderRepository = {
  async getAll(): Promise<Folder[]> {
    return safeInvoke("get_all_folders", FolderArraySchema);
  },

  async create(name: string, parentId: string | null = null): Promise<Folder> {
    return safeInvoke("create_folder", FolderSchema, {
      payload: { name, parent_id: parentId },
    });
  },

  async rename(id: string, name: string): Promise<Folder> {
    return safeInvoke("rename_folder", FolderSchema, {
      payload: { id, name },
    });
  },

  async delete(id: string): Promise<void> {
    return invokeVoid("delete_folder", { id });
  },

  async moveNoteToFolder(noteId: string, folderId: string | null): Promise<Note> {
    return safeInvoke("move_note_to_folder", NoteSchema, {
      noteId,
      folderId,
    });
  },

  async moveFolder(id: string, parentId: string | null): Promise<Folder> {
    return safeInvoke("move_folder", FolderSchema, {
      id,
      parentId,
    });
  },
};

/**
 * Export / Import operations.
 */
export const DataRepository = {
  async exportAll(): Promise<string> {
    return safeInvoke("export_all_data", z.string());
  },

  async importAll(data: string): Promise<string> {
    return safeInvoke("import_all_data", z.string(), { data });
  },
};

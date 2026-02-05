import { invoke } from "@tauri-apps/api/core";
import type { Note, CreateNotePayload, UpdateNotePayload } from "@/types";

export async function initDatabase(): Promise<void> {
  return invoke("init_database");
}

export async function createNote(payload: CreateNotePayload): Promise<Note> {
  return invoke("create_note", { payload });
}

export async function getNote(id: string): Promise<Note | null> {
  return invoke("get_note", { id });
}

export async function getAllNotes(): Promise<Note[]> {
  return invoke("get_all_notes");
}

export async function updateNote(payload: UpdateNotePayload): Promise<Note> {
  return invoke("update_note", { payload });
}

export async function deleteNote(id: string): Promise<void> {
  return invoke("delete_note", { id });
}

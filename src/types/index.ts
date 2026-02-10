export interface Note {
  id: string;
  title: string;
  content: string | null;
  created_at: number;
  updated_at: number;
  is_pinned: boolean;
}

export interface CreateNotePayload {
  title?: string;
  content?: string;
}

export interface UpdateNotePayload {
  id: string;
  title?: string;
  content?: string;
}

export type SaveStatus = "idle" | "saving" | "saved";

export interface SemanticResult {
  note_id: string;
  title: string;
  score: number;
}

export type GitSyncStatus = "idle" | "syncing" | "synced" | "error";

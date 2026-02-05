export interface Note {
  id: string;
  title: string;
  content: string | null;
  created_at: number;
  updated_at: number;
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

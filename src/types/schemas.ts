import { z } from "zod";

// ===== Note schemas =====

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
  is_pinned: z.boolean(),
  folder_id: z.string().nullable(),
});

export const NoteArraySchema = z.array(NoteSchema);

// ===== Folder schemas =====

export const FolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  parent_id: z.string().nullable(),
  position: z.number(),
  created_at: z.number(),
});

export const FolderArraySchema = z.array(FolderSchema);

// ===== Ollama schemas =====

export const OllamaModelsSchema = z.array(z.string());

// ===== Semantic search schemas =====

export const SemanticResultSchema = z.object({
  note_id: z.string(),
  title: z.string(),
  score: z.number(),
});

export const SemanticResultArraySchema = z.array(SemanticResultSchema);

// ===== Input validation schemas =====

export const OllamaUrlSchema = z
  .string()
  .trim()
  .url("URL invalide")
  .refine((url) => url.startsWith("http://") || url.startsWith("https://"), {
    message: "L'URL doit commencer par http:// ou https://",
  });

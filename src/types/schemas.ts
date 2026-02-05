import { z } from "zod";

// ===== Note schemas =====

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
  is_pinned: z.boolean(),
});

export const NoteArraySchema = z.array(NoteSchema);

// ===== Tag schemas =====

export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
});

export const TagArraySchema = z.array(TagSchema);

// Batch: [noteId, Tag][]
export const NoteTagPairsSchema = z.array(z.tuple([z.string(), TagSchema]));

// ===== Ollama schemas =====

export const OllamaModelsSchema = z.array(z.string());

// ===== Input validation schemas =====

export const OllamaUrlSchema = z
  .string()
  .trim()
  .url("URL invalide")
  .refine((url) => url.startsWith("http://") || url.startsWith("https://"), {
    message: "L'URL doit commencer par http:// ou https://",
  });

export const TagNameSchema = z
  .string()
  .trim()
  .min(1, "Le nom du tag ne peut pas être vide")
  .max(30, "Le nom du tag ne peut pas dépasser 30 caractères");

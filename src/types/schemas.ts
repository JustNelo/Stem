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

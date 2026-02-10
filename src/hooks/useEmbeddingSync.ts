import { useEffect, useRef } from "react";
import { useNotesStore } from "@/store/useNotesStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { EmbeddingService } from "@/services/embeddings";

const EMBEDDING_DEBOUNCE_MS = 5000; // 5s after last save

/**
 * Watches the selected note's content and generates embeddings
 * after a debounced delay following saves.
 * Runs silently in the background — errors are logged, never thrown.
 */
export function useEmbeddingSync() {
  const selectedNote = useNotesStore((s) => s.selectedNote);
  const embeddingModel = useSettingsStore((s) => s.embeddingModel);
  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!selectedNote?.id || !selectedNote.content) return;

    // Clear any pending embedding generation
    if (timerRef.current) clearTimeout(timerRef.current);

    const noteId = selectedNote.id;
    const noteContent = selectedNote.content;

    timerRef.current = setTimeout(() => {
      EmbeddingService.generateForNote(noteId, noteContent, embeddingModel, ollamaUrl).catch(
        (err) => console.debug("[embedding] Generation skipped:", err),
      );
    }, EMBEDDING_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [selectedNote?.id, selectedNote?.updated_at, embeddingModel, ollamaUrl]);
}

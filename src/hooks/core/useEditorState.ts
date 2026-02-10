import { useState, useEffect, useRef, useCallback } from "react";
import { useNotesStore } from "@/store/useNotesStore";
import { useAutoSave } from "@/hooks/useAutoSave";

/**
 * Manages editor-related state:
 * - Local title with debounced save
 * - Content auto-save wiring
 */
export function useEditorState() {
  const selectedNote = useNotesStore((s) => s.selectedNote);
  const updateNote = useNotesStore((s) => s.updateNote);

  // Local title state to avoid re-rendering the whole tree on each keystroke
  const [localTitle, setLocalTitle] = useState("");
  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local title only when switching to a different note
  useEffect(() => {
    setLocalTitle(selectedNote?.title || "");
    return () => {
      if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
    };
  }, [selectedNote?.id]);

  // Title change with debounced save
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedNote) return;
      const value = e.target.value;
      const noteId = selectedNote.id;
      setLocalTitle(value);
      if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
      titleSaveTimer.current = setTimeout(() => {
        updateNote(noteId, { title: value });
      }, 400);
    },
    [selectedNote, updateNote]
  );

  // Content auto-save
  const handleSaveContent = useCallback(
    async (content: string) => {
      if (!selectedNote) return;
      await updateNote(selectedNote.id, { content });
    },
    [selectedNote, updateNote]
  );

  const { status: saveStatus, save: triggerSave } = useAutoSave({
    onSave: handleSaveContent,
  });

  const handleContentChange = useCallback(
    (content: string) => {
      triggerSave(content);
    },
    [triggerSave]
  );

  return {
    localTitle,
    selectedNote,
    handleTitleChange,
    handleContentChange,
    saveStatus,
  };
}

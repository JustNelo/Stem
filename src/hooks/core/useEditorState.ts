import { useState, useEffect, useRef, useCallback } from "react";
import { useNotesStore } from "@/store/useNotesStore";
import { useAutoSave } from "@/hooks/useAutoSave";

export type View = "home" | "editor";

/**
 * Manages editor-related state:
 * - View routing (synced with selectedNote)
 * - Settings toggle
 * - Local title with debounced save
 * - Content auto-save wiring
 * - Navigation (handleBack)
 */
export function useEditorState() {
  const selectedNote = useNotesStore((s) => s.selectedNote);
  const updateNote = useNotesStore((s) => s.updateNote);
  const selectNote = useNotesStore((s) => s.selectNote);

  const [view, setView] = useState<View>("home");
  const [showSettings, setShowSettings] = useState(false);

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

  // Sync view with selected note
  useEffect(() => {
    if (selectedNote) {
      setView("editor");
    } else {
      setView("home");
    }
  }, [selectedNote]);

  // Navigation
  const handleBack = useCallback(() => {
    setView("home");
    selectNote(null);
  }, [selectNote]);

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
    view,
    showSettings,
    setShowSettings,
    localTitle,
    selectedNote,
    handleBack,
    handleTitleChange,
    handleContentChange,
    saveStatus,
  };
}

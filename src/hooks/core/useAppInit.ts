import { useState, useEffect, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useNotesStore } from "@/store/useNotesStore";
import { useFoldersStore } from "@/store/useFoldersStore";

/**
 * Handles one-time app initialization:
 * - Fetches notes and folders on mount
 * - Detects quick-capture window
 * - Listens for "refresh-notes" Tauri event
 * - Provides quick-capture save handler
 */
export function useAppInit() {
  const fetchNotes = useNotesStore((s) => s.fetchNotes);
  const createNote = useNotesStore((s) => s.createNote);
  const updateNote = useNotesStore((s) => s.updateNote);
  const fetchFolders = useFoldersStore((s) => s.fetchFolders);

  const [isQuickCapture, setIsQuickCapture] = useState(false);

  // Fetch notes and folders on mount
  useEffect(() => {
    fetchNotes();
    fetchFolders();
  }, [fetchNotes, fetchFolders]);

  // Detect quick-capture window
  useEffect(() => {
    const appWindow = getCurrentWindow();
    if (appWindow.label === "quick-capture") {
      setIsQuickCapture(true);
    }
  }, []);

  // Listen for refresh-notes event from Quick Capture window
  useEffect(() => {
    const appWindow = getCurrentWindow();
    let unlistenFn: (() => void) | null = null;

    appWindow
      .listen("refresh-notes", () => {
        fetchNotes();
      })
      .then((fn) => {
        unlistenFn = fn;
      });

    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, [fetchNotes]);

  // Quick capture save handler
  const handleQuickCaptureSave = useCallback(
    async (content: string) => {
      try {
        const note = await createNote();
        if (!note) {
          console.error("Failed to create note for quick capture");
          return;
        }
        await updateNote(note.id, {
          title: content.split("\n")[0].slice(0, 50) || "Quick note",
          content: JSON.stringify([
            {
              type: "paragraph",
              content: [{ type: "text", text: content }],
            },
          ]),
        });
      } catch (error) {
        console.error("Error saving quick capture:", error);
      }
    },
    [createNote, updateNote]
  );

  return { isQuickCapture, handleQuickCaptureSave };
}

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Note } from "../types";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    try {
      const allNotes = await invoke<Note[]>("get_all_notes");
      setNotes(allNotes);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = useCallback(async () => {
    try {
      const newNote = await invoke<Note>("create_note", {
        payload: { title: "Sans titre", content: null },
      });
      setNotes((prev) => [newNote, ...prev]);
      setSelectedNote(newNote);
      return newNote;
    } catch (error) {
      console.error("Failed to create note:", error);
      return null;
    }
  }, []);

  const updateNote = useCallback(
    async (id: string, updates: { title?: string; content?: string }) => {
      try {
        const updatedNote = await invoke<Note>("update_note", {
          payload: { id, ...updates },
        });
        setNotes((prev) =>
          prev.map((note) => (note.id === id ? updatedNote : note))
        );
        if (selectedNote?.id === id) {
          setSelectedNote(updatedNote);
        }
        return updatedNote;
      } catch (error) {
        console.error("Failed to update note:", error);
        return null;
      }
    },
    [selectedNote]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      try {
        await invoke("delete_note", { id });
        setNotes((prev) => prev.filter((note) => note.id !== id));
        if (selectedNote?.id === id) {
          setSelectedNote(null);
        }
      } catch (error) {
        console.error("Failed to delete note:", error);
      }
    },
    [selectedNote]
  );

  const selectNote = useCallback((note: Note | null) => {
    setSelectedNote(note);
  }, []);

  return {
    notes,
    selectedNote,
    isLoading,
    createNote,
    updateNote,
    deleteNote,
    selectNote,
    refreshNotes: fetchNotes,
  };
}

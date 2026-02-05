import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Note } from "@/types";

interface NotesState {
  notes: Note[];
  selectedNote: Note | null;
  isLoading: boolean;
  
  // Actions
  fetchNotes: () => Promise<void>;
  createNote: () => Promise<Note | null>;
  updateNote: (id: string, updates: { title?: string; content?: string }) => Promise<Note | null>;
  deleteNote: (id: string) => Promise<void>;
  selectNote: (note: Note | null) => void;
}

export const useNotesStore = create<NotesState>((set) => ({
  notes: [],
  selectedNote: null,
  isLoading: true,

  fetchNotes: async () => {
    set({ isLoading: true });
    try {
      const notes = await invoke<Note[]>("get_all_notes");
      set({ notes, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch notes:", error);
      set({ isLoading: false });
    }
  },

  createNote: async () => {
    try {
      const newNote = await invoke<Note>("create_note", {
        payload: { title: "Sans titre", content: null },
      });
      set((state) => ({ 
        notes: [newNote, ...state.notes],
        selectedNote: newNote 
      }));
      return newNote;
    } catch (error) {
      console.error("Failed to create note:", error);
      return null;
    }
  },

  updateNote: async (id, updates) => {
    try {
      const updatedNote = await invoke<Note>("update_note", {
        payload: { id, ...updates },
      });
      
      set((state) => ({
        notes: state.notes.map((note) => (note.id === id ? updatedNote : note)),
        selectedNote: state.selectedNote?.id === id ? updatedNote : state.selectedNote,
      }));
      
      return updatedNote;
    } catch (error) {
      console.error("Failed to update note:", error);
      return null;
    }
  },

  deleteNote: async (id) => {
    try {
      await invoke("delete_note", { id });
      set((state) => {
        const remainingNotes = state.notes.filter((note) => note.id !== id);
        const wasSelected = state.selectedNote?.id === id;
        
        let newSelectedNote = state.selectedNote;
        if (wasSelected) {
          // Sort by date (most recent first) to match UI behavior
          const sortedNotes = [...remainingNotes].sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
          newSelectedNote = sortedNotes.length > 0 ? sortedNotes[0] : null;
        }
        
        return {
          notes: remainingNotes,
          selectedNote: newSelectedNote,
        };
      });
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  },

  selectNote: (note) => {
    set({ selectedNote: note });
  },

}));

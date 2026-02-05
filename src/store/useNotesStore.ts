import { create } from "zustand";
import { safeInvoke, invokeVoid } from "@/lib/tauri";
import { NoteSchema, NoteArraySchema } from "@/types/schemas";
import type { Note } from "@/types";

const toast = (msg: string, type: "success" | "error" | "info" = "success") => {
  // Dynamic import to avoid circular deps at module level
  import("@/store/useToastStore").then(({ useToastStore }) => {
    useToastStore.getState().addToast(msg, type);
  });
};

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
  togglePin: (id: string) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set) => ({
  notes: [],
  selectedNote: null,
  isLoading: true,

  fetchNotes: async () => {
    set({ isLoading: true });
    try {
      const notes = await safeInvoke("get_all_notes", NoteArraySchema);
      set({ notes, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch notes:", error);
      toast("Impossible de charger les notes", "error");
      set({ isLoading: false });
    }
  },

  createNote: async () => {
    try {
      const newNote = await safeInvoke("create_note", NoteSchema, {
        payload: { title: "Sans titre", content: null },
      });
      set((state) => ({ 
        notes: [newNote, ...state.notes],
        selectedNote: newNote 
      }));
      toast("Note créée");
      return newNote;
    } catch (error) {
      console.error("Failed to create note:", error);
      toast("Impossible de créer la note", "error");
      return null;
    }
  },

  updateNote: async (id, updates) => {
    try {
      const updatedNote = await safeInvoke("update_note", NoteSchema, {
        payload: { id, ...updates },
      });
      
      set((state) => ({
        notes: state.notes.map((note) => (note.id === id ? updatedNote : note)),
        selectedNote: state.selectedNote?.id === id ? updatedNote : state.selectedNote,
      }));
      
      return updatedNote;
    } catch (error) {
      console.error("Failed to update note:", error);
      toast("Impossible de sauvegarder la note", "error");
      return null;
    }
  },

  deleteNote: async (id) => {
    try {
      await invokeVoid("delete_note", { id });
      set((state) => {
        const remainingNotes = state.notes.filter((note) => note.id !== id);
        const wasSelected = state.selectedNote?.id === id;
        
        let newSelectedNote = state.selectedNote;
        if (wasSelected) {
          const sortedNotes = [...remainingNotes].sort((a, b) => b.updated_at - a.updated_at);
          newSelectedNote = sortedNotes.length > 0 ? sortedNotes[0] : null;
        }
        
        return {
          notes: remainingNotes,
          selectedNote: newSelectedNote,
        };
      });
      toast("Note supprimée");
    } catch (error) {
      console.error("Failed to delete note:", error);
      toast("Impossible de supprimer la note", "error");
    }
  },

  selectNote: (note) => {
    set({ selectedNote: note });
  },

  togglePin: async (id) => {
    try {
      const updatedNote = await safeInvoke("toggle_pin_note", NoteSchema, { id });
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? updatedNote : n)),
        selectedNote: state.selectedNote?.id === id ? updatedNote : state.selectedNote,
      }));
      toast(updatedNote.is_pinned ? "Note épinglée" : "Note désépinglée");
    } catch (error) {
      console.error("Failed to toggle pin:", error);
      toast("Impossible d'épingler la note", "error");
    }
  },

}));

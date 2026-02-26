import { create } from "zustand";
import { FolderRepository } from "@/services/db";
import type { Folder } from "@/types";

const toast = (msg: string, type: "success" | "error" | "info" = "success") => {
  import("@/store/useToastStore").then(({ useToastStore }) => {
    useToastStore.getState().addToast(msg, type);
  });
};

interface FoldersState {
  folders: Folder[];
  expandedFolders: Set<string>;

  fetchFolders: () => Promise<void>;
  createFolder: (name: string, parentId?: string | null) => Promise<Folder | null>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  toggleExpanded: (id: string) => void;
}

export const useFoldersStore = create<FoldersState>((set) => ({
  folders: [],
  expandedFolders: new Set<string>(),

  fetchFolders: async () => {
    try {
      const folders = await FolderRepository.getAll();
      set({ folders });
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    }
  },

  createFolder: async (name, parentId = null) => {
    try {
      const folder = await FolderRepository.create(name, parentId);
      set((state) => ({
        folders: [...state.folders, folder],
        expandedFolders: parentId
          ? new Set([...state.expandedFolders, parentId])
          : state.expandedFolders,
      }));
      toast("Dossier créé");
      return folder;
    } catch (error) {
      console.error("Failed to create folder:", error);
      toast("Impossible de créer le dossier", "error");
      return null;
    }
  },

  renameFolder: async (id, name) => {
    try {
      const updated = await FolderRepository.rename(id, name);
      set((state) => ({
        folders: state.folders.map((f) => (f.id === id ? updated : f)),
      }));
    } catch (error) {
      console.error("Failed to rename folder:", error);
      toast("Impossible de renommer le dossier", "error");
    }
  },

  deleteFolder: async (id) => {
    try {
      await FolderRepository.delete(id);
      set((state) => ({
        folders: state.folders.filter((f) => f.id !== id),
      }));
      toast("Dossier supprimé");
    } catch (error) {
      console.error("Failed to delete folder:", error);
      toast("Impossible de supprimer le dossier", "error");
    }
  },

  toggleExpanded: (id) => {
    set((state) => {
      const next = new Set(state.expandedFolders);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { expandedFolders: next };
    });
  },
}));

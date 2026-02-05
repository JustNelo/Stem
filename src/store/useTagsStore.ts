import { create } from "zustand";
import { safeInvoke, invokeVoid } from "@/lib/tauri";
import { TagSchema, TagArraySchema, NoteTagPairsSchema } from "@/types/schemas";
import type { Tag, CreateTagPayload } from "@/types/tag";

const toast = (msg: string, type: "success" | "error" | "info" = "success") => {
  import("@/store/useToastStore").then(({ useToastStore }) => {
    useToastStore.getState().addToast(msg, type);
  });
};

interface TagsState {
  tags: Tag[];
  noteTagsCache: Record<string, Tag[]>;
  isLoading: boolean;
  tagsInitialized: boolean;

  // Actions
  fetchTags: (force?: boolean) => Promise<void>;
  createTag: (payload: CreateTagPayload) => Promise<Tag | null>;
  updateTag: (id: string, name: string, color: string) => Promise<Tag | null>;
  deleteTag: (id: string) => Promise<void>;
  addTagToNote: (noteId: string, tagId: string) => Promise<void>;
  removeTagFromNote: (noteId: string, tagId: string) => Promise<void>;
  getTagsForNote: (noteId: string) => Promise<Tag[]>;
  fetchAllNoteTags: () => Promise<void>;
}

export const useTagsStore = create<TagsState>((set, get) => ({
  tags: [],
  noteTagsCache: {},
  isLoading: false,
  tagsInitialized: false,

  fetchTags: async (force = false) => {
    if (get().tagsInitialized && !force) return;
    set({ isLoading: true });
    try {
      const tags = await safeInvoke("get_all_tags", TagArraySchema);
      set({ tags, isLoading: false, tagsInitialized: true });
    } catch (error) {
      console.error("Failed to fetch tags:", error);
      toast("Impossible de charger les tags", "error");
      set({ isLoading: false });
    }
  },

  createTag: async (payload) => {
    try {
      const newTag = await safeInvoke("create_tag", TagSchema, { payload });
      set((state) => ({ tags: [...state.tags, newTag].sort((a, b) => a.name.localeCompare(b.name)) }));
      return newTag;
    } catch (error) {
      console.error("Failed to create tag:", error);
      toast("Impossible de créer le tag", "error");
      return null;
    }
  },

  updateTag: async (id, name, color) => {
    try {
      const updated = await safeInvoke("update_tag", TagSchema, { id, name, color });
      set((state) => ({
        tags: state.tags.map((t) => (t.id === id ? updated : t)),
        noteTagsCache: Object.fromEntries(
          Object.entries(state.noteTagsCache).map(([noteId, tags]) => [
            noteId,
            tags.map((t) => (t.id === id ? updated : t)),
          ])
        ),
      }));
      return updated;
    } catch (error) {
      console.error("Failed to update tag:", error);
      toast("Impossible de modifier le tag", "error");
      return null;
    }
  },

  deleteTag: async (id) => {
    try {
      await invokeVoid("delete_tag", { id });
      set((state) => ({
        tags: state.tags.filter((t) => t.id !== id),
        noteTagsCache: Object.fromEntries(
          Object.entries(state.noteTagsCache).map(([noteId, tags]) => [
            noteId,
            tags.filter((t) => t.id !== id),
          ])
        ),
      }));
    } catch (error) {
      console.error("Failed to delete tag:", error);
      toast("Impossible de supprimer le tag", "error");
    }
  },

  addTagToNote: async (noteId, tagId) => {
    try {
      await invokeVoid("add_tag_to_note", { noteId, tagId });
      const tag = get().tags.find((t) => t.id === tagId);
      if (tag) {
        set((state) => {
          const existing = state.noteTagsCache[noteId] || [];
          if (existing.some((t) => t.id === tagId)) return state;
          return {
            noteTagsCache: {
              ...state.noteTagsCache,
              [noteId]: [...existing, tag],
            },
          };
        });
      }
    } catch (error) {
      console.error("Failed to add tag to note:", error);
      toast("Impossible d'ajouter le tag", "error");
    }
  },

  removeTagFromNote: async (noteId, tagId) => {
    try {
      await invokeVoid("remove_tag_from_note", { noteId, tagId });
      set((state) => ({
        noteTagsCache: {
          ...state.noteTagsCache,
          [noteId]: (state.noteTagsCache[noteId] || []).filter((t) => t.id !== tagId),
        },
      }));
    } catch (error) {
      console.error("Failed to remove tag from note:", error);
      toast("Impossible de retirer le tag", "error");
    }
  },

  getTagsForNote: async (noteId) => {
    try {
      const tags = await safeInvoke("get_tags_for_note", TagArraySchema, { noteId });
      set((state) => ({
        noteTagsCache: { ...state.noteTagsCache, [noteId]: tags },
      }));
      return tags;
    } catch (error) {
      console.error("Failed to get tags for note:", error);
      return [];
    }
  },

  fetchAllNoteTags: async () => {
    try {
      const pairs = await safeInvoke("get_all_note_tags", NoteTagPairsSchema);
      const cache: Record<string, Tag[]> = {};
      for (const [noteId, tag] of pairs) {
        (cache[noteId] ??= []).push(tag);
      }
      set({ noteTagsCache: cache });
    } catch (error) {
      console.error("Failed to fetch all note tags:", error);
    }
  },
}));

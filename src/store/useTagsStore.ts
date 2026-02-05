import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Tag, CreateTagPayload } from "@/types/tag";

interface TagsState {
  tags: Tag[];
  noteTagsCache: Record<string, Tag[]>;
  isLoading: boolean;

  // Actions
  fetchTags: () => Promise<void>;
  createTag: (payload: CreateTagPayload) => Promise<Tag | null>;
  updateTag: (id: string, name: string, color: string) => Promise<Tag | null>;
  deleteTag: (id: string) => Promise<void>;
  addTagToNote: (noteId: string, tagId: string) => Promise<void>;
  removeTagFromNote: (noteId: string, tagId: string) => Promise<void>;
  getTagsForNote: (noteId: string) => Promise<Tag[]>;
}

export const useTagsStore = create<TagsState>((set, get) => ({
  tags: [],
  noteTagsCache: {},
  isLoading: false,

  fetchTags: async () => {
    set({ isLoading: true });
    try {
      const tags = await invoke<Tag[]>("get_all_tags");
      set({ tags, isLoading: false });
    } catch (error) {
      console.error("Failed to fetch tags:", error);
      set({ isLoading: false });
    }
  },

  createTag: async (payload) => {
    try {
      const newTag = await invoke<Tag>("create_tag", { payload });
      set((state) => ({ tags: [...state.tags, newTag].sort((a, b) => a.name.localeCompare(b.name)) }));
      return newTag;
    } catch (error) {
      console.error("Failed to create tag:", error);
      return null;
    }
  },

  updateTag: async (id, name, color) => {
    try {
      const updated = await invoke<Tag>("update_tag", { id, name, color });
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
      return null;
    }
  },

  deleteTag: async (id) => {
    try {
      await invoke("delete_tag", { id });
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
    }
  },

  addTagToNote: async (noteId, tagId) => {
    try {
      await invoke("add_tag_to_note", { noteId, tagId });
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
    }
  },

  removeTagFromNote: async (noteId, tagId) => {
    try {
      await invoke("remove_tag_from_note", { noteId, tagId });
      set((state) => ({
        noteTagsCache: {
          ...state.noteTagsCache,
          [noteId]: (state.noteTagsCache[noteId] || []).filter((t) => t.id !== tagId),
        },
      }));
    } catch (error) {
      console.error("Failed to remove tag from note:", error);
    }
  },

  getTagsForNote: async (noteId) => {
    try {
      const tags = await invoke<Tag[]>("get_tags_for_note", { noteId });
      set((state) => ({
        noteTagsCache: { ...state.noteTagsCache, [noteId]: tags },
      }));
      return tags;
    } catch (error) {
      console.error("Failed to get tags for note:", error);
      return [];
    }
  },
}));

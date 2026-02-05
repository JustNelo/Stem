import { useState, useMemo } from "react";
import { useNotesStore } from "@/store/useNotesStore";
import { useTagsStore } from "@/store/useTagsStore";
import type { Note } from "@/types";

export type SortBy = "date" | "title";

/**
 * Handles notes filtering (by tag) and sorting (by date or title),
 * then splits results into pinned / unpinned groups.
 */
export function useNotesFilter() {
  const notes = useNotesStore((s) => s.notes);
  const noteTagsCache = useTagsStore((s) => s.noteTagsCache);

  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [filterTagId, setFilterTagId] = useState<string | null>(null);

  const { pinned, unpinned } = useMemo(() => {
    const filtered = notes
      .filter((note) => {
        if (!filterTagId) return true;
        const noteTags = noteTagsCache[note.id] || [];
        return noteTags.some((t) => t.id === filterTagId);
      })
      .sort((a, b) => {
        if (sortBy === "title") {
          return (a.title || "Sans titre").localeCompare(b.title || "Sans titre");
        }
        return b.updated_at - a.updated_at;
      });

    const pinnedNotes: Note[] = [];
    const unpinnedNotes: Note[] = [];
    for (const note of filtered) {
      if (note.is_pinned) {
        pinnedNotes.push(note);
      } else {
        unpinnedNotes.push(note);
      }
    }

    return { pinned: pinnedNotes, unpinned: unpinnedNotes };
  }, [notes, noteTagsCache, filterTagId, sortBy]);

  const toggleSort = () => {
    setSortBy((prev) => (prev === "date" ? "title" : "date"));
  };

  return {
    notes,
    pinned,
    unpinned,
    sortBy,
    toggleSort,
    filterTagId,
    setFilterTagId,
  };
}

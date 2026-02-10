import { useState, useMemo } from "react";
import { useNotesStore } from "@/store/useNotesStore";
import type { Note } from "@/types";

export type SortBy = "date" | "title";

/**
 * Handles notes sorting (by date or title) and local search filter,
 * then splits results into pinned / unpinned groups.
 */
export function useNotesFilter() {
  const notes = useNotesStore((s) => s.notes);

  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [searchQuery, setSearchQuery] = useState("");

  const { pinned, unpinned, filtered } = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const sorted = [...notes]
      .filter((note) => {
        if (!q) return true;
        return (note.title || "").toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sortBy === "title") {
          return (a.title || "Sans titre").localeCompare(b.title || "Sans titre");
        }
        return b.updated_at - a.updated_at;
      });

    const pinnedNotes: Note[] = [];
    const unpinnedNotes: Note[] = [];
    for (const note of sorted) {
      if (note.is_pinned) {
        pinnedNotes.push(note);
      } else {
        unpinnedNotes.push(note);
      }
    }

    return { pinned: pinnedNotes, unpinned: unpinnedNotes, filtered: sorted };
  }, [notes, searchQuery, sortBy]);

  const toggleSort = () => {
    setSortBy((prev) => (prev === "date" ? "title" : "date"));
  };

  return {
    notes,
    filtered,
    pinned,
    unpinned,
    sortBy,
    toggleSort,
    searchQuery,
    setSearchQuery,
  };
}

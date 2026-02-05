import { useState, useRef, useEffect, useMemo } from "react";
import { useNotesStore } from "@/store/useNotesStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useTagsStore } from "@/store/useTagsStore";
import { extractPlainText } from "@/lib/utils/text";
import type { Note } from "@/types";

export function useCommandPalette() {
  const notes = useNotesStore((s) => s.notes);
  const selectNote = useNotesStore((s) => s.selectNote);
  const createNote = useNotesStore((s) => s.createNote);
  const isLoading = useNotesStore((s) => s.isLoading);
  const userName = useSettingsStore((s) => s.userName);
  const noteTagsCache = useTagsStore((s) => s.noteTagsCache);
  const fetchTags = useTagsStore((s) => s.fetchTags);
  const fetchAllNoteTags = useTagsStore((s) => s.fetchAllNoteTags);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch tags + all note-tag associations on mount
  useEffect(() => {
    fetchTags();
    fetchAllNoteTags();
  }, [fetchTags, fetchAllNoteTags]);

  const filteredNotes = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return notes;

    // Tag filter: #tagname
    if (q.startsWith("#")) {
      const tagQuery = q.slice(1);
      return notes.filter((note) => {
        const noteTags = noteTagsCache[note.id] || [];
        return noteTags.some((t) => t.name.toLowerCase().includes(tagQuery));
      });
    }

    // Full-text search: title + content
    return notes.filter((note) => {
      const titleMatch = (note.title || "").toLowerCase().includes(q);
      if (titleMatch) return true;
      return extractPlainText(note.content).toLowerCase().includes(q);
    });
  }, [notes, query, noteTagsCache]);

  const totalItems = filteredNotes.length;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-note-item]");
    items[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setQuery("");
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % totalItems);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + totalItems) % totalItems);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex < filteredNotes.length) {
          selectNote(filteredNotes[selectedIndex]);
        }
      }
      if (e.key === "n" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        createNote();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredNotes, selectedIndex, totalItems, selectNote, createNote]);

  const handleSelectNote = (note: Note) => selectNote(note);

  return {
    query,
    setQuery,
    selectedIndex,
    inputRef,
    listRef,
    filteredNotes,
    isLoading,
    userName,
    handleSelectNote,
  };
}

import { useState, useRef, useEffect, useMemo } from "react";
import Fuse from "fuse.js";
import { useNotesStore } from "@/store/useNotesStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useAppStore } from "@/store/useAppStore";
import { extractPlainText } from "@/lib/utils/text";
import type { Note } from "@/types";

interface SearchableNote extends Note {
  plainContent: string;
}

export function useCommandPalette() {
  const notes = useNotesStore((s) => s.notes);
  const selectNote = useNotesStore((s) => s.selectNote);
  const createNote = useNotesStore((s) => s.createNote);
  const isLoading = useNotesStore((s) => s.isLoading);
  const userName = useSettingsStore((s) => s.userName);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build searchable notes with extracted plain text (memoized)
  const searchableNotes = useMemo<SearchableNote[]>(
    () =>
      notes.map((note) => ({
        ...note,
        plainContent: extractPlainText(note.content),
      })),
    [notes],
  );

  // Configure Fuse.js with weighted keys
  const fuse = useMemo(
    () =>
      new Fuse(searchableNotes, {
        keys: [
          { name: "title", weight: 0.7 },
          { name: "plainContent", weight: 0.3 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
        includeScore: true,
      }),
    [searchableNotes],
  );

  const filteredNotes = useMemo(() => {
    const q = query.trim();
    if (!q) return notes;
    return fuse.search(q).map((result) => result.item as Note);
  }, [notes, query, fuse]);

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
        setCommandPaletteOpen(false);
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
          setCommandPaletteOpen(false);
        }
      }
      if (e.key === "n" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        createNote();
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredNotes, selectedIndex, totalItems, selectNote, createNote, setCommandPaletteOpen]);

  const handleSelectNote = (note: Note) => {
    selectNote(note);
    setCommandPaletteOpen(false);
  };

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

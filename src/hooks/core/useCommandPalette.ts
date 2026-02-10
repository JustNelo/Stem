import { useState, useRef, useEffect, useMemo } from "react";
import Fuse from "fuse.js";
import { useNotesStore } from "@/store/useNotesStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useAppStore } from "@/store/useAppStore";
import { EmbeddingService } from "@/services/embeddings";
import { extractPlainText } from "@/lib/utils/text";
import type { Note, SemanticResult } from "@/types";

interface SearchableNote extends Note {
  plainContent: string;
}

const SEMANTIC_DEBOUNCE_MS = 600;

export function useCommandPalette() {
  const notes = useNotesStore((s) => s.notes);
  const selectNote = useNotesStore((s) => s.selectNote);
  const createNote = useNotesStore((s) => s.createNote);
  const isLoading = useNotesStore((s) => s.isLoading);
  const userName = useSettingsStore((s) => s.userName);
  const embeddingModel = useSettingsStore((s) => s.embeddingModel);
  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [semanticResults, setSemanticResults] = useState<SemanticResult[]>([]);
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const semanticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Debounced semantic search — fires after typing pauses
  useEffect(() => {
    if (semanticTimerRef.current) clearTimeout(semanticTimerRef.current);

    const q = query.trim();
    if (!q || q.length < 3) {
      setSemanticResults([]);
      setIsSearchingSemantic(false);
      return;
    }

    setIsSearchingSemantic(true);
    semanticTimerRef.current = setTimeout(() => {
      EmbeddingService.searchSimilar(q, embeddingModel, ollamaUrl, 5)
        .then((results) => {
          // Exclude notes already in keyword results
          const keywordIds = new Set(filteredNotes.map((n) => n.id));
          setSemanticResults(results.filter((r) => !keywordIds.has(r.note_id)));
        })
        .catch(() => setSemanticResults([]))
        .finally(() => setIsSearchingSemantic(false));
    }, SEMANTIC_DEBOUNCE_MS);

    return () => {
      if (semanticTimerRef.current) clearTimeout(semanticTimerRef.current);
    };
  }, [query, embeddingModel, ollamaUrl, filteredNotes]);

  const totalItems = filteredNotes.length + semanticResults.length;

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

  // Find the note for a given combined index (keyword + semantic)
  const getNoteAtIndex = (index: number): Note | null => {
    if (index < filteredNotes.length) {
      return filteredNotes[index];
    }
    const semanticIndex = index - filteredNotes.length;
    if (semanticIndex < semanticResults.length) {
      const result = semanticResults[semanticIndex];
      return notes.find((n) => n.id === result.note_id) || null;
    }
    return null;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setQuery("");
        setCommandPaletteOpen(false);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (totalItems > 0 ? (i + 1) % totalItems : 0));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (totalItems > 0 ? (i - 1 + totalItems) % totalItems : 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const note = getNoteAtIndex(selectedIndex);
        if (note) {
          selectNote(note);
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
  }, [filteredNotes, semanticResults, selectedIndex, totalItems, selectNote, createNote, setCommandPaletteOpen]);

  const handleSelectNote = (note: Note) => {
    selectNote(note);
    setCommandPaletteOpen(false);
  };

  const handleSelectSemanticResult = (result: SemanticResult) => {
    const note = notes.find((n) => n.id === result.note_id);
    if (note) {
      selectNote(note);
      setCommandPaletteOpen(false);
    }
  };

  return {
    query,
    setQuery,
    selectedIndex,
    inputRef,
    listRef,
    filteredNotes,
    semanticResults,
    isSearchingSemantic,
    isLoading,
    userName,
    handleSelectNote,
    handleSelectSemanticResult,
  };
}

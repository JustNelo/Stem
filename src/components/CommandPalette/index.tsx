import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { Note } from "../../types";
import { cn } from "../../lib";

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  }),
};

interface CommandPaletteProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  onCreateNote: () => void;
  isLoading: boolean;
}

export function CommandPalette({
  notes,
  onSelectNote,
  onCreateNote,
  isLoading,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(query.toLowerCase())
  );

  const aiActions = [
    { id: "summarize", label: "Résumer mes dernières notes", icon: "✦" },
  ];

  const totalItems = filteredNotes.length + aiActions.length;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
          onSelectNote(filteredNotes[selectedIndex]);
        }
      }
      if (e.key === "n" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onCreateNote();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredNotes, selectedIndex, totalItems, onSelectNote, onCreateNote]);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-surface pt-10">
      {/* Subtle texture overlay */}
      <div className="texture-overlay pointer-events-none absolute inset-0" />

      {/* Giant background logo */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <h1 className="select-none text-[clamp(42rem,25vw,48rem)] font-black uppercase leading-none tracking-tighter text-border opacity-[0.50]">
          STEM
        </h1>
      </div>

      {/* Command palette card */}
      <div className="relative z-10 w-full max-w-xl px-4">
        <div className="relative overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-lg">
          {/* Search input */}
          <div className="flex items-center border-b border-border px-4 py-4">
            <SearchIcon className="h-5 w-5 text-text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une note..."
              className="w-full bg-transparent px-4 font-sans text-text outline-none placeholder:text-text-ghost"
            />
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-text-muted">
                Chargement...
              </div>
            ) : (
              <>
                {filteredNotes.length > 0 && (
                  <div>
                    <div className="px-2 py-2 font-mono text-[10px] uppercase tracking-widest text-text-muted">
                      Récents
                    </div>
                    {filteredNotes.map((note, index) => (
                      <motion.button
                        key={note.id}
                        custom={index}
                        variants={listItemVariants}
                        initial="hidden"
                        animate="visible"
                        onClick={() => onSelectNote(note)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={cn(
                          "group flex w-full cursor-pointer items-center justify-between rounded-lg p-3 transition-all duration-200",
                          selectedIndex === index
                            ? "bg-surface-hover"
                            : "hover:bg-surface-hover"
                        )}
                      >
                        <span
                          className={cn(
                            "text-sm transition-colors duration-200",
                            selectedIndex === index
                              ? "text-text"
                              : "text-text-secondary group-hover:text-text"
                          )}
                        >
                          {note.title || "Sans titre"}
                        </span>
                        <span className="font-mono text-xs text-text-muted">
                          NOTE
                        </span>
                      </motion.button>
                    ))}
                  </div>
                )}

                {filteredNotes.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-text-muted">
                    Aucune note trouvée
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer shortcuts */}
        <div className="mt-6 flex items-center justify-center gap-8 font-mono text-[10px] uppercase tracking-widest text-text-muted">
          <span className="flex items-center gap-2">
            <kbd className="rounded border border-border bg-surface-elevated px-1.5 py-0.5">
              Ctrl+N
            </kbd>
            Nouvelle Note
          </span>
          <span className="flex items-center gap-2">
            <kbd className="rounded border border-border bg-surface-elevated px-1.5 py-0.5">
              Ctrl+Shift+N
            </kbd>
            Quick Capture
          </span>
        </div>
      </div>
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

export default CommandPalette;

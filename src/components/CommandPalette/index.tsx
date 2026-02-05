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
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
      {/* Background gradient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-zinc-900 via-black to-black" />
      
      {/* Noise texture */}
      <div className="noise absolute inset-0" />

      {/* Decorative title */}
      <h1 className="pointer-events-none absolute top-1/4 select-none text-[12rem] font-black uppercase leading-none tracking-tight text-zinc-900">
        STEM
      </h1>

      {/* Command palette card */}
      <div className="relative w-full max-w-xl px-4">
        {/* Glow effect behind card */}
        <div className="absolute -inset-4 rounded-3xl bg-white/5 blur-3xl" />

        <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
          {/* Search input */}
          <div className="flex items-center border-b border-zinc-800/50 px-4 py-4">
            <SearchIcon className="h-5 w-5 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher ou demander à l'IA..."
              className="w-full bg-transparent px-4 font-sans text-white outline-none placeholder:text-zinc-700"
            />
            <kbd className="rounded border border-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-600">
                Chargement...
              </div>
            ) : (
              <>
                {filteredNotes.length > 0 && (
                  <div>
                    <div className="px-2 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
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
                          "group flex w-full cursor-pointer items-center justify-between rounded-lg p-3 transition-colors duration-150",
                          selectedIndex === index
                            ? "bg-zinc-900"
                            : "hover:bg-zinc-900/50"
                        )}
                      >
                        <span
                          className={cn(
                            "text-sm transition-colors duration-150",
                            selectedIndex === index
                              ? "text-white"
                              : "text-zinc-400 group-hover:text-white"
                          )}
                        >
                          {note.title || "Sans titre"}
                        </span>
                        <span className="font-mono text-xs text-zinc-700">
                          NOTE
                        </span>
                      </motion.button>
                    ))}
                  </div>
                )}

                <div className="mt-2">
                  <div className="px-2 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                    Actions IA
                  </div>
                  {aiActions.map((action, index) => (
                    <motion.button
                      key={action.id}
                      custom={filteredNotes.length + index}
                      variants={listItemVariants}
                      initial="hidden"
                      animate="visible"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        "group flex w-full cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors duration-150",
                        selectedIndex === filteredNotes.length + index
                          ? "bg-zinc-900"
                          : "hover:bg-zinc-900/50"
                      )}
                    >
                      <span className="text-purple-400">{action.icon}</span>
                      <span
                        className={cn(
                          "text-sm transition-colors duration-150",
                          selectedIndex === filteredNotes.length + index
                            ? "text-purple-300"
                            : "text-purple-400/80 group-hover:text-purple-300"
                        )}
                      >
                        {action.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer shortcuts */}
        <div className="mt-6 flex items-center justify-center gap-8 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
          <span className="flex items-center gap-2">
            <kbd className="rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5">
              ⌘K
            </kbd>
            Commandes
          </span>
          <span className="flex items-center gap-2">
            <kbd className="rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5">
              ⌘N
            </kbd>
            Nouvelle Note
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

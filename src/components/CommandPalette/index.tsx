import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { cn } from "@/lib";
import { useCommandPalette } from "@/hooks/core/useCommandPalette";

const listItemVariants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.2,
    },
  }),
};

export function CommandPalette() {
  const {
    query,
    setQuery,
    selectedIndex,
    inputRef,
    listRef,
    filteredNotes,
    isLoading,
    userName,
    handleSelectNote,
  } = useCommandPalette();

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-surface pt-10">
      {/* Subtle texture overlay */}
      <div className="texture-overlay pointer-events-none absolute inset-0" />
      {/* Theme visual effect */}
      <div className="theme-effect pointer-events-none absolute inset-0" />

      {/* Giant background logo */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <h1 className="select-none text-[clamp(42rem,25vw,48rem)] font-black uppercase leading-none tracking-tighter text-border opacity-[0.50]">
          STEM
        </h1>
      </div>

      {/* Personalized greeting */}
      {userName && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 mb-6 font-mono text-[10px] uppercase tracking-widest text-text-muted"
        >
          Bonjour, {userName}
        </motion.p>
      )}

      {/* Command palette card */}
      <div className="relative z-10 w-full max-w-xl px-4">
        <div className="relative overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-lg">
          {/* Search input */}
          <div className="flex items-center border-b border-border px-4 py-4">
            <Search size={20} className="text-text-muted" />
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
          <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
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
                        onClick={() => handleSelectNote(note)}
                        data-note-item
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

export default CommandPalette;

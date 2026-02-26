import { motion } from "framer-motion";
import { Search, Brain, Loader2 } from "lucide-react";
import { cn } from "@/lib";
import { useCommandPalette } from "@/hooks/core/useCommandPalette";

const listItemVariants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: {
      delay: i * 0.03,
      duration: 0.15,
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
    semanticResults,
    isSearchingSemantic,
    isLoading,
    handleSelectNote,
    handleSelectSemanticResult,
  } = useCommandPalette();

  return (
    <div className="relative overflow-hidden rounded-xl border border-border-metallic bg-surface-elevated shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.5)]">
      {/* Search input */}
      <div className="flex items-center border-b border-border-metallic/50 px-4 py-3">
        <Search size={18} className="text-text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une note..."
          className="w-full bg-transparent px-3 font-sans text-sm text-text outline-none placeholder:text-text-ghost"
        />
        <kbd className="rounded border border-border-metallic bg-surface-deep px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
          ESC
        </kbd>
      </div>

      {/* Results */}
      <div ref={listRef} className="max-h-96 overflow-y-auto p-2">
        {isLoading ? (
          <div className="px-4 py-6 text-center text-sm text-text-muted">
            Chargement...
          </div>
        ) : (
          <>
            {/* Keyword results */}
            {filteredNotes.length > 0 && (
              <div>
                <div className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest text-text-muted">
                  {query.trim() ? "Résultats" : "Récents"}
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
                        ? "bg-surface-hover shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
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
                    <span className="font-mono text-[10px] text-text-muted">
                      NOTE
                    </span>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Semantic results */}
            {query.trim().length >= 3 && (
              <div>
                <div className="flex items-center gap-1.5 px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest text-text-muted">
                  <Brain size={10} />
                  Résultats sémantiques
                  {isSearchingSemantic && (
                    <Loader2 size={10} className="animate-spin" />
                  )}
                </div>
                {semanticResults.length > 0 ? (
                  semanticResults.map((result, i) => {
                    const combinedIndex = filteredNotes.length + i;
                    return (
                      <motion.button
                        key={result.note_id}
                        custom={combinedIndex}
                        variants={listItemVariants}
                        initial="hidden"
                        animate="visible"
                        onClick={() => handleSelectSemanticResult(result)}
                        data-note-item
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={cn(
                          "group flex w-full cursor-pointer items-center justify-between rounded-lg p-3 transition-all duration-200",
                          selectedIndex === combinedIndex
                            ? "bg-surface-hover shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]"
                            : "hover:bg-surface-hover"
                        )}
                      >
                        <span
                          className={cn(
                            "text-sm transition-colors duration-200",
                            selectedIndex === combinedIndex
                              ? "text-text"
                              : "text-text-secondary group-hover:text-text"
                          )}
                        >
                          {result.title || "Sans titre"}
                        </span>
                        <span className="font-mono text-[10px] text-text-muted">
                          {Math.round(result.score * 100)}%
                        </span>
                      </motion.button>
                    );
                  })
                ) : (
                  !isSearchingSemantic && (
                    <div className="px-4 py-2 text-center text-xs text-text-ghost">
                      Aucun résultat sémantique
                    </div>
                  )
                )}
              </div>
            )}

            {filteredNotes.length === 0 && semanticResults.length === 0 && !isSearchingSemantic && (
              <div className="px-4 py-6 text-center text-sm text-text-muted">
                Aucune note trouvée
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CommandPalette;

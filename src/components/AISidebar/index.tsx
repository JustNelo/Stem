import { motion, AnimatePresence } from "framer-motion";

interface AISidebarProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string | null;
  isSummarizing: boolean;
  onSummarize: () => void;
}

const SIDEBAR_WIDTH = 320;

export function AISidebar({
  isOpen,
  onClose,
  summary,
  isSummarizing,
  onSummarize,
}: AISidebarProps) {
  return (
    <motion.aside
      initial={false}
      animate={{
        width: isOpen ? SIDEBAR_WIDTH : 0,
        opacity: isOpen ? 1 : 0,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative z-20 flex h-full shrink-0 flex-col overflow-hidden border-l border-border bg-surface-elevated pt-10"
    >
      <div className="flex h-full w-80 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-text-secondary">✦</span>
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
              Intelligence
            </h2>
          </div>
          <motion.button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Close AI panel"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M5 3L9 7L5 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.button>
        </div>

        {/* Actions */}
        <div className="border-b border-border p-3">
          <motion.button
            onClick={onSummarize}
            disabled={isSummarizing}
            className="flex w-full items-center gap-3 rounded-lg bg-surface-hover px-4 py-3 text-left transition-colors hover:bg-border disabled:opacity-50"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <span className="text-lg">📝</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-text">
                {isSummarizing ? "Résumé en cours..." : "Résumer la note"}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                Génère un résumé concis
              </div>
            </div>
          </motion.button>

          {/* Future actions placeholder */}
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-3 rounded-lg px-4 py-3 opacity-40">
              <span className="text-lg">🔍</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-text">Analyser</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                  Bientôt disponible
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg px-4 py-3 opacity-40">
              <span className="text-lg">💡</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-text">Suggestions</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                  Bientôt disponible
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {summary ? (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                  Résumé
                </div>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {summary}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full items-center justify-center"
              >
                <p className="text-center text-sm text-text-ghost">
                  Sélectionnez une action pour commencer
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </motion.aside>
  );
}

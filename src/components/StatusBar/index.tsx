import { motion, AnimatePresence } from "framer-motion";
import type { SaveStatus } from "@/types";

interface StatusBarProps {
  saveStatus: SaveStatus;
  wordCount?: number;
}

export function StatusBar({ saveStatus, wordCount }: StatusBarProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Word count */}
      {wordCount !== undefined && (
        <span className="font-mono text-[10px] uppercase tracking-widest text-text-ghost">
          {wordCount} mots
        </span>
      )}

      {/* Save status */}
      <AnimatePresence mode="wait">
        {saveStatus !== "idle" && (
          <motion.div
            key={saveStatus}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5"
          >
            <div
              className={`h-1.5 w-1.5 rounded-full ${
                saveStatus === "saving" ? "bg-amber-400" : "bg-emerald-400"
              }`}
            />
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-ghost">
              {saveStatus === "saving" ? "Sauvegarde..." : "Sauvegardé"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

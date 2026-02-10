import { motion, AnimatePresence } from "framer-motion";
import { GitBranch } from "lucide-react";
import type { SaveStatus, GitSyncStatus } from "@/types";

interface StatusBarProps {
  saveStatus: SaveStatus;
  wordCount?: number;
  gitStatus?: GitSyncStatus;
}

export function StatusBar({ saveStatus, wordCount, gitStatus }: StatusBarProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Git sync status */}
      {gitStatus && gitStatus !== "idle" && (
        <div className="flex items-center gap-1">
          <GitBranch size={10} className={
            gitStatus === "syncing" ? "animate-spin text-amber-400" :
            gitStatus === "synced" ? "text-emerald-400" :
            gitStatus === "error" ? "text-red-400" : "text-text-ghost"
          } />
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-ghost">
            {gitStatus === "syncing" ? "Sync..." :
             gitStatus === "synced" ? "Synced" :
             gitStatus === "error" ? "Sync err" : ""}
          </span>
        </div>
      )}

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

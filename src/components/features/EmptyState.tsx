import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useNotesStore } from "@/store/useNotesStore";

export function EmptyState() {
  const userName = useSettingsStore((s) => s.userName);
  const createNote = useNotesStore((s) => s.createNote);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex h-full flex-col items-center justify-center text-center"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border-metallic/40 bg-surface-elevated shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03),0_4px_24px_rgba(0,0,0,0.2)]">
        <Plus size={24} className="text-text-ghost" />
      </div>

      <h2 className="text-lg font-semibold tracking-tight text-text">
        {userName ? `Bonjour, ${userName}` : "Bienvenue"}
      </h2>
      <p className="mt-1.5 text-sm text-text-muted">
        Sélectionnez une note ou créez-en une nouvelle.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => createNote()}
          className="btn-sculpted flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-text transition-all hover:text-accent"
        >
          <Plus size={14} />
          Nouvelle note
        </button>
      </div>

      <div className="mt-5 flex items-center gap-4 text-[11px] text-text-ghost">
        <span className="flex items-center gap-1.5">
          <kbd className="rounded-md border border-border-metallic/40 bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-muted">Ctrl+N</kbd>
          Créer
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="rounded-md border border-border-metallic/40 bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-muted">Ctrl+K</kbd>
          Rechercher
        </span>
      </div>
    </motion.div>
  );
}

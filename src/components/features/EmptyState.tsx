import { motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useNotesStore } from "@/store/useNotesStore";
import { useAppStore } from "@/store/useAppStore";
import { TopoPattern } from "@/components/ui/TopoPattern";

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-white/10 bg-white/4 px-1.5 font-mono text-[10px] font-medium leading-none text-text-muted shadow-[0_1px_0_0_rgba(0,0,0,0.4),inset_0_0.5px_0_0_rgba(255,255,255,0.06)]">
      {children}
    </kbd>
  );
}

export function EmptyState() {
  const userName = useSettingsStore((s) => s.userName);
  const createNote = useNotesStore((s) => s.createNote);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative flex h-full flex-col items-center justify-center text-center"
    >
      {/* Topographic contour lines — decorative background */}
      <TopoPattern opacity={0.03} />

      {/* Subtle radial glow behind content */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 600,
          height: 400,
          background: "radial-gradient(ellipse at center, rgba(161,161,170,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-2xl font-semibold tracking-tight text-text"
        >
          {userName ? `Bonjour, ${userName}` : "Bienvenue"}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-2 text-[13px] text-text-muted"
        >
          Créez une note pour commencer, ou recherchez dans vos notes existantes.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-8 flex items-center gap-3"
        >
          <button
            onClick={() => createNote()}
            className="group flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/10 bg-surface-hover px-5 py-2.5 text-[13px] font-medium text-text shadow-sm transition-all duration-200 hover:border-white/15 hover:bg-border-subtle hover:shadow-md active:scale-[0.98]"
          >
            <Plus size={15} className="text-text-secondary transition-colors group-hover:text-text" />
            Nouvelle note
          </button>

          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="group flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/6 bg-transparent px-5 py-2.5 text-[13px] font-medium text-text-secondary transition-all duration-200 hover:border-white/10 hover:bg-surface-hover hover:text-text active:scale-[0.98]"
          >
            <Search size={14} className="text-text-muted transition-colors group-hover:text-text-secondary" />
            Rechercher
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="mt-6 flex items-center gap-5 text-[11px] text-text-ghost"
        >
          <span className="flex items-center gap-1.5">
            <Kbd>Ctrl</Kbd>
            <span className="text-text-ghost">+</span>
            <Kbd>N</Kbd>
            <span className="ml-1 text-text-muted">Créer</span>
          </span>
          <span className="h-3 w-px bg-white/6" />
          <span className="flex items-center gap-1.5">
            <Kbd>Ctrl</Kbd>
            <span className="text-text-ghost">+</span>
            <Kbd>K</Kbd>
            <span className="ml-1 text-text-muted">Rechercher</span>
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}

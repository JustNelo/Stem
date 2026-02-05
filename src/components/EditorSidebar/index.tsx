import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { useNotesStore } from "@/store/useNotesStore";
import { cn } from "@/lib";
import { formatRelativeTime } from "@/lib/format";

interface EditorSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const sidebarVariants = {
  closed: { x: -280, opacity: 0 },
  open: { x: 0, opacity: 1 },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.03,
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  }),
};

export function EditorSidebar({ isOpen, onToggle }: EditorSidebarProps) {
  const { notes, selectedNote, selectNote, createNote } = useNotesStore();

  return (
    <>
      {/* Hover trigger zone */}
      <div
        className="fixed left-0 top-0 z-30 h-full w-2 cursor-pointer"
        onMouseEnter={onToggle}
      />

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
              onClick={onToggle}
            />

            {/* Sidebar */}
            <motion.aside
              variants={sidebarVariants}
              initial="closed"
              animate="open"
              exit="closed"
              transition={{
                type: "spring" as const,
                stiffness: 300,
                damping: 30,
              }}
              className="fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-zinc-800/50 bg-zinc-950/95 backdrop-blur-xl"
            >
              {/* Header */}
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800/50 px-4">
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  Notes
                </span>
                <motion.button
                  onClick={() => createNote()}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                </motion.button>
              </div>

              {/* Notes list */}
              <div className="flex-1 overflow-y-auto p-2">
                {notes.map((note, index) => (
                  <motion.button
                    key={note.id}
                    custom={index}
                    variants={listItemVariants}
                    initial="hidden"
                    animate="visible"
                    onClick={() => {
                      selectNote(note);
                      onToggle();
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={cn(
                      "group mb-1 flex w-full flex-col items-start gap-1 rounded-lg p-3 text-left transition-colors duration-150",
                      selectedNote?.id === note.id
                        ? "bg-zinc-900"
                        : "hover:bg-zinc-900/50"
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-medium transition-colors duration-150",
                        selectedNote?.id === note.id
                          ? "text-white"
                          : "text-zinc-400 group-hover:text-white"
                      )}
                    >
                      {note.title || "Sans titre"}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-600">
                      {formatRelativeTime(note.updated_at)}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Footer hint */}
              <div className="border-t border-zinc-800/50 px-4 py-3">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                  <kbd className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5">
                    Ctrl+B
                  </kbd>
                  <span>Toggle sidebar</span>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default EditorSidebar;

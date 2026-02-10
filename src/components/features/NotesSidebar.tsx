import { motion } from "framer-motion";
import { Plus, ChevronLeft, ArrowDownAZ, CalendarArrowDown, Search } from "lucide-react";
import { useNotesStore } from "@/store/useNotesStore";
import { useNotesFilter } from "@/hooks/core/useNotesFilter";
import { NoteListItem } from "@/components/features/NoteListItem";

const SIDEBAR_WIDTH = 260;

interface NotesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestDelete: (id: string) => void;
}

export function NotesSidebar({
  isOpen,
  onClose,
  onRequestDelete,
}: NotesSidebarProps) {
  const selectedNote = useNotesStore((s) => s.selectedNote);
  const selectNote = useNotesStore((s) => s.selectNote);
  const createNote = useNotesStore((s) => s.createNote);
  const togglePin = useNotesStore((s) => s.togglePin);

  const {
    filtered,
    pinned,
    unpinned,
    sortBy,
    toggleSort,
    searchQuery,
    setSearchQuery,
  } = useNotesFilter();

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isOpen ? SIDEBAR_WIDTH : 0,
        opacity: isOpen ? 1 : 0,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative z-20 flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-surface-elevated"
    >
      <div style={{ width: SIDEBAR_WIDTH }} className="flex h-full flex-col pt-10">
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
            Notes
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleSort}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
              title={sortBy === "date" ? "Trier par titre" : "Trier par date"}
            >
              {sortBy === "date" ? (
                <CalendarArrowDown size={14} />
              ) : (
                <ArrowDownAZ size={14} />
              )}
            </button>
            <motion.button
              onClick={() => createNote()}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Nouvelle note"
            >
              <Plus size={14} />
            </motion.button>
            <motion.button
              onClick={onClose}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Fermer le panneau"
            >
              <ChevronLeft size={14} />
            </motion.button>
          </div>
        </div>

        {/* Local search filter */}
        <div className="border-t border-b border-border px-3 py-2">
          <div className="flex items-center gap-2 rounded-md bg-surface px-2 py-1.5">
            <Search size={12} className="text-text-ghost" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer..."
              className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-text-ghost"
            />
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {filtered.length === 0 ? (
            <div className="px-2 py-8 text-center text-sm text-text-muted">
              Aucune note
            </div>
          ) : (
            <div className="space-y-0.5">
              {pinned.length > 0 && (
                <div className="px-2 pb-1 pt-2 font-mono text-[10px] uppercase tracking-widest text-text-muted">
                  Épinglées
                </div>
              )}
              {pinned.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  isSelected={selectedNote?.id === note.id}
                  onSelect={selectNote}
                  onTogglePin={togglePin}
                  onRequestDelete={onRequestDelete}
                />
              ))}
              {unpinned.length > 0 && pinned.length > 0 && (
                <div className="px-2 pb-1 pt-3 font-mono text-[10px] uppercase tracking-widest text-text-muted">
                  Récentes
                </div>
              )}
              {unpinned.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  isSelected={selectedNote?.id === note.id}
                  onSelect={selectNote}
                  onTogglePin={togglePin}
                  onRequestDelete={onRequestDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

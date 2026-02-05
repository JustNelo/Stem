import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronLeft, ArrowDownAZ, CalendarArrowDown, X, Filter } from "lucide-react";
import { useNotesStore } from "@/store/useNotesStore";
import { useTagsStore } from "@/store/useTagsStore";
import { useNotesFilter } from "@/hooks/core/useNotesFilter";
import { NoteListItem } from "@/components/features/NoteListItem";

const SIDEBAR_WIDTH = 256;

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

  const tags = useTagsStore((s) => s.tags);
  const noteTagsCache = useTagsStore((s) => s.noteTagsCache);
  const fetchTags = useTagsStore((s) => s.fetchTags);
  const fetchAllNoteTags = useTagsStore((s) => s.fetchAllNoteTags);

  const {
    notes,
    pinned,
    unpinned,
    sortBy,
    toggleSort,
    filterTagId,
    setFilterTagId,
  } = useNotesFilter();

  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);
  const tagFilterRef = useRef<HTMLDivElement>(null);

  // Fetch tags + all note-tag associations on mount
  useEffect(() => {
    fetchTags();
    fetchAllNoteTags();
  }, [fetchTags, fetchAllNoteTags]);

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isOpen ? SIDEBAR_WIDTH : 0,
        opacity: isOpen ? 1 : 0,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative z-20 flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-surface-elevated pt-10"
    >
      <div className="flex h-full w-64 flex-col">
        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
            Notes
          </h2>
          <div className="flex items-center gap-1">
            {tags.length > 0 && (
              <div ref={tagFilterRef} className="relative">
                <button
                  onClick={() => setIsTagFilterOpen(!isTagFilterOpen)}
                  className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-surface-hover hover:text-text ${
                    filterTagId ? "text-text" : "text-text-muted"
                  }`}
                  title="Filtrer par tag"
                >
                  <Filter size={14} />
                  {filterTagId && (
                    <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-accent" />
                  )}
                </button>
              </div>
            )}
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
              aria-label="New note"
            >
              <Plus size={14} />
            </motion.button>
            <motion.button
              onClick={onClose}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Close sidebar"
            >
              <ChevronLeft size={14} />
            </motion.button>
          </div>
        </div>

        {/* Tag filter dropdown */}
        <AnimatePresence>
          {isTagFilterOpen && tags.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden border-b border-border/50"
            >
              <div className="flex flex-wrap gap-1 px-3 py-2">
                {filterTagId && (
                  <button
                    onClick={() => {
                      setFilterTagId(null);
                      setIsTagFilterOpen(false);
                    }}
                    className="flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
                  >
                    <X size={8} />
                    Tous
                  </button>
                )}
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      setFilterTagId(filterTagId === tag.id ? null : tag.id);
                      setIsTagFilterOpen(false);
                    }}
                    className={`flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] transition-all ${
                      filterTagId === tag.id
                        ? "bg-surface-hover text-text"
                        : "text-text-muted hover:bg-surface-hover hover:text-text-secondary"
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {notes.length === 0 ? (
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
                  tags={noteTagsCache[note.id] || []}
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
                  tags={noteTagsCache[note.id] || []}
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

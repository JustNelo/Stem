import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronLeft, Trash2, ArrowDownAZ, CalendarArrowDown, Menu, X, Pin, Sparkles, Filter } from "lucide-react";
import { useNotesStore } from "@/store/useNotesStore";
import { useTagsStore } from "@/store/useTagsStore";
import { formatRelativeTime, countWords } from "@/lib/format";
import { AISidebar } from "@/components/AISidebar";
import { StatusBar } from "@/components/StatusBar";
import type { SaveStatus } from "@/types";

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  saveStatus?: SaveStatus;
  // AI Sidebar props
  onExecuteCommand?: (command: string, args?: string) => Promise<string>;
  isProcessing?: boolean;
}

const SIDEBAR_WIDTH = 256;

export function Layout({
  children,
  showSidebar = true,
  saveStatus = "idle",
  onExecuteCommand,
  isProcessing = false,
}: LayoutProps) {
  const { notes, selectedNote, selectNote, createNote, deleteNote, togglePin } = useNotesStore();
  const { tags, noteTagsCache, fetchTags, getTagsForNote } = useTagsStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "title">("date");
  const [filterTagId, setFilterTagId] = useState<string | null>(null);
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);
  const tagFilterRef = useRef<HTMLDivElement>(null);

  // Fetch tags for sidebar
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Fetch tags only for notes not already cached
  useEffect(() => {
    notes.forEach((n) => {
      if (!noteTagsCache[n.id]) getTagsForNote(n.id);
    });
  }, [notes, noteTagsCache, getTagsForNote]);

  // Keyboard shortcuts: B for notes sidebar, L for AI sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (e.key.toLowerCase() === "b" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
      
      if (e.key.toLowerCase() === "l" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsAISidebarOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const renderNoteItem = (note: typeof notes[0]) => (
    <div
      key={note.id}
      className={`group relative flex w-full items-center rounded-lg transition-colors ${
        selectedNote?.id === note.id
          ? "bg-surface-hover"
          : "hover:bg-surface-hover"
      }`}
    >
      <button
        onClick={() => selectNote(note)}
        className="flex-1 cursor-pointer px-3 py-2 text-left"
      >
        <div className="mb-1 truncate text-sm font-medium tracking-tight text-text">
          {note.title || "Sans titre"}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
            {formatRelativeTime(note.updated_at)}
          </span>
          {(noteTagsCache[note.id] || []).slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: tag.color }}
              title={tag.name}
            />
          ))}
        </div>
      </button>
      <div className="mr-2 flex shrink-0 items-center gap-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePin(note.id);
          }}
          className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded transition-all hover:bg-surface-hover hover:text-text ${
            note.is_pinned
              ? "text-text-secondary"
              : "text-text-ghost opacity-0 group-hover:opacity-100"
          }`}
          title={note.is_pinned ? "Désépingler" : "Épingler"}
        >
          <Pin size={12} className={note.is_pinned ? "fill-current" : ""} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setNoteToDelete(note.id);
          }}
          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
          title="Supprimer"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-surface">
      {/* Subtle texture overlay */}
      <div className="texture-overlay pointer-events-none fixed inset-0 z-50" />
      {/* Theme visual effect */}
      <div className="theme-effect pointer-events-none fixed inset-0 z-0" />

      {/* Fixed sidebar */}
      {showSidebar && (
        <motion.aside
          initial={false}
          animate={{ 
            width: isSidebarOpen ? SIDEBAR_WIDTH : 0,
            opacity: isSidebarOpen ? 1 : 0
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
                  onClick={() => setSortBy(sortBy === "date" ? "title" : "date")}
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
                  onClick={() => setIsSidebarOpen(false)}
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
                        onClick={() => { setFilterTagId(null); setIsTagFilterOpen(false); }}
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
                  {(() => {
                    const filtered = [...notes]
                      .filter((note) => {
                        if (!filterTagId) return true;
                        const noteTags = noteTagsCache[note.id] || [];
                        return noteTags.some((t) => t.id === filterTagId);
                      })
                      .sort((a, b) => {
                        if (sortBy === "title") {
                          return (a.title || "Sans titre").localeCompare(b.title || "Sans titre");
                        }
                        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                      });
                    const pinned = filtered.filter((n) => n.is_pinned);
                    const unpinned = filtered.filter((n) => !n.is_pinned);
                    const sections: React.ReactNode[] = [];
                    if (pinned.length > 0) {
                      sections.push(
                        <div key="pinned-label" className="px-2 pb-1 pt-2 font-mono text-[10px] uppercase tracking-widest text-text-muted">
                          Épinglées
                        </div>
                      );
                      pinned.forEach((note) => sections.push(renderNoteItem(note)));
                    }
                    if (unpinned.length > 0 && pinned.length > 0) {
                      sections.push(
                        <div key="unpinned-label" className="px-2 pb-1 pt-3 font-mono text-[10px] uppercase tracking-widest text-text-muted">
                          Récentes
                        </div>
                      );
                    }
                    unpinned.forEach((note) => sections.push(renderNoteItem(note)));
                    return sections;
                  })()}
                </div>
              )}
            </div>

          </div>
        </motion.aside>
      )}
      {/* Sidebar toggle button (visible when closed) */}
      {showSidebar && !isSidebarOpen && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          onClick={() => setIsSidebarOpen(true)}
          className="fixed left-3 top-14 z-30 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface-elevated text-text-muted shadow-sm transition-colors hover:bg-surface-hover hover:text-text"
          title="Open sidebar (B)"
        >
          <Menu size={16} />
        </motion.button>
      )}

      {/* Main content - centered with breathing room */}
      <main className="relative z-10 flex flex-1 flex-col overflow-hidden pt-10">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-8 py-6">{children}</div>
        </div>
        {/* Status bar - fixed at bottom of main, respects sidebars */}
        {selectedNote && (
          <div className="flex w-full shrink-0 justify-end border-t border-border/50 px-4 py-1.5">
            <StatusBar
              saveStatus={saveStatus}
              wordCount={countWords(selectedNote.content)}
            />
          </div>
        )}
      </main>

      {/* AI Sidebar toggle button (visible when closed) */}
      {!isAISidebarOpen && (
        <motion.button
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          onClick={() => setIsAISidebarOpen(true)}
          className="fixed right-3 top-14 z-30 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface-elevated text-text-muted shadow-sm transition-colors hover:bg-surface-hover hover:text-text"
          title="Open AI panel (L)"
        >
          <Sparkles size={14} />
        </motion.button>
      )}

      {/* AI Sidebar */}
      <AISidebar
        isOpen={isAISidebarOpen}
        onClose={() => setIsAISidebarOpen(false)}
        onExecuteCommand={onExecuteCommand || (async () => "Commande non disponible")}
        isProcessing={isProcessing}
      />

      {/* Delete confirmation modal */}
      {noteToDelete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-text/20 backdrop-blur-sm"
          onClick={() => setNoteToDelete(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg border border-border bg-surface-elevated p-6 shadow-xl"
          >
            <h3 className="mb-2 text-lg font-semibold text-text">Supprimer cette note ?</h3>
            <p className="mb-6 text-sm text-text-secondary">
              Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setNoteToDelete(null)}
                className="flex-1 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-hover"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (noteToDelete) deleteNote(noteToDelete);
                  setNoteToDelete(null);
                }}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
              >
                Supprimer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

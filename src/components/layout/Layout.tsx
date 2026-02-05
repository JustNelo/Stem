import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { Note } from "../../types";
import { formatRelativeTime } from "../../lib/format";
import { AISidebar } from "../AISidebar";

interface LayoutProps {
  children: React.ReactNode;
  notes?: Note[];
  selectedNote?: Note | null;
  onSelectNote?: (note: Note) => void;
  onCreateNote?: () => void;
  onDeleteNote?: (id: string) => void;
  showSidebar?: boolean;
  // AI Sidebar props
  summary?: string | null;
  isSummarizing?: boolean;
  onSummarize?: () => void;
}

const SIDEBAR_WIDTH = 256;

export function Layout({
  children,
  notes = [],
  selectedNote,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  showSidebar = true,
  summary = null,
  isSummarizing = false,
  onSummarize,
}: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "title">("date");

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

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-surface">
      {/* Subtle texture overlay */}
      <div className="texture-overlay pointer-events-none fixed inset-0 z-50" />

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
                <button
                  onClick={() => setSortBy(sortBy === "date" ? "title" : "date")}
                  className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
                  title={sortBy === "date" ? "Trier par titre" : "Trier par date"}
                >
                  {sortBy === "date" ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 6h16M4 12h16M4 18h16"/>
                      <path d="M8 3v3M8 18v3"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 6h16M4 12h10M4 18h6"/>
                    </svg>
                  )}
                </button>
                {onCreateNote && (
                  <motion.button
                    onClick={onCreateNote}
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="New note"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M7 1V13M1 7H13"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </motion.button>
                )}
                <motion.button
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Close sidebar"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </motion.button>
              </div>
            </div>

            {/* Notes list */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {notes.length === 0 ? (
                <div className="px-2 py-8 text-center text-sm text-text-muted">
                  Aucune note
                </div>
              ) : (
                <div className="space-y-0.5">
                  {[...notes]
                    .sort((a, b) => {
                      if (sortBy === "title") {
                        return (a.title || "Sans titre").localeCompare(b.title || "Sans titre");
                      }
                      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
                    })
                    .map((note) => (
                    <div
                      key={note.id}
                      className={`group relative flex w-full items-center rounded-lg transition-colors ${
                        selectedNote?.id === note.id
                          ? "bg-surface-hover"
                          : "hover:bg-surface-hover"
                      }`}
                    >
                      <button
                        onClick={() => onSelectNote?.(note)}
                        className="flex-1 cursor-pointer px-3 py-2 text-left"
                      >
                        <div className="mb-1 truncate text-sm font-medium tracking-tight text-text">
                          {note.title || "Sans titre"}
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                          {formatRelativeTime(note.updated_at)}
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNoteToDelete(note.id);
                        }}
                        className="mr-2 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                        title="Supprimer"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                        </svg>
                      </button>
                    </div>
                  ))}
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
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4H14M2 8H10M2 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </motion.button>
      )}

      {/* Main content - centered with breathing room */}
      <main className="relative z-10 flex flex-1 flex-col items-center overflow-auto pt-10">
        <div className="w-full max-w-3xl px-8 py-6">{children}</div>
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
          <span className="text-sm">✦</span>
        </motion.button>
      )}

      {/* AI Sidebar */}
      <AISidebar
        isOpen={isAISidebarOpen}
        onClose={() => setIsAISidebarOpen(false)}
        summary={summary}
        isSummarizing={isSummarizing}
        onSummarize={onSummarize || (() => {})}
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
                  onDeleteNote?.(noteToDelete);
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

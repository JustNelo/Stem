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
  showSidebar?: boolean;
  // AI Sidebar props
  summary?: string | null;
  isSummarizing?: boolean;
  onSummarize?: () => void;
}

const SIDEBAR_WIDTH = 256; // 16rem = 256px

export function Layout({
  children,
  notes = [],
  selectedNote,
  onSelectNote,
  onCreateNote,
  showSidebar = true,
  summary = null,
  isSummarizing = false,
  onSummarize,
}: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);

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
                {onCreateNote && (
                  <motion.button
                    onClick={onCreateNote}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
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
                  className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
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
                  {notes.map((note) => (
                    <motion.button
                      key={note.id}
                      onClick={() => onSelectNote?.(note)}
                      className={`group w-full rounded-lg px-3 py-2 text-left transition-colors ${
                        selectedNote?.id === note.id
                          ? "bg-surface-hover"
                          : "hover:bg-surface-hover"
                      }`}
                    >
                      <div className="mb-0.5 truncate text-sm font-medium tracking-tight text-text">
                        {note.title || "Sans titre"}
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                        {formatRelativeTime(note.updated_at)}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="border-t border-border px-4 py-2">
              <span className="font-mono text-[9px] uppercase tracking-widest text-text-ghost">
                <kbd className="rounded bg-surface-hover px-1">B</kbd> toggle
              </span>
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
          className="fixed left-3 top-14 z-30 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-elevated text-text-muted shadow-sm transition-colors hover:bg-surface-hover hover:text-text"
          title="Open sidebar (B)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 4H14M2 8H10M2 12H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </motion.button>
      )}

      {/* Main content - centered with breathing room */}
      <main className="relative z-10 flex flex-1 flex-col items-center overflow-auto pt-10">
        <div className="w-full max-w-3xl px-8 py-12">{children}</div>
      </main>

      {/* AI Sidebar toggle button (visible when closed) */}
      {!isAISidebarOpen && (
        <motion.button
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          onClick={() => setIsAISidebarOpen(true)}
          className="fixed right-3 top-14 z-30 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-elevated text-text-muted shadow-sm transition-colors hover:bg-surface-hover hover:text-text"
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
    </div>
  );
}

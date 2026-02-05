import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Menu, Sparkles } from "lucide-react";
import { useNotesStore } from "@/store/useNotesStore";
import { countWords } from "@/lib/format";
import { AISidebar } from "@/components/AISidebar";
import { StatusBar } from "@/components/StatusBar";
import { NotesSidebar } from "@/components/features/NotesSidebar";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { SaveStatus } from "@/types";

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  saveStatus?: SaveStatus;
  onExecuteCommand?: (command: string, args?: string) => Promise<string>;
  isProcessing?: boolean;
}

export function Layout({
  children,
  showSidebar = true,
  saveStatus = "idle",
  onExecuteCommand,
  isProcessing = false,
}: LayoutProps) {
  const selectedNote = useNotesStore((s) => s.selectedNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeAISidebar = useCallback(() => setIsAISidebarOpen(false), []);
  const openAISidebar = useCallback(() => setIsAISidebarOpen(true), []);
  const clearNoteToDelete = useCallback(() => setNoteToDelete(null), []);

  const handleConfirmDelete = useCallback(() => {
    if (noteToDelete) deleteNote(noteToDelete);
    setNoteToDelete(null);
  }, [noteToDelete, deleteNote]);

  const fallbackExecuteCommand = useCallback(async () => "Commande non disponible", []);
  const executeCommand = onExecuteCommand || fallbackExecuteCommand;

  const wordCount = useMemo(
    () => (selectedNote ? countWords(selectedNote.content) : 0),
    [selectedNote?.content]
  );

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
      {/* Theme visual effect */}
      <div className="theme-effect pointer-events-none fixed inset-0 z-0" />

      {/* Notes sidebar */}
      {showSidebar && (
        <NotesSidebar
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
          onRequestDelete={setNoteToDelete}
        />
      )}

      {/* Sidebar toggle button (visible when closed) */}
      {showSidebar && !isSidebarOpen && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          onClick={openSidebar}
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
              wordCount={wordCount}
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
          onClick={openAISidebar}
          className="fixed right-3 top-14 z-30 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface-elevated text-text-muted shadow-sm transition-colors hover:bg-surface-hover hover:text-text"
          title="Open AI panel (L)"
        >
          <Sparkles size={14} />
        </motion.button>
      )}

      {/* AI Sidebar */}
      <AISidebar
        isOpen={isAISidebarOpen}
        onClose={closeAISidebar}
        onExecuteCommand={executeCommand}
        isProcessing={isProcessing}
      />

      {/* Delete confirmation modal */}
      {noteToDelete && (
        <ConfirmModal
          title="Supprimer cette note ?"
          description="Cette action est irréversible."
          confirmLabel="Supprimer"
          cancelLabel="Annuler"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={clearNoteToDelete}
        />
      )}
    </div>
  );
}

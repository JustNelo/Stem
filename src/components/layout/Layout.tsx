import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Menu, Sparkles } from "lucide-react";
import { useNotesStore } from "@/store/useNotesStore";
import { useAppStore } from "@/store/useAppStore";
import { countWords } from "@/lib/format";
import { AISidebar } from "@/components/AISidebar";
import { StatusBar } from "@/components/StatusBar";
import { NotesSidebar } from "@/components/features/NotesSidebar";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { SaveStatus } from "@/types";

interface LayoutProps {
  children: React.ReactNode;
  saveStatus?: SaveStatus;
  onExecuteCommand: (command: string, args?: string) => Promise<string>;
  isProcessing?: boolean;
}

export function Layout({
  children,
  saveStatus = "idle",
  onExecuteCommand,
  isProcessing = false,
}: LayoutProps) {
  const selectedNote = useNotesStore((s) => s.selectedNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);

  const leftOpen = useAppStore((s) => s.leftSidebarOpen);
  const rightOpen = useAppStore((s) => s.rightSidebarOpen);
  const setLeftOpen = useAppStore((s) => s.setLeftSidebarOpen);
  const setRightOpen = useAppStore((s) => s.setRightSidebarOpen);

  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const clearNoteToDelete = useCallback(() => setNoteToDelete(null), []);

  const handleConfirmDelete = useCallback(() => {
    if (noteToDelete) deleteNote(noteToDelete);
    setNoteToDelete(null);
  }, [noteToDelete, deleteNote]);

  const wordCount = useMemo(
    () => (selectedNote ? countWords(selectedNote.content) : 0),
    [selectedNote?.content]
  );

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-surface">
      {/* Subtle texture overlay */}
      <div className="texture-overlay pointer-events-none fixed inset-0 z-50" />
      {/* Theme visual effect */}
      <div className="theme-effect pointer-events-none fixed inset-0 z-0" />

      {/* LEFT COLUMN — Notes sidebar */}
      <NotesSidebar
        isOpen={leftOpen}
        onClose={() => setLeftOpen(false)}
        onRequestDelete={setNoteToDelete}
      />

      {/* Sidebar toggle button (visible when closed) */}
      {!leftOpen && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          onClick={() => setLeftOpen(true)}
          className="fixed left-3 top-14 z-30 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface-elevated text-text-muted shadow-sm transition-colors hover:bg-surface-hover hover:text-text"
          title="Ouvrir le panneau (Ctrl+B)"
        >
          <Menu size={16} />
        </motion.button>
      )}

      {/* CENTER COLUMN — Editor */}
      <main className="relative z-10 flex flex-1 flex-col overflow-hidden pt-10">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-8 py-6">{children}</div>
        </div>
        {/* Status bar */}
        {selectedNote && (
          <div className="flex w-full shrink-0 justify-end border-t border-border/50 px-4 py-1.5">
            <StatusBar saveStatus={saveStatus} wordCount={wordCount} />
          </div>
        )}
      </main>

      {/* AI Sidebar toggle button (visible when closed) */}
      {!rightOpen && (
        <motion.button
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          onClick={() => setRightOpen(true)}
          className="fixed right-3 top-14 z-30 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface-elevated text-text-muted shadow-sm transition-colors hover:bg-surface-hover hover:text-text"
          title="Ouvrir le copilot (Ctrl+J)"
        >
          <Sparkles size={14} />
        </motion.button>
      )}

      {/* RIGHT COLUMN — AI sidebar */}
      <AISidebar
        isOpen={rightOpen}
        onClose={() => setRightOpen(false)}
        onExecuteCommand={onExecuteCommand}
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

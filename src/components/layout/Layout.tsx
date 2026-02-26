import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Menu, Sparkles } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { useNotesStore } from "@/store/useNotesStore";
import { useAppStore } from "@/store/useAppStore";
import { useGitSync } from "@/hooks/useGitSync";
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

  const { syncStatus: gitSyncStatus } = useGitSync();

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

      {/* LEFT COLUMN — Notes sidebar */}
      <NotesSidebar
        isOpen={leftOpen}
        onClose={() => setLeftOpen(false)}
        onRequestDelete={setNoteToDelete}
      />

      {/* Sidebar toggle button (visible when closed) */}
      {!leftOpen && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="fixed left-3 top-10 z-30"
        >
          <IconButton
            label="Ouvrir le panneau (Ctrl+B)"
            size="md"
            onClick={() => setLeftOpen(true)}
            className="btn-sculpted border border-border-metallic"
          >
            <Menu size={16} />
          </IconButton>
        </motion.div>
      )}

      {/* CENTER COLUMN — Editor */}
      <main className="relative z-10 flex flex-1 flex-col overflow-hidden pt-8">
        <div className="flex flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-8 py-6">{children}</div>
        </div>
        {/* Status bar */}
        {selectedNote && (
          <div className="flex w-full shrink-0 justify-end border-t border-border-metallic/30 px-4 py-1.5">
            <StatusBar saveStatus={saveStatus} wordCount={wordCount} gitStatus={gitSyncStatus} />
          </div>
        )}
      </main>

      {/* AI Sidebar toggle button (visible when closed) */}
      {!rightOpen && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          className="fixed right-3 top-10 z-30"
        >
          <IconButton
            label="Ouvrir le copilot (Ctrl+J)"
            size="md"
            onClick={() => setRightOpen(true)}
            className="btn-sculpted border border-border-metallic"
          >
            <Sparkles size={14} />
          </IconButton>
        </motion.div>
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

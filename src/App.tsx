import { lazy, Suspense, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";

import { TitleBar } from "@/components/TitleBar";
import { AppLoader } from "@/components/ui/AppLoader";
import { Layout } from "@/components/layout";
import { ToastContainer } from "@/components/ToastContainer";
import { CommandPalette } from "@/components/CommandPalette";
import { EditorHeader } from "@/components/features/EditorHeader";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useNotesStore } from "@/store/useNotesStore";
import { useAppStore } from "@/store/useAppStore";
import { useAppInit } from "@/hooks/core/useAppInit";
import { useEditorState } from "@/hooks/core/useEditorState";
import { useAICommand } from "@/hooks/core/useAICommand";
import { useAppShortcuts } from "@/hooks/core/useAppShortcuts";
import { useEmbeddingSync } from "@/hooks/useEmbeddingSync";
import { useAutoUpdate } from "@/hooks/useAutoUpdate";
import { ReviewMode } from "@/components/features/ReviewMode";

const Editor = lazy(() => import("@/components/Editor"));
const QuickCapture = lazy(() => import("@/components/QuickCapture").then((m) => ({ default: m.QuickCapture })));
const Onboarding = lazy(() => import("@/components/Onboarding").then((m) => ({ default: m.Onboarding })));
const Settings = lazy(() => import("@/components/Settings").then((m) => ({ default: m.Settings })));

function App() {
  const { isQuickCapture, handleQuickCaptureSave } = useAppInit();
  const hasCompletedOnboarding = useSettingsStore((s) => s.hasCompletedOnboarding);
  const showSettings = useAppStore((s) => s.showSettings);
  const setShowSettings = useAppStore((s) => s.setShowSettings);
  const commandPaletteOpen = useAppStore((s) => s.commandPaletteOpen);

  const {
    localTitle,
    selectedNote,
    handleTitleChange,
    handleContentChange,
    saveStatus,
  } = useEditorState();

  const { isProcessing, handleExecuteCommand } = useAICommand();

  useAppShortcuts();
  useEmbeddingSync();
  const { available: updateAvailable, version: updateVersion, installing: updateInstalling, install: installUpdate } = useAutoUpdate();

  const [reviewOpen, setReviewOpen] = useState(false);
  const openReview = useCallback(() => setReviewOpen(true), []);
  const closeReview = useCallback(() => setReviewOpen(false), []);

  // Render Quick Capture mode
  if (isQuickCapture) {
    return (
      <Suspense fallback={<AppLoader />}>
        <QuickCapture onSave={handleQuickCaptureSave} />
      </Suspense>
    );
  }

  // Render Onboarding on first launch
  if (!hasCompletedOnboarding) {
    return (
      <Suspense fallback={<AppLoader />}>
        <Onboarding />
      </Suspense>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <TitleBar onOpenSettings={() => setShowSettings(true)} />
      <ToastContainer />

      {/* Update banner */}
      {updateAvailable && (
        <div className="flex items-center justify-center gap-3 bg-accent/10 px-4 py-1.5 text-xs text-text">
          <span>Mise à jour {updateVersion} disponible</span>
          <button
            onClick={installUpdate}
            disabled={updateInstalling}
            className="rounded-md bg-accent px-3 py-0.5 text-[11px] font-medium text-white transition-colors hover:bg-accent/80 disabled:opacity-50"
          >
            {updateInstalling ? "Installation..." : "Installer"}
          </button>
        </div>
      )}

      {/* Settings overlay — rendered on top without unmounting the app tree */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            key="settings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50"
          >
            <Suspense fallback={<AppLoader />}>
              <Settings onClose={() => setShowSettings(false)} />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command Palette overlay */}
      <AnimatePresence>
        {commandPaletteOpen && (
          <motion.div
            key="palette"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 flex items-start justify-center bg-text/20 pt-24 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-xl"
            >
              <CommandPalette />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3-column layout */}
      <div className="relative flex-1 overflow-hidden">
        <Layout
          saveStatus={saveStatus}
          onExecuteCommand={handleExecuteCommand}
          isProcessing={isProcessing}
        >
          {selectedNote ? (
            <>
              <EditorHeader
                localTitle={localTitle}
                onTitleChange={handleTitleChange}
                noteContent={selectedNote.content}
                folderId={selectedNote.folder_id}
                onReview={openReview}
              />
              <Suspense fallback={<AppLoader />}>
                <Editor
                  key={selectedNote.id}
                  initialContent={selectedNote.content || undefined}
                  onChange={handleContentChange}
                />
              </Suspense>
            </>
          ) : (
            <EmptyState />
          )}
        </Layout>
      </div>

      {/* Review Mode modal */}
      <ReviewMode isOpen={reviewOpen} onClose={closeReview} />
    </div>
  );
}

function EmptyState() {
  const userName = useSettingsStore((s) => s.userName);
  const createNote = useNotesStore((s) => s.createNote);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex h-full flex-col items-center justify-center text-center"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border-metallic/40 bg-surface-elevated shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03),0_4px_24px_rgba(0,0,0,0.2)]">
        <Plus size={24} className="text-text-ghost" />
      </div>

      <h2 className="text-lg font-semibold tracking-tight text-text">
        {userName ? `Bonjour, ${userName}` : "Bienvenue"}
      </h2>
      <p className="mt-1.5 text-sm text-text-muted">
        Sélectionnez une note ou créez-en une nouvelle.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => createNote()}
          className="btn-sculpted flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-text transition-all hover:text-accent"
        >
          <Plus size={14} />
          Nouvelle note
        </button>
      </div>

      <div className="mt-5 flex items-center gap-4 text-[11px] text-text-ghost">
        <span className="flex items-center gap-1.5">
          <kbd className="rounded-md border border-border-metallic/40 bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-muted">Ctrl+N</kbd>
          Créer
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="rounded-md border border-border-metallic/40 bg-surface-elevated px-1.5 py-0.5 font-mono text-[10px] text-text-muted">Ctrl+K</kbd>
          Rechercher
        </span>
      </div>
    </motion.div>
  );
}

export default App;

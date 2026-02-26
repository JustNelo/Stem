import { lazy, Suspense, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { TitleBar } from "@/components/TitleBar";
import { Layout } from "@/components/layout";
import { ToastContainer } from "@/components/ToastContainer";
import { CommandPalette } from "@/components/CommandPalette";
import { EditorHeader } from "@/components/features/EditorHeader";
import { useSettingsStore, applyPersistedSettings } from "@/store/useSettingsStore";
import { useAppStore } from "@/store/useAppStore";
import { useAppInit } from "@/hooks/core/useAppInit";
import { useEditorState } from "@/hooks/core/useEditorState";
import { useAICommand } from "@/hooks/core/useAICommand";
import { useAppShortcuts } from "@/hooks/core/useAppShortcuts";
import { useEmbeddingSync } from "@/hooks/useEmbeddingSync";
import { ReviewMode } from "@/components/features/ReviewMode";

const Editor = lazy(() => import("@/components/Editor"));
const QuickCapture = lazy(() => import("@/components/QuickCapture").then((m) => ({ default: m.QuickCapture })));
const Onboarding = lazy(() => import("@/components/Onboarding").then((m) => ({ default: m.Onboarding })));
const Settings = lazy(() => import("@/components/Settings").then((m) => ({ default: m.Settings })));

// Apply persisted settings (theme, font) to DOM on load
applyPersistedSettings();

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

  const [reviewOpen, setReviewOpen] = useState(false);
  const openReview = useCallback(() => setReviewOpen(true), []);
  const closeReview = useCallback(() => setReviewOpen(false), []);

  // Render Quick Capture mode
  if (isQuickCapture) {
    return (
      <Suspense fallback={null}>
        <QuickCapture onSave={handleQuickCaptureSave} />
      </Suspense>
    );
  }

  // Render Onboarding on first launch
  if (!hasCompletedOnboarding) {
    return (
      <Suspense fallback={null}>
        <Onboarding />
      </Suspense>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <TitleBar onOpenSettings={() => setShowSettings(true)} />
      <ToastContainer />

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
            <Suspense fallback={null}>
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
                onReview={openReview}
              />
              <Suspense fallback={null}>
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
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <h1 className="select-none text-6xl font-black uppercase leading-none tracking-tighter text-border opacity-50">
        STEM
      </h1>
      <p className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
        Sélectionnez une note ou appuyez sur{" "}
        <kbd className="rounded border border-border bg-surface-elevated px-1.5 py-0.5">
          Ctrl+K
        </kbd>{" "}
        pour rechercher
      </p>
    </div>
  );
}

export default App;

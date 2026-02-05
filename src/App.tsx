import { useCallback, lazy, Suspense } from "react";
import { MantineProvider } from "@mantine/core";
import { motion, AnimatePresence } from "framer-motion";
import "@mantine/core/styles.css";

import { CommandPalette } from "@/components/CommandPalette";
import { TitleBar } from "@/components/TitleBar";
import { Layout } from "@/components/layout";
import { ToastContainer } from "@/components/ToastContainer";
import { EditorHeader } from "@/components/features/EditorHeader";
import { useSettingsStore, applyPersistedSettings } from "@/store/useSettingsStore";
import { useAppInit } from "@/hooks/core/useAppInit";
import { useEditorState } from "@/hooks/core/useEditorState";
import { useAICommand } from "@/hooks/core/useAICommand";
import { useAppShortcuts } from "@/hooks/core/useAppShortcuts";

const Editor = lazy(() => import("@/components/Editor"));
const QuickCapture = lazy(() => import("@/components/QuickCapture").then((m) => ({ default: m.QuickCapture })));
const Onboarding = lazy(() => import("@/components/Onboarding").then((m) => ({ default: m.Onboarding })));
const Settings = lazy(() => import("@/components/Settings").then((m) => ({ default: m.Settings })));

// Apply persisted settings (theme, font) to DOM on load
applyPersistedSettings();

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const pageTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

function App() {
  const { isQuickCapture, handleQuickCaptureSave } = useAppInit();
  const hasCompletedOnboarding = useSettingsStore((s) => s.hasCompletedOnboarding);

  const {
    view,
    showSettings,
    setShowSettings,
    localTitle,
    selectedNote,
    handleBack,
    handleTitleChange,
    handleContentChange,
    saveStatus,
  } = useEditorState();

  const { isProcessing, handleExecuteCommand } = useAICommand();

  const toggleSettings = useCallback(() => {
    setShowSettings((prev) => !prev);
  }, [setShowSettings]);

  const closeSettings = useCallback(() => setShowSettings(false), [setShowSettings]);
  const openSettings = useCallback(() => setShowSettings(true), [setShowSettings]);

  useAppShortcuts({ view, onBack: handleBack, onToggleSettings: toggleSettings });

  // Render Quick Capture mode
  if (isQuickCapture) {
    return (
      <MantineProvider>
        <Suspense fallback={null}>
          <QuickCapture onSave={handleQuickCaptureSave} />
        </Suspense>
      </MantineProvider>
    );
  }

  // Render Onboarding on first launch
  if (!hasCompletedOnboarding) {
    return (
      <MantineProvider>
        <Suspense fallback={null}>
          <Onboarding />
        </Suspense>
      </MantineProvider>
    );
  }

  // Render Settings as overlay
  if (showSettings) {
    return (
      <MantineProvider>
        <TitleBar />
        <Suspense fallback={null}>
          <Settings onClose={closeSettings} />
        </Suspense>
      </MantineProvider>
    );
  }

  return (
    <MantineProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden">
        <TitleBar onOpenSettings={openSettings} />
        <ToastContainer />

        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {view === "home" ? (
              <motion.div
                key="home"
                className="absolute inset-0"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
              >
                <CommandPalette />
              </motion.div>
            ) : (
              <motion.div
                key="editor"
                className="absolute inset-0"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={pageTransition}
              >
                <Layout
                  showSidebar={true}
                  saveStatus={saveStatus}
                  onExecuteCommand={handleExecuteCommand}
                  isProcessing={isProcessing}
                >
                  <EditorHeader
                    localTitle={localTitle}
                    onTitleChange={handleTitleChange}
                    onBack={handleBack}
                    noteId={selectedNote?.id}
                    noteContent={selectedNote?.content}
                  />
                  {selectedNote && (
                    <Suspense fallback={null}>
                      <Editor
                        key={selectedNote.id}
                        initialContent={selectedNote.content || undefined}
                        onChange={handleContentChange}
                      />
                    </Suspense>
                  )}
                </Layout>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MantineProvider>
  );
}

export default App;

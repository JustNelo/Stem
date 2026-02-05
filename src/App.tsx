import { useCallback, useState, useEffect } from "react";
import { MantineProvider } from "@mantine/core";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "@mantine/core/styles.css";

import Editor from "./components/Editor";
import { CommandPalette } from "./components/CommandPalette";
import { TitleBar } from "./components/TitleBar";
import { Layout } from "./components/layout";
import { QuickCapture } from "./components/QuickCapture";
import { useNotes } from "./hooks/useNotes";
import { useAutoSave } from "./hooks/useAutoSave";
import { countWords } from "./lib/format";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

function extractTextFromContent(content: string): string {
  try {
    const blocks = JSON.parse(content);
    let text = "";
    
    const extract = (obj: unknown): void => {
      if (!obj || typeof obj !== "object") return;
      if (Array.isArray(obj)) {
        obj.forEach(extract);
        return;
      }
      const record = obj as Record<string, unknown>;
      if (typeof record.text === "string") {
        text += " " + record.text;
      }
      if (record.content) extract(record.content);
      if (record.children) extract(record.children);
    };
    
    extract(blocks);
    return text.trim();
  } catch {
    return "";
  }
}

const pageTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

type View = "home" | "editor";

function App() {
  const {
    notes,
    selectedNote,
    isLoading,
    createNote,
    updateNote,
    deleteNote,
    selectNote,
    seedNotes,
  } = useNotes();

  const [view, setView] = useState<View>("home");
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isQuickCapture, setIsQuickCapture] = useState(false);

  const handleSummarize = useCallback(async () => {
    if (!selectedNote?.content || isSummarizing) return;
    
    setIsSummarizing(true);
    setSummary(null);
    
    try {
      const text = extractTextFromContent(selectedNote.content);
      if (!text.trim()) {
        setSummary("Aucun contenu à résumer.");
        return;
      }
      
      const result = await invoke<string>("summarize_note", { content: text });
      setSummary(result || "Résumé vide.");
    } catch (error) {
      setSummary(`Erreur: ${error}. Vérifiez qu'Ollama est lancé avec le modèle mistral.`);
    } finally {
      setIsSummarizing(false);
    }
  }, [selectedNote, isSummarizing]);

  const handleSelectNote = useCallback(
    (note: typeof selectedNote) => {
      selectNote(note);
      if (note) setView("editor");
    },
    [selectNote]
  );

  const handleBack = useCallback(() => {
    setView("home");
    selectNote(null);
  }, [selectNote]);

  const handleSaveContent = useCallback(
    async (content: string) => {
      if (!selectedNote) return;
      await updateNote(selectedNote.id, { content });
    },
    [selectedNote, updateNote]
  );

  const { status: saveStatus, save: triggerSave } = useAutoSave({
    onSave: handleSaveContent,
  });

  const handleContentChange = useCallback(
    (content: string) => {
      triggerSave(content);
    },
    [triggerSave]
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedNote) return;
      updateNote(selectedNote.id, { title: e.target.value });
    },
    [selectedNote, updateNote]
  );

  const handleCreateNote = useCallback(async () => {
    const note = await createNote();
    if (note) {
      setView("editor");
    }
  }, [createNote]);

  // Check if this is the quick-capture window
  useEffect(() => {
    const appWindow = getCurrentWindow();
    if (appWindow.label === "quick-capture") {
      setIsQuickCapture(true);
    }
  }, []);

  // Quick capture save handler
  const handleQuickCaptureSave = useCallback(async (content: string) => {
    const note = await createNote();
    if (note) {
      await updateNote(note.id, { 
        title: content.split('\n')[0].slice(0, 50) || "Quick note",
        content: JSON.stringify([{
          type: "paragraph",
          content: [{ type: "text", text: content }]
        }])
      });
    }
  }, [createNote, updateNote]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view !== "editor") return;

      if (e.key === "Escape") {
        e.preventDefault();
        handleBack();
      }
      if (e.key.toLowerCase() === "p" && e.ctrlKey) {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, handleBack]);

  // Listen for refresh-notes event from Quick Capture window
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const unlisten = appWindow.listen("refresh-notes", () => {
      // Refresh notes list
      window.location.reload();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);


  // Render Quick Capture mode
  if (isQuickCapture) {
    return (
      <MantineProvider>
        <QuickCapture onSave={handleQuickCaptureSave} />
      </MantineProvider>
    );
  }

  return (
    <MantineProvider>
      <TitleBar saveStatus={saveStatus} />
      
      <AnimatePresence mode="wait">
        {view === "home" ? (
          <motion.div
            key="home"
            className="h-screen w-screen"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <CommandPalette
              notes={notes}
              onSelectNote={handleSelectNote}
              onCreateNote={handleCreateNote}
              onSeedNotes={seedNotes}
              isLoading={isLoading}
            />
          </motion.div>
        ) : (
          <motion.div
            key="editor"
            className="h-screen w-screen"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <Layout
              notes={notes}
              selectedNote={selectedNote}
              onSelectNote={handleSelectNote}
              onCreateNote={handleCreateNote}
              onDeleteNote={deleteNote}
              showSidebar={true}
              summary={summary}
              isSummarizing={isSummarizing}
              onSummarize={handleSummarize}
            >
              {/* Editor header - minimal and clean */}
              <div className="mb-6 space-y-3">
                {/* Back button */}
                <motion.button
                  onClick={handleBack}
                  className="flex cursor-pointer items-center gap-2 text-text-muted transition-colors hover:text-text leading-none"
                  whileHover={{ x: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="font-mono text-[10px] uppercase tracking-widest leading-none">Retour</span>
                </motion.button>

                {/* Title input */}
                <input
                  type="text"
                  value={selectedNote?.title || ""}
                  onChange={handleTitleChange}
                  placeholder="Commencez à écrire..."
                  className="w-full bg-transparent font-semibold tracking-tight text-text outline-none placeholder:text-text-ghost"
                  style={{ fontSize: "3rem", lineHeight: 1.1 }}
                />

                {/* Metadata bar */}
                <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                  {selectedNote && (
                    <>
                      <span>{countWords(selectedNote.content)} mots</span>
                      <span className="mx-2">•</span>
                      <span>~{Math.max(1, Math.ceil(countWords(selectedNote.content) / 200))} min</span>
                    </>
                  )}
                </div>
              </div>

              {/* Editor content */}
              {selectedNote && (
                <Editor
                  key={selectedNote.id}
                  initialContent={selectedNote.content || undefined}
                  onChange={handleContentChange}
                />
              )}
            </Layout>
          </motion.div>
        )}
      </AnimatePresence>
    </MantineProvider>
  );
}

export default App;

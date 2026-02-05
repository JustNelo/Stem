import { useCallback, useState, useEffect } from "react";
import { MantineProvider } from "@mantine/core";
import { motion, AnimatePresence } from "framer-motion";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import "@mantine/core/styles.css";

import Editor from "./components/Editor";
import { CommandPalette } from "./components/CommandPalette";
import { EditorSidebar } from "./components/EditorSidebar";
import { useNotes } from "./hooks/useNotes";
import { useAutoSave } from "./hooks/useAutoSave";
import { formatRelativeTime, countWords } from "./lib/format";

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
    selectNote,
  } = useNotes();

  const [view, setView] = useState<View>("home");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

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

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view !== "editor") return;

      if (e.key === "Escape") {
        e.preventDefault();
        if (isSidebarOpen) {
          setIsSidebarOpen(false);
        } else {
          handleBack();
        }
      }
      if (e.key.toLowerCase() === "p" && e.ctrlKey) {
        e.preventDefault();
        handleBack();
      }
      if (e.key.toLowerCase() === "b" && e.ctrlKey) {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, handleBack, isSidebarOpen]);

  // Listen for quick-capture global shortcut event
  useEffect(() => {
    const unlisten = listen("quick-capture", () => {
      handleCreateNote();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [handleCreateNote]);

  return (
    <MantineProvider>
      <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-black">
        {/* Noise overlay */}
        <div className="noise absolute inset-0 z-50" />

        <AnimatePresence mode="wait">
          {view === "home" ? (
            <motion.div
              key="home"
              className="flex h-full flex-col"
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
                isLoading={isLoading}
              />
            </motion.div>
          ) : (
            <motion.div
              key="editor"
              className="flex h-full flex-col"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              {/* Sidebar */}
              <EditorSidebar
                notes={notes}
                selectedNote={selectedNote}
                onSelectNote={handleSelectNote}
                onCreateNote={handleCreateNote}
                isOpen={isSidebarOpen}
                onToggle={toggleSidebar}
              />

              {/* Editor header */}
              <header className="relative z-10 flex h-16 shrink-0 items-center gap-4 border-b border-zinc-800/50 bg-black px-4">
                <motion.button
                  onClick={handleBack}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500 transition-colors duration-150 hover:bg-zinc-900 hover:text-white"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Retour
                </motion.button>

                <div className="h-6 w-px bg-zinc-800" />

                <div className="flex flex-1 flex-col gap-0.5">
                  <input
                    type="text"
                    value={selectedNote?.title || ""}
                    onChange={handleTitleChange}
                    placeholder="Sans titre"
                    className="bg-transparent text-xl font-semibold text-white outline-none placeholder:text-zinc-700"
                  />
                  <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                    {selectedNote && (
                      <>
                        <span>{formatRelativeTime(selectedNote.updated_at)}</span>
                        <span className="text-zinc-800">•</span>
                        <span>{countWords(selectedNote.content)} mots</span>
                      </>
                    )}
                  </div>
                </div>

                <motion.button
                  onClick={handleSummarize}
                  disabled={isSummarizing}
                  className="flex items-center gap-2 rounded-lg bg-purple-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-purple-400 transition-colors duration-150 hover:bg-purple-500/20 disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-sm">✦</span>
                  {isSummarizing ? "Résumé..." : "Résumer"}
                </motion.button>

                <SaveIndicator status={saveStatus} />
              </header>

              {/* AI Summary panel */}
              <AnimatePresence>
                {summary && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="relative z-10 overflow-hidden border-b border-zinc-800/50 bg-purple-500/5"
                  >
                    <div className="flex items-start gap-3 px-4 py-3">
                      <span className="mt-0.5 text-purple-400">✦</span>
                      <div className="flex-1">
                        <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-purple-400">
                          Résumé IA
                        </div>
                        <p className="text-sm leading-relaxed text-zinc-300">
                          {summary}
                        </p>
                      </div>
                      <button
                        onClick={() => setSummary(null)}
                        className="text-zinc-600 transition-colors hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Editor content */}
              <main className="relative z-10 flex-1 overflow-auto">
                {/* Background gradient */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-zinc-900/50 via-black to-black" />

                {selectedNote && (
                  <div className="relative mx-auto max-w-3xl px-6 py-12">
                    <Editor
                      key={selectedNote.id}
                      initialContent={selectedNote.content || undefined}
                      onChange={handleContentChange}
                    />
                  </div>
                )}
              </main>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MantineProvider>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function SaveIndicator({ status }: { status: "idle" | "saving" | "saved" }) {
  return (
    <AnimatePresence mode="wait">
      {status !== "idle" && (
        <motion.div
          key={status}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-zinc-600"
        >
          {status === "saving" ? (
            <>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="h-1.5 w-1.5 rounded-full bg-zinc-500"
              />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              />
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                Saved
              </motion.span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;

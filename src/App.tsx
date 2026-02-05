import { useCallback, useState, useEffect, useRef } from "react";
import { MantineProvider } from "@mantine/core";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "@mantine/core/styles.css";

import Editor from "@/components/Editor";
import { CommandPalette } from "@/components/CommandPalette";
import { TitleBar } from "@/components/TitleBar";
import { Layout } from "@/components/layout";
import { QuickCapture } from "@/components/QuickCapture";
import { useNotesStore } from "@/store/useNotesStore";
import { useSettingsStore, applyPersistedSettings } from "@/store/useSettingsStore";
import { Onboarding } from "@/components/Onboarding";
import { TagPicker } from "@/components/TagPicker";
import { Settings } from "@/components/Settings";
import { ToastContainer } from "@/components/ToastContainer";
import { useAutoSave } from "@/hooks/useAutoSave";
import { countWords } from "@/lib/format";

// Apply persisted settings (theme, font) to DOM on load
applyPersistedSettings();

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

type View = "home" | "editor" | "settings";

function App() {
  const { hasCompletedOnboarding, ollamaModel, ollamaUrl } = useSettingsStore();
  const {
    selectedNote,
    createNote,
    updateNote,
    selectNote,
    fetchNotes,
  } = useNotesStore();

  useEffect(() => {
    fetchNotes();
  }, []);

  const [view, setView] = useState<View>("home");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isQuickCapture, setIsQuickCapture] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Local title state to avoid re-rendering the whole tree on each keystroke
  const [localTitle, setLocalTitle] = useState("");
  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local title only when switching to a different note
  useEffect(() => {
    setLocalTitle(selectedNote?.title || "");
    // Cleanup any pending title save from the previous note
    return () => {
      if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
    };
  }, [selectedNote?.id]);

  // Sync view with selected note
  useEffect(() => {
    if (selectedNote) {
      setView("editor");
    } else {
      setView("home");
    }
  }, [selectedNote]);

  // Handle AI commands from Copilot sidebar
  const handleExecuteCommand = useCallback(async (command: string, args?: string): Promise<string> => {
    if (!selectedNote?.content) {
      return "Aucune note sélectionnée.";
    }
    
    setIsProcessing(true);
    
    try {
      const text = extractTextFromContent(selectedNote.content);
      if (!text.trim()) {
        return "Aucun contenu dans la note.";
      }

      // Build prompt based on command
      let prompt = "";
      switch (command) {
        case "summarize":
          prompt = `Résume ce texte de manière concise:\n\n${text}`;
          break;
        case "translate":
          prompt = `Traduis ce texte en anglais:\n\n${text}`;
          break;
        case "correct":
          prompt = `Corrige l'orthographe et la grammaire de ce texte, retourne uniquement le texte corrigé:\n\n${text}`;
          break;
        case "explain":
          prompt = `Explique ce texte de manière simple et accessible:\n\n${text}`;
          break;
        case "ideas":
          prompt = `Génère 5 idées créatives basées sur ce texte:\n\n${text}`;
          break;
        case "tags":
          prompt = `Suggère 5 tags pertinents pour catégoriser ce texte (retourne uniquement les tags séparés par des virgules):\n\n${text}`;
          break;
        case "ask":
          prompt = `Tu es un assistant intelligent. L'utilisateur travaille sur une note dont voici le contenu:\n\n---\n${text}\n---\n\nL'utilisateur te pose cette question: "${args}"\n\nRéponds de manière utile et concise à sa question. Si la question n'a pas de rapport avec la note, réponds quand même du mieux possible.`;
          break;
        default:
          prompt = `${args || "Analyse ce texte"}:\n\n${text}`;
      }
      
      const result = await invoke<string>("summarize_note", {
        content: prompt,
        model: ollamaModel,
        ollamaUrl,
      });
      return result || "Résultat vide.";
    } catch (error) {
      throw new Error(`${error}. Vérifiez qu'Ollama est lancé.`);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedNote, ollamaModel, ollamaUrl]);

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
      const value = e.target.value;
      const noteId = selectedNote.id;
      setLocalTitle(value);
      // Debounce the actual save
      if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
      titleSaveTimer.current = setTimeout(() => {
        updateNote(noteId, { title: value });
      }, 400);
    },
    [selectedNote, updateNote]
  );

  // Check if this is the quick-capture window
  useEffect(() => {
    const appWindow = getCurrentWindow();
    if (appWindow.label === "quick-capture") {
      setIsQuickCapture(true);
    }
  }, []);

  // Quick capture save handler
  const handleQuickCaptureSave = useCallback(async (content: string) => {
    try {
      const note = await createNote();
      if (!note) {
        console.error("Failed to create note for quick capture");
        return;
      }
      await updateNote(note.id, { 
        title: content.split('\n')[0].slice(0, 50) || "Quick note",
        content: JSON.stringify([{
          type: "paragraph",
          content: [{ type: "text", text: content }]
        }])
      });
    } catch (error) {
      console.error("Error saving quick capture:", error);
    }
  }, [createNote, updateNote]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global shortcuts
      if (e.key === "," && e.ctrlKey) {
        e.preventDefault();
        setShowSettings((prev) => !prev);
        return;
      }

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
    let unlistenFn: (() => void) | null = null;
    
    appWindow.listen("refresh-notes", () => {
      // Refresh notes list without full page reload
      fetchNotes();
    }).then((fn) => {
      unlistenFn = fn;
    });

    return () => {
      if (unlistenFn) unlistenFn();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Render Quick Capture mode
  if (isQuickCapture) {
    return (
      <MantineProvider>
        <QuickCapture onSave={handleQuickCaptureSave} />
      </MantineProvider>
    );
  }

  // Render Onboarding on first launch
  if (!hasCompletedOnboarding) {
    return (
      <MantineProvider>
        <Onboarding />
      </MantineProvider>
    );
  }

  // Render Settings as overlay
  if (showSettings) {
    return (
      <MantineProvider>
        <TitleBar />
        <Settings onClose={() => setShowSettings(false)} />
      </MantineProvider>
    );
  }

  return (
    <MantineProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden">
      <TitleBar onOpenSettings={() => setShowSettings(true)} />
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
              {/* Editor header - minimal and clean */}
              <div className="mb-6 space-y-3">
                {/* Back button */}
                <motion.button
                  onClick={handleBack}
                  className="flex cursor-pointer items-center gap-2 text-text-muted transition-colors hover:text-text leading-none"
                  whileHover={{ x: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ArrowLeft size={10} />
                  <span className="font-mono text-[10px] uppercase tracking-widest leading-none">Retour</span>
                </motion.button>

                {/* Title input */}
                <input
                  type="text"
                  value={localTitle}
                  onChange={handleTitleChange}
                  placeholder="Commencez à écrire..."
                  className="w-full bg-transparent text-5xl font-semibold tracking-tight text-text outline-none placeholder:text-text-ghost"
                />

                {/* Tags */}
                {selectedNote && (
                  <TagPicker noteId={selectedNote.id} />
                )}

                {/* Metadata bar */}
                <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                  {selectedNote && (
                    <span>~{Math.max(1, Math.ceil(countWords(selectedNote.content) / 200))} min de lecture</span>
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
      </div>
      </div>
    </MantineProvider>
  );
}

export default App;

import { useCallback, useState } from "react";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";

import Editor from "./components/Editor";
import { CommandPalette } from "./components/CommandPalette";
import { useNotes } from "./hooks/useNotes";
import { useAutoSave } from "./hooks/useAutoSave";

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

  return (
    <MantineProvider>
      <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-black">
        {/* Noise overlay */}
        <div className="noise absolute inset-0 z-50" />

        {view === "home" ? (
          <CommandPalette
            notes={notes}
            onSelectNote={handleSelectNote}
            onCreateNote={handleCreateNote}
            isLoading={isLoading}
          />
        ) : (
          <>
            {/* Editor header */}
            <header className="relative z-10 flex h-14 shrink-0 items-center gap-4 border-b border-zinc-800/50 bg-black px-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500 transition-colors duration-150 hover:bg-zinc-900 hover:text-white"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Retour
              </button>

              <div className="h-4 w-px bg-zinc-800" />

              <input
                type="text"
                value={selectedNote?.title || ""}
                onChange={handleTitleChange}
                placeholder="Sans titre"
                className="flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-zinc-700"
              />

              <SaveIndicator status={saveStatus} />
            </header>

            {/* Editor content */}
            <main className="relative z-10 flex-1 overflow-auto">
              {/* Background gradient */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/50 via-black to-black" />

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
          </>
        )}
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
  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
      {status === "saving" ? (
        <>
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500" />
          <span>Saving...</span>
        </>
      ) : (
        <>
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Saved</span>
        </>
      )}
    </div>
  );
}

export default App;

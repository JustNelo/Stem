import { useCallback, useRef } from "react";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import Editor from "./components/Editor";
import Sidebar from "./components/Sidebar";
import { useNotes } from "./hooks/useNotes";

function App() {
  const {
    notes,
    selectedNote,
    isLoading,
    createNote,
    updateNote,
    deleteNote,
    selectNote,
  } = useNotes();

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleContentChange = useCallback(
    (content: string) => {
      if (!selectedNote) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        updateNote(selectedNote.id, { content });
      }, 500);
    },
    [selectedNote, updateNote]
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedNote) return;
      updateNote(selectedNote.id, { title: e.target.value });
    },
    [selectedNote, updateNote]
  );

  return (
    <MantineProvider>
      <div className="flex h-screen w-screen bg-white">
        <Sidebar
          notes={notes}
          selectedNote={selectedNote}
          onSelectNote={selectNote}
          onCreateNote={createNote}
          onDeleteNote={deleteNote}
          isLoading={isLoading}
        />

        <div className="flex flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center border-b border-gray-200 px-4">
            {selectedNote ? (
              <input
                type="text"
                value={selectedNote.title}
                onChange={handleTitleChange}
                className="w-full bg-transparent text-lg font-semibold text-gray-800 outline-none placeholder:text-gray-400"
                placeholder="Titre de la note..."
              />
            ) : (
              <h1 className="text-lg font-semibold text-gray-800">STEM</h1>
            )}
          </header>

          <main className="flex-1 overflow-auto">
            {selectedNote ? (
              <div className="mx-auto max-w-4xl p-4">
                <Editor
                  key={selectedNote.id}
                  initialContent={selectedNote.content || undefined}
                  onChange={handleContentChange}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-lg text-gray-500">
                    Sélectionnez une note ou créez-en une nouvelle
                  </p>
                  <button
                    onClick={createNote}
                    className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                  >
                    + Nouvelle note
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </MantineProvider>
  );
}

export default App;

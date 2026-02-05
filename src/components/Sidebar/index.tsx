import type { Note } from "../../types";

interface SidebarProps {
  notes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  isLoading: boolean;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function Sidebar({
  notes,
  selectedNote,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  isLoading,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between border-b border-gray-200 p-3">
        <span className="text-sm font-medium text-gray-600">Notes</span>
        <button
          onClick={onCreateNote}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          + Nouvelle
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <span className="text-sm text-gray-500">Chargement...</span>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <p className="text-sm text-gray-500">Aucune note</p>
            <p className="mt-1 text-xs text-gray-400">
              Créez votre première note
            </p>
          </div>
        ) : (
          <ul className="py-2">
            {notes.map((note) => (
              <li key={note.id}>
                <button
                  onClick={() => onSelectNote(note)}
                  className={`group flex w-full items-start justify-between px-3 py-2 text-left transition-colors ${
                    selectedNote?.id === note.id
                      ? "bg-gray-200"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {note.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDate(note.updated_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNote(note.id);
                    }}
                    className="ml-2 rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-gray-300 hover:text-red-600 group-hover:opacity-100"
                    title="Supprimer"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;

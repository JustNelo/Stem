import type { Note } from "../../types";
import { cn, formatDate } from "../../lib";
import { Button, IconButton, PlusIcon, TrashIcon } from "../ui";

interface SidebarProps {
  notes: Note[];
  selectedNote: Note | null;
  onSelectNote: (note: Note) => void;
  onCreateNote: () => void;
  onDeleteNote: (id: string) => void;
  isLoading: boolean;
  isCollapsed: boolean;
}

export function Sidebar({
  notes,
  selectedNote,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  isLoading,
  isCollapsed,
}: SidebarProps) {
  if (isCollapsed) return null;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r-2 border-border-light bg-bg-secondary">
      <div className="flex items-center justify-between border-b-2 border-border-light p-3">
        <span className="text-sm font-bold uppercase tracking-wider text-text-secondary">
          Notes
        </span>
        <Button onClick={onCreateNote} size="sm">
          <PlusIcon className="mr-1 h-3 w-3" />
          New
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <span className="text-sm text-text-muted">Loading...</span>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <p className="text-sm font-medium text-text-secondary">No notes yet</p>
            <p className="mt-1 text-xs text-text-muted">
              Create your first note
            </p>
          </div>
        ) : (
          <ul>
            {notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                isSelected={selectedNote?.id === note.id}
                onSelect={() => onSelectNote(note)}
                onDelete={() => onDeleteNote(note.id)}
              />
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
}

interface NoteItemProps {
  note: Note;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function NoteItem({ note, isSelected, onSelect, onDelete }: NoteItemProps) {
  return (
    <li>
      <button
        onClick={onSelect}
        className={cn(
          "group flex w-full items-start justify-between px-3 py-2.5 text-left transition-colors duration-150",
          isSelected
            ? "border-l-2 border-text bg-bg-hover"
            : "border-l-2 border-transparent hover:bg-bg-hover"
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text">
            {note.title || "Sans titre"}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {formatDate(note.updated_at)}
          </p>
        </div>
        <IconButton
          icon={<TrashIcon />}
          label="Delete"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100"
        />
      </button>
    </li>
  );
}

export default Sidebar;

import { memo } from "react";
import { Pin, Trash2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import { IconButton } from "@/components/ui/IconButton";
import type { Note } from "@/types";

interface NoteListItemProps {
  note: Note;
  isSelected: boolean;
  onSelect: (note: Note) => void;
  onTogglePin: (id: string) => void;
  onRequestDelete: (id: string) => void;
}

export const NoteListItem = memo(function NoteListItem({
  note,
  isSelected,
  onSelect,
  onTogglePin,
  onRequestDelete,
}: NoteListItemProps) {
  return (
    <div
      className={`group relative flex w-full items-center rounded-lg transition-colors ${
        isSelected ? "bg-surface-hover" : "hover:bg-surface-hover"
      }`}
    >
      <button
        onClick={() => onSelect(note)}
        className="min-w-0 flex-1 cursor-pointer px-3 py-2 text-left"
      >
        <div className="mb-1 truncate text-sm font-medium tracking-tight text-text">
          {note.title || "Sans titre"}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
          {formatRelativeTime(note.updated_at)}
        </span>
      </button>
      <div className="mr-2 flex shrink-0 items-center gap-0.5">
        <span className={note.is_pinned ? "text-text-secondary" : "opacity-0 group-hover:opacity-100"}>
          <IconButton
            label={note.is_pinned ? "Désépingler" : "Épingler"}
            onClick={(e) => { e.stopPropagation(); onTogglePin(note.id); }}
          >
            <Pin size={12} className={note.is_pinned ? "fill-current" : ""} />
          </IconButton>
        </span>
        <span className="opacity-0 group-hover:opacity-100">
          <IconButton
            variant="danger"
            label="Supprimer"
            onClick={(e) => { e.stopPropagation(); onRequestDelete(note.id); }}
          >
            <Trash2 size={12} />
          </IconButton>
        </span>
      </div>
    </div>
  );
});

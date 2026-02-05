import { memo } from "react";
import { Pin, Trash2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import type { Note } from "@/types";
import type { Tag } from "@/types/tag";

interface NoteListItemProps {
  note: Note;
  isSelected: boolean;
  tags: Tag[];
  onSelect: (note: Note) => void;
  onTogglePin: (id: string) => void;
  onRequestDelete: (id: string) => void;
}

export const NoteListItem = memo(function NoteListItem({
  note,
  isSelected,
  tags,
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
        className="flex-1 cursor-pointer px-3 py-2 text-left"
      >
        <div className="mb-1 truncate text-sm font-medium tracking-tight text-text">
          {note.title || "Sans titre"}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
            {formatRelativeTime(note.updated_at)}
          </span>
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: tag.color }}
              title={tag.name}
            />
          ))}
        </div>
      </button>
      <div className="mr-2 flex shrink-0 items-center gap-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(note.id);
          }}
          className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded transition-all hover:bg-surface-hover hover:text-text ${
            note.is_pinned
              ? "text-text-secondary"
              : "text-text-ghost opacity-0 group-hover:opacity-100"
          }`}
          title={note.is_pinned ? "Désépingler" : "Épingler"}
        >
          <Pin size={12} className={note.is_pinned ? "fill-current" : ""} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete(note.id);
          }}
          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
          title="Supprimer"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
});

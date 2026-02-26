import { memo, useCallback } from "react";
import { Pin, Trash2, FileText } from "lucide-react";
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
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("application/stem-type", "note");
      e.dataTransfer.setData("application/stem-id", note.id);
      e.dataTransfer.effectAllowed = "move";
    },
    [note.id],
  );

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`group relative flex w-full items-center rounded-md transition-all duration-150 ${
        isSelected
          ? "bg-surface-hover/80"
          : "hover:bg-surface-hover/50"
      }`}
    >
      <button
        draggable={false}
        onClick={() => onSelect(note)}
        className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 px-2.5 py-2 text-left"
      >
        <FileText
          size={14}
          className={`mt-0.5 shrink-0 ${isSelected ? "text-text-secondary" : "text-text-ghost"}`}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium tracking-tight text-text">
            {note.title || "Sans titre"}
          </div>
          <span className="text-[10px] text-text-muted">
            {formatRelativeTime(note.updated_at)}
          </span>
        </div>
      </button>
      <div className="mr-1.5 flex shrink-0 items-center gap-0.5">
        <span className={`transition-opacity duration-150 ${note.is_pinned ? "text-text-secondary" : "opacity-0 group-hover:opacity-100"}`}>
          <IconButton
            label={note.is_pinned ? "Désépingler" : "Épingler"}
            onClick={(e) => { e.stopPropagation(); onTogglePin(note.id); }}
          >
            <Pin size={11} className={note.is_pinned ? "fill-current" : ""} />
          </IconButton>
        </span>
        <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <IconButton
            variant="danger"
            label="Supprimer"
            onClick={(e) => { e.stopPropagation(); onRequestDelete(note.id); }}
          >
            <Trash2 size={11} />
          </IconButton>
        </span>
      </div>
    </div>
  );
});

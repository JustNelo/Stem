import { memo, useState, useCallback, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { ChevronRight, FolderOpen, Folder, Trash2, Pencil } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import type { Note, Folder as FolderType } from "@/types";
import { NoteListItem } from "./NoteListItem";

interface FolderItemProps {
  folder: FolderType;
  notes: Note[];
  isExpanded: boolean;
  selectedNoteId: string | undefined;
  onToggleExpand: (id: string) => void;
  onSelectNote: (note: Note) => void;
  onTogglePin: (id: string) => void;
  onRequestDeleteNote: (id: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
}

export const FolderItem = memo(function FolderItem({
  folder,
  notes,
  isExpanded,
  selectedNoteId,
  onToggleExpand,
  onSelectNote,
  onTogglePin,
  onRequestDeleteNote,
  onRenameFolder,
  onDeleteFolder,
}: FolderItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setNodeRef, isOver } = useDroppable({ id: `folder-${folder.id}` });

  const handleRenameSubmit = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== folder.name) {
      onRenameFolder(folder.id, trimmed);
    }
    setIsRenaming(false);
  }, [renameValue, folder.id, folder.name, onRenameFolder]);

  const startRename = useCallback(() => {
    setRenameValue(folder.name);
    setIsRenaming(true);
  }, [folder.name]);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const FolderIcon = isExpanded ? FolderOpen : Folder;

  return (
    <div ref={setNodeRef}>
      {/* Folder header */}
      <div
        className={`group flex w-full items-center rounded-md transition-all duration-150 ${
          isOver
            ? "bg-accent/10 ring-1 ring-accent/30"
            : "hover:bg-surface-hover/50"
        }`}
      >
        <button
          onClick={() => onToggleExpand(folder.id)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-left"
        >
          <ChevronRight
            size={12}
            className={`shrink-0 text-text-muted transition-transform duration-150 ${
              isExpanded ? "rotate-90" : ""
            }`}
          />
          <FolderIcon size={14} className="shrink-0 text-text-muted" />
          {isRenaming ? (
            <input
              ref={inputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit();
                if (e.key === "Escape") setIsRenaming(false);
              }}
              onClick={(e) => e.stopPropagation()}
              className="min-w-0 flex-1 rounded bg-surface px-1 text-[13px] font-medium text-text outline-none ring-1 ring-border"
            />
          ) : (
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">
              {folder.name}
            </span>
          )}
          {notes.length > 0 && !isRenaming && (
            <span className="shrink-0 text-[10px] text-text-ghost">
              {notes.length}
            </span>
          )}
        </button>
        <div className="mr-1.5 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <IconButton label="Renommer" onClick={startRename}>
            <Pencil size={10} />
          </IconButton>
          <IconButton
            variant="danger"
            label="Supprimer le dossier"
            onClick={() => onDeleteFolder(folder.id)}
          >
            <Trash2 size={10} />
          </IconButton>
        </div>
      </div>

      {/* Notes inside folder */}
      {isExpanded && notes.length > 0 && (
        <div className="ml-4 border-l border-border/50 pl-1">
          {notes.map((note) => (
            <NoteListItem
              key={note.id}
              note={note}
              isSelected={selectedNoteId === note.id}
              onSelect={onSelectNote}
              onTogglePin={onTogglePin}
              onRequestDelete={onRequestDeleteNote}
            />
          ))}
        </div>
      )}
    </div>
  );
});

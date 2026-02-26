import { memo, useState, useCallback, useRef, useEffect } from "react";
import { ChevronRight, FolderOpen, Folder, Trash2, Pencil, Plus } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import type { Note, Folder as FolderType } from "@/types";
import { NoteListItem } from "./NoteListItem";

export interface FolderTreeNode extends FolderType {
  children: FolderTreeNode[];
}

interface FolderItemProps {
  folder: FolderTreeNode;
  notes: Note[];
  folderNotesMap: Map<string, Note[]>;
  expandedFolders: Set<string>;
  selectedNoteId: string | undefined;
  depth?: number;
  onToggleExpand: (id: string) => void;
  onSelectNote: (note: Note) => void;
  onTogglePin: (id: string) => void;
  onRequestDeleteNote: (id: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onCreateSubFolder: (parentId: string) => void;
  onDropItem: (type: string, itemId: string, targetFolderId: string) => void;
}

export const FolderItem = memo(function FolderItem({
  folder,
  notes,
  folderNotesMap,
  expandedFolders,
  selectedNoteId,
  depth = 0,
  onToggleExpand,
  onSelectNote,
  onTogglePin,
  onRequestDeleteNote,
  onRenameFolder,
  onDeleteFolder,
  onCreateSubFolder,
  onDropItem,
}: FolderItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  const isExpanded = expandedFolders.has(folder.id);

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

  // Native drag: folder header is draggable
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("application/stem-type", "folder");
      e.dataTransfer.setData("application/stem-id", folder.id);
      e.dataTransfer.effectAllowed = "move";
    },
    [folder.id],
  );

  // Native drop: the whole folder container is a drop target
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current++;
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current <= 0) {
      dragCountRef.current = 0;
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCountRef.current = 0;
      setIsDragOver(false);

      const type = e.dataTransfer.getData("application/stem-type");
      const itemId = e.dataTransfer.getData("application/stem-id");
      if (type && itemId) {
        onDropItem(type, itemId, folder.id);
      }
    },
    [folder.id, onDropItem],
  );

  const FolderIcon = isExpanded ? FolderOpen : Folder;
  const hasChildren = folder.children.length > 0 || notes.length > 0;

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Folder header — draggable */}
      <div
        draggable
        onDragStart={handleDragStart}
        className={`group flex w-full items-center rounded-lg transition-all duration-200 ${
          isDragOver
            ? "bg-accent/10 ring-1 ring-accent/20 shadow-[0_0_10px_rgba(180,180,195,0.06)]"
            : "metallic-halo"
        }`}
      >
        <button
          draggable={false}
          onClick={() => onToggleExpand(folder.id)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-left"
        >
          <ChevronRight
            size={12}
            className={`shrink-0 text-text-muted transition-transform duration-150 ${
              isExpanded ? "rotate-90" : ""
            }`}
          />
          <FolderIcon size={14} className="shrink-0 text-text-muted transition-colors duration-200 group-hover:text-accent/70" />
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
          <IconButton label="Sous-dossier" onClick={() => onCreateSubFolder(folder.id)}>
            <Plus size={10} />
          </IconButton>
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

      {/* Children: sub-folders + notes */}
      {isExpanded && hasChildren && (
        <div className="ml-4 border-l border-border-metallic/30 pl-1">
          {/* Recursive sub-folders */}
          {folder.children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              notes={folderNotesMap.get(child.id) ?? []}
              folderNotesMap={folderNotesMap}
              expandedFolders={expandedFolders}
              selectedNoteId={selectedNoteId}
              depth={depth + 1}
              onToggleExpand={onToggleExpand}
              onSelectNote={onSelectNote}
              onTogglePin={onTogglePin}
              onRequestDeleteNote={onRequestDeleteNote}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onCreateSubFolder={onCreateSubFolder}
              onDropItem={onDropItem}
            />
          ))}
          {/* Notes in this folder */}
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

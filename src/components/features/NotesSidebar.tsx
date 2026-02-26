import { useCallback, useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Plus, ChevronLeft, ArrowDownAZ, CalendarArrowDown, Search, FolderPlus } from "lucide-react";
import { useNotesStore } from "@/store/useNotesStore";
import { useFoldersStore } from "@/store/useFoldersStore";
import { useNotesFilter } from "@/hooks/core/useNotesFilter";
import { FolderRepository } from "@/services/db";
import { NoteListItem } from "@/components/features/NoteListItem";
import { FolderItem, type FolderTreeNode } from "@/components/features/FolderItem";
import { IconButton } from "@/components/ui/IconButton";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { Folder } from "@/types";

const SIDEBAR_WIDTH = 260;

/** Native HTML5 drop zone for "root" (no folder) */
function RootDropZone({
  children,
  onDropItem,
}: {
  children: React.ReactNode;
  onDropItem: (type: string, itemId: string, targetFolderId: string | null) => void;
}) {
  const [isOver, setIsOver] = useState(false);
  const countRef = useRef(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    countRef.current++;
    setIsOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    countRef.current--;
    if (countRef.current <= 0) {
      countRef.current = 0;
      setIsOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      countRef.current = 0;
      setIsOver(false);
      const type = e.dataTransfer.getData("application/stem-type");
      const itemId = e.dataTransfer.getData("application/stem-id");
      if (type && itemId) {
        onDropItem(type, itemId, null);
      }
    },
    [onDropItem],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`min-h-[2rem] rounded-md transition-colors ${isOver ? "bg-accent/5" : ""}`}
    >
      {children}
    </div>
  );
}

/** Build a tree from flat folder list respecting parent_id */
function buildFolderTree(folders: Folder[]): FolderTreeNode[] {
  const map = new Map<string, FolderTreeNode>();
  for (const f of folders) {
    map.set(f.id, { ...f, children: [] });
  }
  const roots: FolderTreeNode[] = [];
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/** Check if `candidateId` is a descendant of `ancestorId` */
function isDescendant(folders: Folder[], candidateId: string, ancestorId: string): boolean {
  const byId = new Map(folders.map((f) => [f.id, f]));
  let current = byId.get(candidateId);
  while (current) {
    if (current.parent_id === ancestorId) return true;
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return false;
}

interface NotesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestDelete: (id: string) => void;
}

export function NotesSidebar({
  isOpen,
  onClose,
  onRequestDelete,
}: NotesSidebarProps) {
  const selectedNote = useNotesStore((s) => s.selectedNote);
  const selectNote = useNotesStore((s) => s.selectNote);
  const createNote = useNotesStore((s) => s.createNote);
  const togglePin = useNotesStore((s) => s.togglePin);
  const fetchNotes = useNotesStore((s) => s.fetchNotes);

  const folders = useFoldersStore((s) => s.folders);
  const expandedFolders = useFoldersStore((s) => s.expandedFolders);
  const toggleExpanded = useFoldersStore((s) => s.toggleExpanded);
  const createFolder = useFoldersStore((s) => s.createFolder);
  const renameFolder = useFoldersStore((s) => s.renameFolder);
  const deleteFolder = useFoldersStore((s) => s.deleteFolder);
  const moveFolder = useFoldersStore((s) => s.moveFolder);

  const {
    filtered,
    sortBy,
    toggleSort,
    searchQuery,
    setSearchQuery,
  } = useNotesFilter();

  // Build folder tree from flat list
  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  // Separate notes by folder membership
  const { folderNotesMap, looseNotes } = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    const loose: typeof filtered = [];

    for (const note of filtered) {
      if (note.folder_id) {
        const existing = map.get(note.folder_id) ?? [];
        existing.push(note);
        map.set(note.folder_id, existing);
      } else {
        loose.push(note);
      }
    }
    return { folderNotesMap: map, looseNotes: loose };
  }, [filtered]);

  const loosePinned = useMemo(() => looseNotes.filter((n) => n.is_pinned), [looseNotes]);
  const looseUnpinned = useMemo(() => looseNotes.filter((n) => !n.is_pinned), [looseNotes]);

  // Unified drop handler for both folders and root zone
  const handleDropItem = useCallback(
    async (type: string, itemId: string, targetFolderId: string | null) => {
      try {
        if (type === "note") {
          await FolderRepository.moveNoteToFolder(itemId, targetFolderId);
          await fetchNotes();
        } else if (type === "folder") {
          if (itemId === targetFolderId) return;
          if (targetFolderId && isDescendant(folders, targetFolderId, itemId)) return;
          await moveFolder(itemId, targetFolderId);
        }
      } catch (error) {
        console.error("Failed to move item:", error);
      }
    },
    [fetchNotes, folders, moveFolder],
  );

  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

  const handleConfirmDeleteFolder = useCallback(() => {
    if (folderToDelete) deleteFolder(folderToDelete);
    setFolderToDelete(null);
  }, [folderToDelete, deleteFolder]);

  const handleCreateFolder = useCallback(() => {
    createFolder("Nouveau dossier");
  }, [createFolder]);

  const handleCreateSubFolder = useCallback(
    (parentId: string) => {
      createFolder("Nouveau dossier", parentId);
    },
    [createFolder],
  );

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isOpen ? SIDEBAR_WIDTH : 0,
        opacity: isOpen ? 1 : 0,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative z-20 flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-surface-deep panel-acrylic"
    >
      <div style={{ width: SIDEBAR_WIDTH }} className="flex h-full flex-col pt-8">
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
            Notes
          </h2>
          <div className="flex items-center gap-1">
            <IconButton
              label={sortBy === "date" ? "Trier par titre" : "Trier par date"}
              onClick={toggleSort}
              className="btn-sculpted"
            >
              {sortBy === "date" ? (
                <CalendarArrowDown size={14} />
              ) : (
                <ArrowDownAZ size={14} />
              )}
            </IconButton>
            <IconButton label="Nouveau dossier" onClick={handleCreateFolder} className="btn-sculpted">
              <FolderPlus size={14} />
            </IconButton>
            <IconButton label="Nouvelle note (Ctrl+N)" onClick={() => createNote()} className="btn-sculpted">
              <Plus size={14} />
            </IconButton>
            <IconButton label="Fermer le panneau (Ctrl+B)" onClick={onClose}>
              <ChevronLeft size={14} />
            </IconButton>
          </div>
        </div>

        {/* Local search filter */}
        <div className="border-t border-b border-border px-3 py-2">
          <div className="flex items-center gap-2 rounded-lg border border-border-metallic/30 bg-surface-deep px-2.5 py-1.5 transition-all duration-200 focus-within:border-border-metallic focus-within:shadow-[0_0_8px_rgba(180,180,195,0.04)]">
            <Search size={12} className="text-text-ghost" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer..."
              className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-text-ghost"
            />
          </div>
        </div>

        {/* Notes + Folders list — entire area is a valid drop zone */}
        <div
          className="flex-1 overflow-y-auto px-2 py-2"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData("application/stem-type");
            const itemId = e.dataTransfer.getData("application/stem-id");
            if (type && itemId) {
              handleDropItem(type, itemId, null);
            }
          }}
        >
          {filtered.length === 0 && folders.length === 0 ? (
            <div className="px-2 py-8 text-center text-sm text-text-muted">
              Aucune note
            </div>
          ) : (
            <div className="space-y-0.5">
              {/* Pinned notes (always at top, outside folders) */}
              {loosePinned.length > 0 && (
                <>
                  <div className="px-2 pb-1 pt-2 text-[10px] uppercase tracking-widest text-text-muted">
                    Épinglées
                  </div>
                  {loosePinned.map((note) => (
                    <NoteListItem
                      key={note.id}
                      note={note}
                      isSelected={selectedNote?.id === note.id}
                      onSelect={selectNote}
                      onTogglePin={togglePin}
                      onRequestDelete={onRequestDelete}
                    />
                  ))}
                </>
              )}

              {/* Folders (tree) */}
              {folderTree.length > 0 && (
                <>
                  {loosePinned.length > 0 && (
                    <div className="pt-1" />
                  )}
                  {folderTree.map((folder) => (
                    <FolderItem
                      key={folder.id}
                      folder={folder}
                      notes={folderNotesMap.get(folder.id) ?? []}
                      folderNotesMap={folderNotesMap}
                      expandedFolders={expandedFolders}
                      selectedNoteId={selectedNote?.id}
                      onToggleExpand={toggleExpanded}
                      onSelectNote={selectNote}
                      onTogglePin={togglePin}
                      onRequestDeleteNote={onRequestDelete}
                      onRenameFolder={renameFolder}
                      onDeleteFolder={setFolderToDelete}
                      onCreateSubFolder={handleCreateSubFolder}
                      onDropItem={handleDropItem}
                    />
                  ))}
                </>
              )}

              {/* Loose unpinned notes */}
              {looseUnpinned.length > 0 && (
                <RootDropZone onDropItem={handleDropItem}>
                  {(folderTree.length > 0 || loosePinned.length > 0) && (
                    <div className="px-2 pb-1 pt-3 text-[10px] uppercase tracking-widest text-text-muted">
                      {folderTree.length > 0 ? "Non classées" : "Récentes"}
                    </div>
                  )}
                  {looseUnpinned.map((note) => (
                    <NoteListItem
                      key={note.id}
                      note={note}
                      isSelected={selectedNote?.id === note.id}
                      onSelect={selectNote}
                      onTogglePin={togglePin}
                      onRequestDelete={onRequestDelete}
                    />
                  ))}
                </RootDropZone>
              )}
            </div>
          )}
        </div>

        {/* Folder delete confirmation modal */}
        {folderToDelete && (
          <ConfirmModal
            title="Supprimer ce dossier ?"
            description="Les notes et sous-dossiers seront déplacés à la racine."
            confirmLabel="Supprimer"
            cancelLabel="Annuler"
            variant="danger"
            onConfirm={handleConfirmDeleteFolder}
            onCancel={() => setFolderToDelete(null)}
          />
        )}
      </div>
    </motion.aside>
  );
}

import { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Plus, ChevronLeft, ArrowDownAZ, CalendarArrowDown, Search, FolderPlus } from "lucide-react";
import { useNotesStore } from "@/store/useNotesStore";
import { useFoldersStore } from "@/store/useFoldersStore";
import { useNotesFilter } from "@/hooks/core/useNotesFilter";
import { FolderRepository } from "@/services/db";
import { NoteListItem } from "@/components/features/NoteListItem";
import { FolderItem } from "@/components/features/FolderItem";
import { IconButton } from "@/components/ui/IconButton";
import { useDroppable } from "@dnd-kit/core";

const SIDEBAR_WIDTH = 260;

function RootDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "folder-root" });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[2rem] rounded-md transition-colors ${isOver ? "bg-accent/5" : ""}`}
    >
      {children}
    </div>
  );
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

  const {
    filtered,
    pinned,
    sortBy,
    toggleSort,
    searchQuery,
    setSearchQuery,
  } = useNotesFilter();

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

  // DnD: require 5px movement before starting drag (avoids accidental drags on click)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const noteData = active.data.current;
      if (noteData?.type !== "note") return;

      const noteId = noteData.noteId as string;
      const overId = over.id as string;

      let targetFolderId: string | null = null;
      if (overId === "folder-root") {
        targetFolderId = null;
      } else if (overId.startsWith("folder-")) {
        targetFolderId = overId.replace("folder-", "");
      } else {
        return;
      }

      try {
        await FolderRepository.moveNoteToFolder(noteId, targetFolderId);
        await fetchNotes();
      } catch (error) {
        console.error("Failed to move note:", error);
      }
    },
    [fetchNotes],
  );

  const handleCreateFolder = useCallback(() => {
    createFolder("Nouveau dossier");
  }, [createFolder]);

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isOpen ? SIDEBAR_WIDTH : 0,
        opacity: isOpen ? 1 : 0,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative z-20 flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-surface-elevated"
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
            >
              {sortBy === "date" ? (
                <CalendarArrowDown size={14} />
              ) : (
                <ArrowDownAZ size={14} />
              )}
            </IconButton>
            <IconButton label="Nouveau dossier" onClick={handleCreateFolder}>
              <FolderPlus size={14} />
            </IconButton>
            <IconButton label="Nouvelle note (Ctrl+N)" onClick={() => createNote()}>
              <Plus size={14} />
            </IconButton>
            <IconButton label="Fermer le panneau (Ctrl+B)" onClick={onClose}>
              <ChevronLeft size={14} />
            </IconButton>
          </div>
        </div>

        {/* Local search filter */}
        <div className="border-t border-b border-border px-3 py-2">
          <div className="flex items-center gap-2 rounded-md bg-surface px-2 py-1.5">
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

        {/* Notes + Folders list */}
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-y-auto px-2 py-2">
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

                {/* Folders */}
                {folders.length > 0 && (
                  <>
                    {(loosePinned.length > 0 || pinned.length > 0) && (
                      <div className="pt-1" />
                    )}
                    {folders.map((folder) => (
                      <FolderItem
                        key={folder.id}
                        folder={folder}
                        notes={folderNotesMap.get(folder.id) ?? []}
                        isExpanded={expandedFolders.has(folder.id)}
                        selectedNoteId={selectedNote?.id}
                        onToggleExpand={toggleExpanded}
                        onSelectNote={selectNote}
                        onTogglePin={togglePin}
                        onRequestDeleteNote={onRequestDelete}
                        onRenameFolder={renameFolder}
                        onDeleteFolder={deleteFolder}
                      />
                    ))}
                  </>
                )}

                {/* Loose unpinned notes */}
                {looseUnpinned.length > 0 && (
                  <RootDropZone>
                    {(folders.length > 0 || loosePinned.length > 0) && (
                      <div className="px-2 pb-1 pt-3 text-[10px] uppercase tracking-widest text-text-muted">
                        {folders.length > 0 ? "Non classées" : "Récentes"}
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
        </DndContext>
      </div>
    </motion.aside>
  );
}

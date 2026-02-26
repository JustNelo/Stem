import { memo, useMemo } from "react";
import { GraduationCap, Folder, ChevronRight } from "lucide-react";
import { countWords } from "@/lib/format";
import { useFoldersStore } from "@/store/useFoldersStore";

interface EditorHeaderProps {
  localTitle: string;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  noteContent?: string | null;
  folderId?: string | null;
  onReview?: () => void;
}

export const EditorHeader = memo(function EditorHeader({
  localTitle,
  onTitleChange,
  noteContent,
  folderId,
  onReview,
}: EditorHeaderProps) {
  const folders = useFoldersStore((s) => s.folders);

  const folderName = useMemo(
    () => (folderId ? folders.find((f) => f.id === folderId)?.name : null),
    [folderId, folders],
  );

  const readingTime = useMemo(
    () => (noteContent != null ? Math.max(1, Math.ceil(countWords(noteContent) / 200)) : null),
    [noteContent]
  );

  return (
    <div className="mb-4 space-y-2">
      {/* Breadcrumb */}
      {folderName && (
        <div className="flex items-center gap-1 text-[11px] text-text-muted">
          <Folder size={11} className="text-accent/50" />
          <span>{folderName}</span>
          <ChevronRight size={10} className="text-text-ghost" />
        </div>
      )}

      {/* Title input */}
      <input
        type="text"
        value={localTitle}
        onChange={onTitleChange}
        placeholder="Commencez à écrire..."
        className="w-full bg-transparent text-2xl font-semibold tracking-tight text-text outline-none placeholder:text-text-ghost"
      />

      {/* Metadata bar */}
      <div className="flex items-center gap-3 text-[11px] text-text-muted">
        {readingTime != null && (
          <span>~{readingTime} min de lecture</span>
        )}
        {onReview && (
          <button
            onClick={onReview}
            className="btn-sculpted flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] transition-all duration-200 hover:text-text"
            title="Mode révision"
          >
            <GraduationCap size={10} />
            Réviser
          </button>
        )}
      </div>
    </div>
  );
});

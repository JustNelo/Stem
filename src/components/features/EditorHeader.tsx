import { memo, useMemo } from "react";
import { GraduationCap } from "lucide-react";
import { countWords } from "@/lib/format";

interface EditorHeaderProps {
  localTitle: string;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  noteContent?: string | null;
  onReview?: () => void;
}

export const EditorHeader = memo(function EditorHeader({
  localTitle,
  onTitleChange,
  noteContent,
  onReview,
}: EditorHeaderProps) {
  const readingTime = useMemo(
    () => (noteContent != null ? Math.max(1, Math.ceil(countWords(noteContent) / 200)) : null),
    [noteContent]
  );

  return (
    <div className="mb-6 space-y-3">
      {/* Title input */}
      <input
        type="text"
        value={localTitle}
        onChange={onTitleChange}
        placeholder="Commencez à écrire..."
        className="w-full bg-transparent text-4xl font-semibold tracking-tight text-text outline-none placeholder:text-text-ghost"
      />

      {/* Metadata bar */}
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-text-muted">
        {readingTime != null && (
          <span>~{readingTime} min de lecture</span>
        )}
        {onReview && (
          <button
            onClick={onReview}
            className="flex cursor-pointer items-center gap-1 rounded border border-border px-2 py-0.5 transition-colors hover:bg-surface-hover hover:text-text"
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

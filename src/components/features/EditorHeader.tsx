import { memo, useMemo } from "react";
import { countWords } from "@/lib/format";

interface EditorHeaderProps {
  localTitle: string;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  noteContent?: string | null;
}

export const EditorHeader = memo(function EditorHeader({
  localTitle,
  onTitleChange,
  noteContent,
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
      <div className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
        {readingTime != null && (
          <span>
            ~{readingTime} min de lecture
          </span>
        )}
      </div>
    </div>
  );
});

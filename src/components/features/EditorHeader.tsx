import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { TagPicker } from "@/components/TagPicker";
import { countWords } from "@/lib/format";

interface EditorHeaderProps {
  localTitle: string;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBack: () => void;
  noteId?: string;
  noteContent?: string | null;
}

export const EditorHeader = memo(function EditorHeader({
  localTitle,
  onTitleChange,
  onBack,
  noteId,
  noteContent,
}: EditorHeaderProps) {
  const readingTime = useMemo(
    () => (noteContent != null ? Math.max(1, Math.ceil(countWords(noteContent) / 200)) : null),
    [noteContent]
  );

  return (
    <div className="mb-6 space-y-3">
      {/* Back button */}
      <motion.button
        onClick={onBack}
        className="flex cursor-pointer items-center gap-2 text-text-muted transition-colors hover:text-text leading-none"
        whileHover={{ x: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        <ArrowLeft size={10} />
        <span className="font-mono text-[10px] uppercase tracking-widest leading-none">
          Retour
        </span>
      </motion.button>

      {/* Title input */}
      <input
        type="text"
        value={localTitle}
        onChange={onTitleChange}
        placeholder="Commencez à écrire..."
        className="w-full bg-transparent text-5xl font-semibold tracking-tight text-text outline-none placeholder:text-text-ghost"
      />

      {/* Tags */}
      {noteId && <TagPicker noteId={noteId} />}

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

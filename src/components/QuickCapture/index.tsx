import { useState, useEffect, useRef, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface QuickCaptureProps {
  onSave: (content: string) => Promise<void>;
}

export function QuickCapture({ onSave }: QuickCaptureProps) {
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const appWindow = getCurrentWindow();

  const handleClose = useCallback(async () => {
    await appWindow.close();
  }, [appWindow]);

  const handleSave = useCallback(async () => {
    if (!content.trim() || isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(content.trim());
      // Show success feedback before closing
      await new Promise(resolve => setTimeout(resolve, 300));
      await handleClose();
    } catch (e) {
      console.error("Save failed:", e);
      setIsSaving(false);
    }
  }, [content, isSaving, onSave, handleClose]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
      if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, handleSave]);

  const handleDrag = async (e: React.MouseEvent) => {
    if (e.button === 0) {
      try {
        await appWindow.startDragging();
      } catch (err) {
        console.error("Drag failed:", err);
      }
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-surface">
      {/* Minimal drag bar */}
      <div
        onMouseDown={handleDrag}
        className="flex h-6 shrink-0 cursor-default items-center justify-center"
      >
        <div className="h-1 w-8 rounded-full bg-border" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 pt-0">
        <motion.textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Première ligne = titre de la note..."
          className="flex-1 resize-none bg-transparent font-sans text-base leading-relaxed text-text outline-none placeholder:text-text-muted"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        />

        {/* Footer hint */}
        <div className="flex items-center justify-between pt-3 font-mono text-[10px] uppercase tracking-widest text-text-muted">
          <span>
            <kbd className="rounded bg-surface-hover px-1.5 py-0.5">Esc</kbd>
            {" "}cancel
          </span>
          <motion.span
            initial={{ opacity: 0.5 }}
            animate={{ opacity: content.trim() ? 1 : 0.5 }}
          >
            <kbd className="rounded bg-surface-hover px-1.5 py-0.5">Ctrl</kbd>
            {" + "}
            <kbd className="rounded bg-surface-hover px-1.5 py-0.5">Enter</kbd>
            {" "}save
          </motion.span>
        </div>
      </div>

      {/* Saving overlay */}
      {isSaving && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-surface/90 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex flex-col items-center gap-2"
          >
            <Check size={24} className="text-emerald-500" />
            <span className="font-mono text-xs uppercase tracking-widest text-text">
              Sauvegardé
            </span>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Loader2, X, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { useNotesStore } from "@/store/useNotesStore";
import { AIService } from "@/services/ai";
import { useSettingsStore } from "@/store/useSettingsStore";

interface ReviewModeProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedQuestion {
  category: string;
  text: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  compréhension: "bg-blue-500/15 text-blue-400",
  application: "bg-green-500/15 text-green-400",
  analyse: "bg-purple-500/15 text-purple-400",
};

function parseQuestions(raw: string): ParsedQuestion[] {
  const lines = raw.split("\n").filter((l) => l.trim());
  const questions: ParsedQuestion[] = [];

  for (const line of lines) {
    const cleaned = line.replace(/^[-*•\d.)\s]+/, "").trim();
    if (!cleaned || cleaned.length < 10) continue;

    const catMatch = /^(compréhension|application|analyse)\s*(?:question\s*)?[:\-–—]\s*/i.exec(cleaned);
    if (catMatch) {
      questions.push({
        category: catMatch[1].toLowerCase(),
        text: cleaned.slice(catMatch[0].length).trim(),
      });
    } else if (cleaned.endsWith("?")) {
      questions.push({ category: "compréhension", text: cleaned });
    }
  }

  return questions;
}

export function ReviewMode({ isOpen, onClose }: ReviewModeProps) {
  const selectedNote = useNotesStore((s) => s.selectedNote);
  const ollamaModel = useSettingsStore((s) => s.ollamaModel);
  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);

  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const generateQuestions = useCallback(async () => {
    if (!selectedNote?.content) return;

    setIsGenerating(true);
    setError(null);
    setQuestions([]);
    setRawContent(null);
    setExpandedIndex(null);

    try {
      const result = await AIService.executeCommand(
        "review",
        selectedNote.content,
        ollamaModel,
        ollamaUrl,
      );
      setRawContent(result);
      const parsed = parseQuestions(result);
      setQuestions(parsed.length > 0 ? parsed : [{ category: "compréhension", text: result }]);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsGenerating(false);
    }
  }, [selectedNote, ollamaModel, ollamaUrl]);

  // Auto-generate when modal opens
  useEffect(() => {
    if (isOpen && !rawContent && !isGenerating && selectedNote?.content) {
      generateQuestions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-center justify-center bg-text/20 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-xl border border-border bg-surface-elevated shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover">
                <GraduationCap size={16} className="text-text-secondary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text">Mode Révision</h2>
                <p className="text-[11px] text-text-muted">
                  {selectedNote?.title || "Sans titre"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
            >
              <X size={14} />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
            {isGenerating && (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 size={20} className="animate-spin text-text-muted" />
                <span className="text-xs text-text-muted">Génération des questions...</span>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-xs text-red-400">
                {error}
              </div>
            )}

            {questions.length > 0 && !isGenerating && (
              <div className="space-y-3">
                {questions.map((q, i) => {
                  const isExpanded = expandedIndex === i;
                  const colorClass = CATEGORY_COLORS[q.category] || "bg-surface-hover text-text-muted";

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="rounded-lg border border-border bg-surface"
                    >
                      <button
                        onClick={() => setExpandedIndex(isExpanded ? null : i)}
                        className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left"
                      >
                        <span className="mt-0.5 shrink-0 text-text-ghost">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${colorClass}`}>
                              {q.category}
                            </span>
                            <span className="font-mono text-[10px] text-text-ghost">
                              Q{i + 1}
                            </span>
                          </div>
                          <p className="text-[13px] leading-relaxed text-text-secondary">
                            {q.text}
                          </p>
                        </div>
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-border"
                          >
                            <div className="px-4 py-3">
                              <p className="text-xs italic text-text-ghost">
                                Prenez un moment pour formuler votre réponse avant de la vérifier dans vos notes.
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {questions.length === 0 && !isGenerating && !error && (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <GraduationCap size={24} className="text-text-ghost" />
                <span className="text-xs text-text-ghost">
                  Génération automatique en cours...
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <span className="text-[11px] text-text-ghost">
              {questions.length > 0 ? `${questions.length} question${questions.length > 1 ? "s" : ""}` : ""}
            </span>
            <button
              onClick={generateQuestions}
              disabled={isGenerating || !selectedNote?.content}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface-hover px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-border disabled:opacity-50"
            >
              <RefreshCw size={11} className={isGenerating ? "animate-spin" : ""} />
              Régénérer
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

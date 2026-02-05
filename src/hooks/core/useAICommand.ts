import { useState, useCallback } from "react";
import { z } from "zod";
import { safeInvoke } from "@/lib/tauri";
import { useNotesStore } from "@/store/useNotesStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { extractPlainText } from "@/lib/utils/text";
import { buildAIPrompt } from "@/lib/ai-prompts";

/**
 * Encapsulates AI command execution logic:
 * - Reads selectedNote, ollamaModel, ollamaUrl via granular selectors
 * - Manages isProcessing state
 * - Builds prompts and invokes Ollama via Tauri IPC
 */
export function useAICommand() {
  const selectedNote = useNotesStore((s) => s.selectedNote);
  const ollamaModel = useSettingsStore((s) => s.ollamaModel);
  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);

  const [isProcessing, setIsProcessing] = useState(false);

  const handleExecuteCommand = useCallback(
    async (command: string, args?: string): Promise<string> => {
      if (!selectedNote?.content) {
        return "Aucune note sélectionnée.";
      }

      setIsProcessing(true);

      try {
        const text = extractPlainText(selectedNote.content);
        if (!text.trim()) {
          return "Aucun contenu dans la note.";
        }

        const prompt = buildAIPrompt(command, text, args);

        const result = await safeInvoke("summarize_note", z.string(), {
          content: prompt,
          model: ollamaModel,
          ollamaUrl,
        });
        return result || "Résultat vide.";
      } catch (error) {
        throw new Error(`${error}. Vérifiez qu'Ollama est lancé.`);
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedNote, ollamaModel, ollamaUrl]
  );

  return { isProcessing, handleExecuteCommand };
}

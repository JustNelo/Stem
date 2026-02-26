import { useState, useCallback } from "react";
import { useNotesStore } from "@/store/useNotesStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { AIService } from "@/services/ai";

/**
 * Encapsulates AI command execution logic:
 * - Reads selectedNote, ollamaModel, ollamaUrl via granular selectors
 * - Manages isProcessing state
 * - Delegates to AIService for prompt building and IPC
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
        const result = await AIService.executeCommand(
          command,
          selectedNote.content,
          ollamaModel,
          ollamaUrl,
          args,
        );
        return result;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`${msg}. Vérifiez qu'Ollama est lancé.`);
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedNote, ollamaModel, ollamaUrl]
  );

  return { isProcessing, handleExecuteCommand };
}

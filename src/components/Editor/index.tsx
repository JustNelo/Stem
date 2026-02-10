import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./editor.css";

import { useCallback, useMemo } from "react";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useSettingsStore } from "@/store/useSettingsStore";
import { AIService } from "@/services/ai";
import { AI_SLASH_COMMANDS, createAISlashMenuItem } from "@/lib/slash-commands";

interface EditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
}

const DARK_THEMES = new Set(["dark", "nord", "ocean"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeParse(content: string | undefined): any[] | undefined {
  if (!content) return undefined;
  try {
    return JSON.parse(content);
  } catch {
    console.warn("Editor: failed to parse initial content, starting fresh.");
    return undefined;
  }
}

export function Editor({ initialContent, onChange }: EditorProps) {
  const theme = useSettingsStore((s) => s.theme);
  const ollamaModel = useSettingsStore((s) => s.ollamaModel);
  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);

  const editor = useCreateBlockNote({
    initialContent: safeParse(initialContent),
  });

  const editorTheme = DARK_THEMES.has(theme) ? "dark" : "light";

  // AI execution handler for slash commands — sends raw prompt to Ollama
  const handleAIExecute = useCallback(
    async (prompt: string): Promise<string> => {
      const result = await AIService.executeRawPrompt(prompt, ollamaModel, ollamaUrl);
      return result;
    },
    [ollamaModel, ollamaUrl],
  );

  // Build slash menu items: defaults + AI commands
  const getSlashMenuItems = useMemo(() => {
    return async (query: string) => {
      const defaultItems = getDefaultReactSlashMenuItems(editor);
      const aiItems = AI_SLASH_COMMANDS.map((cmd) =>
        createAISlashMenuItem(editor, cmd, handleAIExecute),
      );
      return filterSuggestionItems([...defaultItems, ...aiItems], query);
    };
  }, [editor, handleAIExecute]);

  const handleChange = () => {
    if (onChange) {
      const content = JSON.stringify(editor.document);
      onChange(content);
    }
  };

  return (
    <div className="editor-wrapper">
      <BlockNoteView editor={editor} onChange={handleChange} theme={editorTheme} slashMenu={false}>
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={getSlashMenuItems}
        />
      </BlockNoteView>
    </div>
  );
}

export default Editor;

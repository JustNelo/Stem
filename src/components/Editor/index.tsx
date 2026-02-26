import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./editor.css";

import { useCallback, useMemo } from "react";
import { BlockNoteSchema, createCodeBlockSpec } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { codeBlockOptions } from "@blocknote/code-block";
import { AIChatService } from "@/services/ai-chat";
import { useSettingsStore } from "@/store/useSettingsStore";
import type { ModelMessage } from "ai";
import { AI_SLASH_COMMANDS, createAISlashMenuItem } from "@/lib/slash-commands";

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    codeBlock: createCodeBlockSpec(codeBlockOptions),
  },
});

interface EditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
}

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
  const ollamaModel = useSettingsStore((s) => s.ollamaModel);
  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);

  const editor = useCreateBlockNote({
    schema,
    initialContent: safeParse(initialContent),
  });

  // AI execution handler for slash commands — streams via AI SDK
  const handleAIExecute = useCallback(
    async (prompt: string): Promise<string> => {
      const messages: ModelMessage[] = [
        { role: "system", content: "Tu es un assistant intelligent. Réponds TOUJOURS en français sauf si demande explicite. Utilise un style clair et structuré." },
        { role: "user", content: prompt },
      ];
      let result = "";
      for await (const token of AIChatService.stream(messages, ollamaModel, ollamaUrl)) {
        result += token;
      }
      return result || "Résultat vide.";
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
      <BlockNoteView editor={editor} onChange={handleChange} theme="dark" slashMenu={false}>
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={getSlashMenuItems}
        />
      </BlockNoteView>
    </div>
  );
}

export default Editor;

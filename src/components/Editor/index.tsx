import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./editor.css";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { useSettingsStore } from "@/store/useSettingsStore";

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
  const editor = useCreateBlockNote({
    initialContent: safeParse(initialContent),
  });

  const editorTheme = DARK_THEMES.has(theme) ? "dark" : "light";

  const handleChange = () => {
    if (onChange) {
      const content = JSON.stringify(editor.document);
      onChange(content);
    }
  };

  return (
    <div className="editor-wrapper">
      <BlockNoteView editor={editor} onChange={handleChange} theme={editorTheme} />
    </div>
  );
}

export default Editor;

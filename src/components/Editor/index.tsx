import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";

interface EditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
}

export function Editor({ initialContent, onChange }: EditorProps) {
  const editor = useCreateBlockNote({
    initialContent: initialContent ? JSON.parse(initialContent) : undefined,
  });

  const handleChange = () => {
    if (onChange) {
      const content = JSON.stringify(editor.document);
      onChange(content);
    }
  };

  return (
    <div className="h-full w-full">
      <BlockNoteView editor={editor} onChange={handleChange} theme="light" />
    </div>
  );
}

export default Editor;

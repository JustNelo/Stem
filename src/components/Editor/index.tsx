import "./editor.css";

import { useCallback, useRef } from "react";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Typography from "@tiptap/extension-typography";
import { Markdown } from "tiptap-markdown";
import { common, createLowlight } from "lowlight";

const lowlight = createLowlight(common);

const extensions = [
  StarterKit.configure({
    codeBlock: false,
  }),
  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: "plaintext",
  }),
  Placeholder.configure({
    placeholder: "Commencez à écrire...",
    emptyNodeClass: "is-editor-empty",
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Typography,
  Markdown.configure({
    html: false,
    transformCopiedText: true,
    transformPastedText: true,
  }),
];

interface EditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
}

export function Editor({ initialContent, onChange }: EditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleUpdate = useCallback(
    ({ editor: e }: { editor: TiptapEditor }) => {
      if (!onChangeRef.current) return;
      const store = e.storage as unknown as Record<string, { getMarkdown: () => string }>;
      const md = store.markdown.getMarkdown();
      onChangeRef.current(md);
    },
    [],
  );

  const editor = useEditor({
    extensions,
    content: initialContent || "",
    onUpdate: handleUpdate,
    editorProps: {
      attributes: {
        class: "stem-editor",
        spellcheck: "true",
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="editor-wrapper">
      <EditorContent editor={editor} />
    </div>
  );
}

export default Editor;

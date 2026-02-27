import "./editor.css";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useEditor, EditorContent, type Editor as TiptapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { mergeAttributes } from "@tiptap/core";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Typography from "@tiptap/extension-typography";
import { Markdown } from "tiptap-markdown";
import { common, createLowlight } from "lowlight";
import { SlashCommand } from "./extensions/slash-command";
import { createSuggestionRenderer } from "./extensions/suggestion-renderer";
import { useSettingsStore } from "@/store/useSettingsStore";
import { AIService } from "@/services/ai";
import { extractPlainText } from "@/lib/utils/text";

const lowlight = createLowlight(common);

const baseExtensions = [
  StarterKit.configure({
    codeBlock: false,
  }),
  CodeBlockLowlight.extend({
    renderHTML({ node, HTMLAttributes }) {
      const lang = node.attrs.language as string | null;
      return [
        "pre",
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          "data-language": lang || null,
        }),
        ["code", { class: lang ? `language-${lang}` : null }, 0],
      ];
    },
  }).configure({
    lowlight,
  }),
  Placeholder.configure({
    placeholder: "Commencez à écrire... (tapez / pour les commandes)",
    emptyNodeClass: "is-editor-empty",
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Typography.configure({
    openSingleQuote: false,
    closeSingleQuote: false,
  }),
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
  const ollamaModel = useSettingsStore((s) => s.ollamaModel);
  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);

  const extensions = useMemo(
    () => [
      ...baseExtensions,
      SlashCommand.configure({
        suggestion: {
          render: createSuggestionRenderer(),
        },
      }),
    ],
    [],
  );

  const lastEmittedContent = useRef<string | undefined>(initialContent);

  const handleUpdate = useCallback(
    ({ editor: e }: { editor: TiptapEditor }) => {
      if (!onChangeRef.current) return;
      const store = e.storage as unknown as Record<string, { getMarkdown: () => string }>;
      const md = store.markdown.getMarkdown();
      lastEmittedContent.current = md;
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

  // Sync editor content when it changes externally (e.g. AI update_note)
  useEffect(() => {
    if (!editor || initialContent === undefined) return;
    if (initialContent !== lastEmittedContent.current) {
      lastEmittedContent.current = initialContent;
      editor.commands.setContent(initialContent, { emitUpdate: false });
    }
  }, [editor, initialContent]);

  // Wire AI slash command handler — reads current editor content and calls Ollama
  useEffect(() => {
    if (!editor) return;
    const slashStore = (editor.storage as unknown as Record<string, Record<string, unknown>>).slashCommand;
    slashStore.onSelectAI = async (
      action: string,
      e: TiptapEditor,
    ) => {
      const store = e.storage as unknown as Record<string, { getMarkdown: () => string }>;
      const currentContent = store.markdown.getMarkdown();
      const plainText = extractPlainText(currentContent);

      if (!plainText.trim()) {
        e.chain()
          .focus()
          .insertContent("*Aucun contenu à analyser.*")
          .run();
        return;
      }

      e.chain()
        .focus()
        .insertContent("*Génération en cours...*")
        .run();

      try {
        const result = await AIService.executeRawPrompt(
          buildSlashPrompt(action, plainText),
          ollamaModel,
          ollamaUrl,
        );

        // Replace the "Génération en cours..." placeholder
        e.commands.undo();
        e.chain()
          .focus()
          .insertContent(`\n\n---\n\n${result}`)
          .run();
      } catch {
        e.commands.undo();
        e.chain()
          .focus()
          .insertContent("*Erreur lors de la génération IA.*")
          .run();
      }
    };
  }, [editor, ollamaModel, ollamaUrl]);

  if (!editor) return null;

  return (
    <div className="editor-wrapper">
      <EditorContent editor={editor} />
    </div>
  );
}

function buildSlashPrompt(action: string, text: string): string {
  switch (action) {
    case "summarize":
      return `Résume ce texte de manière concise:\n\n${text}`;
    case "translate":
      return `Traduis ce texte en anglais:\n\n${text}`;
    case "correct":
      return `Corrige l'orthographe et la grammaire de ce texte, retourne uniquement le texte corrigé:\n\n${text}`;
    case "explain":
      return `Explique ce texte de manière simple et accessible:\n\n${text}`;
    case "ideas":
      return `Génère 5 idées créatives basées sur ce texte:\n\n${text}`;
    default:
      return `Analyse ce texte:\n\n${text}`;
  }
}

export default Editor;

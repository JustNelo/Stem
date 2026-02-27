import { Extension } from "@tiptap/core";
import { type Editor as TiptapEditor } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  group: "blocks" | "ai";
  command: (editor: TiptapEditor) => void;
  /** AI commands need this to build prompts from editor content */
  aiAction?: string;
}

export type SlashCommandStorage = {
  onSelectAI?: (action: string, editor: TiptapEditor) => void;
};

export const SlashCommand = Extension.create<
  { suggestion: Partial<SuggestionOptions<SlashCommandItem>> },
  SlashCommandStorage
>({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
      },
    };
  },

  addStorage() {
    return {
      onSelectAI: undefined,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        ...this.options.suggestion,
        char: "/",
        items: ({ query }) => getFilteredItems(query),
        command: ({ editor, range, props: item }) => {
          editor.chain().focus().deleteRange(range).run();

          if (item.aiAction && this.storage.onSelectAI) {
            this.storage.onSelectAI(item.aiAction, editor);
          } else {
            item.command(editor);
          }
        },
      }),
    ];
  },
});

function getFilteredItems(query: string): SlashCommandItem[] {
  return ALL_ITEMS.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()),
  );
}

const ALL_ITEMS: SlashCommandItem[] = [
  // ── Blocks ──
  {
    title: "Titre 1",
    description: "Grand titre de section",
    icon: "heading1",
    group: "blocks",
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Titre 2",
    description: "Titre de sous-section",
    icon: "heading2",
    group: "blocks",
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Titre 3",
    description: "Petit titre",
    icon: "heading3",
    group: "blocks",
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: "Liste à puces",
    description: "Liste non ordonnée",
    icon: "list",
    group: "blocks",
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Liste numérotée",
    description: "Liste ordonnée",
    icon: "listOrdered",
    group: "blocks",
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "Liste de tâches",
    description: "Cases à cocher",
    icon: "listTodo",
    group: "blocks",
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: "Bloc de code",
    description: "Code avec coloration syntaxique",
    icon: "code",
    group: "blocks",
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: "Citation",
    description: "Bloc de citation",
    icon: "quote",
    group: "blocks",
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Séparateur",
    description: "Ligne horizontale",
    icon: "minus",
    group: "blocks",
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  // ── AI ──
  {
    title: "Résumer",
    description: "Résumer le contenu de la note",
    icon: "fileText",
    group: "ai",
    aiAction: "summarize",
    command: () => {},
  },
  {
    title: "Traduire",
    description: "Traduire en anglais",
    icon: "globe",
    group: "ai",
    aiAction: "translate",
    command: () => {},
  },
  {
    title: "Corriger",
    description: "Corriger l'orthographe et la grammaire",
    icon: "penLine",
    group: "ai",
    aiAction: "correct",
    command: () => {},
  },
  {
    title: "Expliquer",
    description: "Expliquer simplement le contenu",
    icon: "lightbulb",
    group: "ai",
    aiAction: "explain",
    command: () => {},
  },
  {
    title: "Idées",
    description: "Générer des idées créatives",
    icon: "brain",
    group: "ai",
    aiAction: "ideas",
    command: () => {},
  },
];

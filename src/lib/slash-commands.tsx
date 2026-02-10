import { BlockNoteEditor } from "@blocknote/core";
import { insertOrUpdateBlockForSlashMenu } from "@blocknote/core/extensions";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import { Brain, PenLine, FileText, ListChecks, Lightbulb } from "lucide-react";

/**
 * Slash command definition for extensibility.
 * Each command has a prompt template and a handler that processes the AI result.
 */
export interface SlashCommandDef {
  title: string;
  aliases: string[];
  group: string;
  icon: React.ReactElement;
  subtext: string;
  /** AI prompt template. {{selection}} is replaced with selected/current block text. */
  prompt: string;
}

/**
 * Extensible slash command definitions.
 * Add new commands here — they'll automatically appear in the slash menu.
 */
export const AI_SLASH_COMMANDS: SlashCommandDef[] = [
  {
    title: "Expliquer",
    aliases: ["explain", "expliquer"],
    group: "IA",
    icon: <Lightbulb size={18} />,
    subtext: "Génère une explication didactique du contenu",
    prompt:
      "Explique le contenu suivant de manière didactique et claire, comme si tu l'expliquais à un étudiant. Utilise des analogies si possible :\n\n{{selection}}",
  },
  {
    title: "Refactorer",
    aliases: ["refactor", "refactorer", "clean"],
    group: "IA",
    icon: <PenLine size={18} />,
    subtext: "Propose une version optimisée du code sélectionné",
    prompt:
      "Voici du code. Propose une version plus propre, optimisée et idiomatique. Retourne uniquement le code amélioré avec des commentaires expliquant les changements :\n\n{{selection}}",
  },
  {
    title: "Résumé",
    aliases: ["summary", "resume", "résumé"],
    group: "IA",
    icon: <FileText size={18} />,
    subtext: "Génère un résumé exécutif du contenu",
    prompt:
      "Génère un résumé exécutif concis (3-5 points clés) du contenu suivant :\n\n{{selection}}",
  },
  {
    title: "Tâches",
    aliases: ["todo", "taches", "tasks"],
    group: "IA",
    icon: <ListChecks size={18} />,
    subtext: "Extrait les tâches implicites en liste de cases à cocher",
    prompt:
      "Analyse le texte suivant et extrait toutes les tâches implicites ou explicites. Retourne-les sous forme de liste à puces avec des cases à cocher (format markdown: - [ ] tâche) :\n\n{{selection}}",
  },
  {
    title: "Idées",
    aliases: ["ideas", "idees", "brainstorm"],
    group: "IA",
    icon: <Brain size={18} />,
    subtext: "Génère des idées créatives basées sur le contenu",
    prompt:
      "Génère 5 idées créatives et originales basées sur le contenu suivant. Sois innovant :\n\n{{selection}}",
  },
];

/**
 * Extracts plain text from the current block or selected text in the editor.
 */
function getContextText(editor: BlockNoteEditor): string {
  const selection = editor.getSelectedText();
  if (selection && selection.trim()) return selection;

  // Fall back to current block text
  const block = editor.getTextCursorPosition().block;
  if (block && block.content) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (block.content as any[])
      .map((item: { type: string; text?: string }) =>
        item.type === "text" ? item.text || "" : "",
      )
      .join("");
  }
  return "";
}

/**
 * Creates a BlockNote slash menu item from a SlashCommandDef.
 * When clicked, it sends the context text to Ollama and inserts the result.
 */
export function createAISlashMenuItem(
  editor: BlockNoteEditor,
  command: SlashCommandDef,
  onExecute: (prompt: string) => Promise<string>,
): DefaultReactSuggestionItem {
  return {
    title: command.title,
    aliases: command.aliases,
    group: command.group,
    icon: command.icon,
    subtext: command.subtext,
    onItemClick: async () => {
      const contextText = getContextText(editor);
      if (!contextText.trim()) {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "⚠️ Aucun contenu à analyser. Écrivez du texte d'abord.",
              styles: { italic: true },
            },
          ],
        });
        return;
      }

      // Insert a loading indicator
      insertOrUpdateBlockForSlashMenu(editor, {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "⏳ Génération en cours...",
            styles: { italic: true },
          },
        ],
      });

      try {
        const prompt = command.prompt.replace("{{selection}}", contextText);
        const result = await onExecute(prompt);

        // Replace loading block with the AI result
        const currentBlock = editor.getTextCursorPosition().block;
        if (currentBlock) {
          editor.updateBlock(currentBlock, {
            type: "paragraph",
            content: [{ type: "text", text: result, styles: {} }],
          });
        }
      } catch (error) {
        const currentBlock = editor.getTextCursorPosition().block;
        if (currentBlock) {
          editor.updateBlock(currentBlock, {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `❌ Erreur: ${error}`,
                styles: { italic: true },
              },
            ],
          });
        }
      }
    },
  };
}

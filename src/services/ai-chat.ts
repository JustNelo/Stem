import { z } from "zod";
import { safeInvoke } from "@/lib/tauri";
import { AI_TOOLS, toOllamaTools } from "@/lib/ai-tools";
import { dispatchToolCall, type StoreCallbacks } from "@/services/ai-tools-dispatcher";

const ToolFunctionSchema = z.object({
  name: z.string(),
  arguments: z.unknown(),
});

const ToolCallSchema = z.object({
  function: ToolFunctionSchema,
});

const ChatResponseSchema = z.object({
  content: z.string(),
  tool_calls: z.array(ToolCallSchema).nullable().optional(),
});

export interface ChatTurn {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_name?: string;
}

const SYSTEM_PROMPT = `Tu es Stem Copilot, un assistant IA intégré à l'application de notes Stem.
Tu as accès à des outils pour lire, créer, modifier et rechercher les notes de l'utilisateur.

## RÈGLE ABSOLUE — Utilisation des outils
Tu DOIS utiliser les outils fournis pour toute action sur les notes.
NE DÉCRIS JAMAIS une action que tu pourrais faire — EXÉCUTE-LA avec l'outil approprié.
Si l'utilisateur te demande de créer une note → appelle immédiatement \`create_note\`.
Si l'utilisateur veut modifier une note → appelle \`list_notes\` puis \`update_note\`.
Si l'utilisateur veut lire ou chercher → appelle \`search_notes\` ou \`read_note\`.

## Exemples obligatoires
- "Crée une note sur Python" → APPELER create_note({title: "Python", content: "..."})
- "Montre-moi mes notes" → APPELER list_notes()
- "Résume ma note sur X" → APPELER search_notes({query: "X"}) puis read_note({note_id: ...})
- "Modifie le titre de ma note" → APPELER list_notes() puis update_note({note_id: ..., title: ...})

## Autres règles
- Réponds TOUJOURS en français sauf si demande explicite.
- Après chaque action réussie, confirme brièvement ce qui a été fait.
- Sois concis. Ne répète pas le contenu brut des notes, synthétise.
- Si tu n'es pas sûr de l'ID d'une note, commence par list_notes ou search_notes.`;

const ACTION_KEYWORDS = [
  "je vais créer", "je vais ajouter", "voici la note", "voici le contenu",
  "je vais maintenant", "je créerai", "je vais maintenant créer",
  "voici ce que je propose", "je pourrais créer",
];

const MAX_HISTORY_TURNS = 20;
const MAX_TOOL_ROUNDS = 6;

function detectDescriptiveAction(content: string): boolean {
  const lower = content.toLowerCase();
  return ACTION_KEYWORDS.some((kw) => lower.includes(kw));
}

function boundHistory(history: ChatTurn[]): ChatTurn[] {
  if (history.length <= MAX_HISTORY_TURNS) return history;
  return history.slice(history.length - MAX_HISTORY_TURNS);
}

export interface ChatOptions {
  storeCallbacks?: StoreCallbacks;
  onToolCall?: (toolName: string) => void;
}

/**
 * Agentic chat service with tool-use support.
 * Implements the ReAct loop: Reason → Act (tool call) → Observe → Respond.
 *
 * Includes a fallback re-prompt when the model describes an action
 * instead of executing a tool call (common with models that have weak function calling).
 */
export const AIChatService = {
  async chat(
    userMessage: string,
    history: ChatTurn[],
    model: string,
    ollamaUrl: string,
    noteContext: string | null,
    options?: ChatOptions,
  ): Promise<string> {
    const systemMessage = noteContext
      ? `${SYSTEM_PROMPT}\n\nNote actuellement ouverte :\n---\n${noteContext}\n---`
      : SYSTEM_PROMPT;

    const bounded = boundHistory(history);

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemMessage },
      ...bounded.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: userMessage },
    ];

    const tools = toOllamaTools(AI_TOOLS);
    let fallbackUsed = false;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await safeInvoke("ollama_chat", ChatResponseSchema, {
        messages,
        tools,
        model,
        ollamaUrl,
      });

      const toolCalls = response.tool_calls;
      const content = response.content ?? "";

      if (!toolCalls || toolCalls.length === 0) {
        // Fallback: if model described an action instead of calling a tool, re-prompt once
        if (!fallbackUsed && detectDescriptiveAction(content)) {
          fallbackUsed = true;
          messages.push({ role: "assistant", content });
          messages.push({
            role: "user",
            content:
              "Tu as décrit l'action mais tu ne l'as pas exécutée. Utilise maintenant l'outil approprié pour effectuer cette action.",
          });
          continue;
        }
        return content || "Pas de réponse.";
      }

      messages.push({ role: "assistant", content });

      for (const tc of toolCalls) {
        const toolName = tc.function.name;
        const rawArgs = tc.function.arguments;
        const toolArgs =
          typeof rawArgs === "string"
            ? (JSON.parse(rawArgs) as Record<string, unknown>)
            : (rawArgs as Record<string, unknown>);

        options?.onToolCall?.(toolName);

        const result = await dispatchToolCall(
          { name: toolName, arguments: toolArgs },
          options?.storeCallbacks,
        );

        messages.push({ role: "tool", content: result.result });
      }
    }

    return "Désolé, je n'ai pas pu terminer cette action (trop d'étapes).";
  },
};

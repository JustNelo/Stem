import { generateText, streamText, stepCountIs } from "ai";
import { streamText as ollamaStreamText } from "ai-sdk-ollama";
import { buildTools } from "@/lib/ai-tools";
import type { StoreCallbacks } from "@/services/ai-tools-dispatcher";
import { getOllamaModel } from "@/services/ollama-client";
import type { ModelMessage } from "ai";

export interface ChatTurn {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_name?: string;
}

const SYSTEM_PROMPT = `Tu es Stem Copilot, un assistant intégré à l'application de notes Stem.

## Langue
Réponds TOUJOURS en français, sauf demande explicite contraire.

## Outils
Tu DOIS utiliser les outils pour toute action sur les notes — ne décris jamais une action, exécute-la.
- Créer → create_note
- Modifier → list_notes puis update_note
- Ajouter du contenu → append_to_note
- Lire / chercher → search_notes ou read_note

## Contenu des notes
Le contenu passé aux outils DOIT être riche en Markdown :
- Titres (## ###), listes (- ou 1.), code (\`\`\`langage), **gras**, *italique*
- Contenu complet et pédagogique avec exemples concrets
- En programmation, toujours inclure des exemples de code commentés

## Réponses dans le chat
- Sois **bref et naturel** dans tes confirmations (1-2 phrases max).
- Ne mentionne JAMAIS les IDs techniques des notes — l'utilisateur n'en a pas besoin.
- Ne répète JAMAIS le contenu d'une note dans le chat. Dis simplement ce que tu as fait.
- Exemples de bonnes confirmations :
  - "J'ai créé la note « Introduction à Python »."
  - "Note mise à jour avec les nouveaux exemples."
  - "Voici un résumé de ta note : …"
- Exemples de MAUVAISES confirmations (à éviter) :
  - "La note a été créée avec l'ID abc-123-def."
  - "Voici le contenu que j'ai inséré : [tout le contenu]"

## Style conversationnel
- Réponds comme un collègue bienveillant, pas comme un robot.
- Utilise des phrases courtes et directes.
- Tu peux utiliser du Markdown dans le chat (listes, gras) pour structurer tes réponses quand c'est utile.`;

const MAX_HISTORY_TURNS = 20;

function boundHistory(history: ChatTurn[]): ChatTurn[] {
  if (history.length <= MAX_HISTORY_TURNS) return history;
  return history.slice(history.length - MAX_HISTORY_TURNS);
}

export interface ChatOptions {
  storeCallbacks?: StoreCallbacks;
  onToolCall?: (toolName: string) => void;
  abortSignal?: AbortSignal;
}

/**
 * Agentic chat service using Vercel AI SDK + ai-sdk-ollama.
 *
 * generateText() handles the ReAct loop automatically via stopWhen: stepCountIs(8).
 * Each tool has Zod-validated inputs — malformed calls from small models are caught
 * before execution. onStepFinish notifies the UI of each tool call in progress.
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
    const systemContent = noteContext
      ? `${SYSTEM_PROMPT}\n\nNote actuellement ouverte :\n---\n${noteContext}\n---`
      : SYSTEM_PROMPT;

    const bounded = boundHistory(history);

    const messages: ModelMessage[] = [
      ...bounded.map((h): ModelMessage => {
        if (h.role === "tool") return { role: "tool", content: [{ type: "tool-result" as const, toolCallId: crypto.randomUUID(), toolName: h.tool_name ?? "unknown", output: { type: "text" as const, value: h.content } }] };
        if (h.role === "assistant") return { role: "assistant", content: h.content };
        return { role: "user", content: h.content };
      }),
      { role: "user", content: userMessage },
    ];

    const tools = buildTools(options?.storeCallbacks);

    const result = await generateText({
      model: getOllamaModel(model, ollamaUrl),
      system: systemContent,
      messages,
      tools,
      stopWhen: stepCountIs(8),
      temperature: 0.4,
      abortSignal: options?.abortSignal,
      providerOptions: {
        ollama: { options: { num_ctx: 32768 } },
      },
      onStepFinish: ({ toolCalls }) => {
        for (const tc of toolCalls) {
          options?.onToolCall?.(tc.toolName);
        }
      },
    });

    const lastStep = result.steps[result.steps.length - 1];
    const lastStepText = lastStep?.text ?? result.text;
    return lastStepText.trim() || "Pas de réponse.";
  },

  /**
   * Streaming variant of chat() — yields text tokens in real time while
   * still executing tool calls in multi-step mode.
   * Prefer this over chat() for interactive UI — user sees tokens appearing.
   */
  async *chatStream(
    userMessage: string,
    history: ChatTurn[],
    model: string,
    ollamaUrl: string,
    noteContext: string | null,
    options?: ChatOptions,
  ): AsyncGenerator<string> {
    const systemContent = noteContext
      ? `${SYSTEM_PROMPT}\n\nNote actuellement ouverte :\n---\n${noteContext}\n---`
      : SYSTEM_PROMPT;

    const bounded = boundHistory(history);

    const messages: ModelMessage[] = [
      ...bounded.map((h): ModelMessage => {
        if (h.role === "tool") return { role: "tool", content: [{ type: "tool-result" as const, toolCallId: crypto.randomUUID(), toolName: h.tool_name ?? "unknown", output: { type: "text" as const, value: h.content } }] };
        if (h.role === "assistant") return { role: "assistant", content: h.content };
        return { role: "user", content: h.content };
      }),
      { role: "user", content: userMessage },
    ];

    const tools = buildTools(options?.storeCallbacks);

    const result = streamText({
      model: getOllamaModel(model, ollamaUrl),
      system: systemContent,
      messages,
      tools,
      stopWhen: stepCountIs(8),
      temperature: 0.4,
      abortSignal: options?.abortSignal,
      providerOptions: {
        ollama: { options: { num_ctx: 32768 } },
      },
      onStepFinish: ({ toolCalls }) => {
        for (const tc of toolCalls) {
          options?.onToolCall?.(tc.toolName);
        }
      },
    });

    for await (const token of result.textStream) {
      if (token) yield token;
    }
  },

  /**
   * Streams a single assistant response token by token.
   * Used by slash commands (/resume, /corriger, etc.) that do not need tool use.
   */
  async *stream(
    messages: ModelMessage[],
    model: string,
    ollamaUrl: string,
    abortSignal?: AbortSignal,
  ): AsyncGenerator<string> {
    const result = await ollamaStreamText({
      model: getOllamaModel(model, ollamaUrl),
      messages,
      temperature: 0.7,
      abortSignal,
      providerOptions: {
        ollama: { options: { num_ctx: 32768 } },
      },
    });

    for await (const token of result.textStream) {
      if (token) yield token;
    }
  },
};

import { z } from "zod";
import { safeInvoke } from "@/lib/tauri";
import { dispatchToolCall, type StoreCallbacks } from "@/services/ai-tools-dispatcher";
import type { AIToolCall } from "@/lib/ai-tools";

export interface ChatTurn {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_name?: string;
}

interface RustChatMessage {
  role: string;
  content: string;
}

const SYSTEM_PROMPT = `Tu es Stem Copilot, un assistant intégré à l'application de notes Stem.

## Langue
Réponds TOUJOURS en français, sauf demande explicite contraire.

## Outils
Tu disposes d'outils pour agir sur les notes. Pour les utiliser, réponds UNIQUEMENT avec un bloc JSON :
\`\`\`tool
{"name": "nom_outil", "arguments": { ... }}
\`\`\`

Outils disponibles :
- list_notes : Liste toutes les notes (pas d'arguments)
- read_note : Lit une note (arguments: note_id)
- create_note : Crée une note (arguments: title, content?)
- update_note : Modifie une note (arguments: note_id, title?, content?)
- delete_note : Supprime une note (arguments: note_id)
- append_to_note : Ajoute du contenu (arguments: note_id, content)
- search_notes : Recherche (arguments: query)

## Contenu des notes
Le contenu passé aux outils DOIT être riche en Markdown :
- Titres (## ###), listes (- ou 1.), code (\`\`\`langage), **gras**, *italique*
- Contenu complet et pédagogique avec exemples concrets

## Réponses dans le chat
- Sois **bref et naturel** (1-2 phrases max).
- Ne mentionne JAMAIS les IDs techniques des notes.
- Ne répète JAMAIS le contenu d'une note dans le chat.

## Style conversationnel
- Réponds comme un collègue bienveillant, pas comme un robot.
- Utilise des phrases courtes et directes.`;

const MAX_HISTORY_TURNS = 20;
const MAX_TOOL_ROUNDS = 5;

function boundHistory(history: ChatTurn[]): ChatTurn[] {
  if (history.length <= MAX_HISTORY_TURNS) return history;
  return history.slice(history.length - MAX_HISTORY_TURNS);
}

function buildMessages(
  systemContent: string,
  history: ChatTurn[],
  userMessage: string,
): RustChatMessage[] {
  const msgs: RustChatMessage[] = [{ role: "system", content: systemContent }];

  for (const h of history) {
    if (h.role === "tool") {
      msgs.push({ role: "user", content: `[Résultat outil ${h.tool_name ?? ""}]: ${h.content}` });
    } else {
      msgs.push({ role: h.role, content: h.content });
    }
  }

  msgs.push({ role: "user", content: userMessage });
  return msgs;
}

const TOOL_BLOCK_RE = /```tool\s*\n([\s\S]*?)\n```/;

function extractToolCall(text: string): AIToolCall | null {
  const match = TOOL_BLOCK_RE.exec(text);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed.name && typeof parsed.name === "string") {
      return { name: parsed.name, arguments: parsed.arguments ?? {} };
    }
  } catch {
    // Model produced malformed JSON — not a tool call
  }
  return null;
}

export interface ChatOptions {
  storeCallbacks?: StoreCallbacks;
  onToolCall?: (toolName: string) => void;
  abortSignal?: AbortSignal;
}

/**
 * Chat service routed through the Rust backend (ollama_chat IPC command).
 * Tool calls are detected via a ```tool JSON block convention, executed locally,
 * then the result is fed back for up to MAX_TOOL_ROUNDS iterations.
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
    const messages = buildMessages(systemContent, bounded, userMessage);

    let lastResponse = "";

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      if (options?.abortSignal?.aborted) throw new Error("Génération annulée.");

      lastResponse = await safeInvoke("ollama_chat", z.string(), {
        messages,
        model,
        ollamaUrl,
      });

      const toolCall = extractToolCall(lastResponse);
      if (!toolCall) break;

      options?.onToolCall?.(toolCall.name);

      const toolResult = await dispatchToolCall(toolCall, options?.storeCallbacks);

      messages.push({ role: "assistant", content: lastResponse });
      messages.push({
        role: "user",
        content: `[Résultat outil ${toolCall.name}]: ${toolResult.result}`,
      });
    }

    const cleanResponse = lastResponse.replace(TOOL_BLOCK_RE, "").trim();
    return cleanResponse || lastResponse.trim() || "Pas de réponse.";
  },

  /**
   * Non-streaming chat that yields the full response at once.
   * Used by the main chat interface — behaves like a stream with a single chunk.
   */
  async *chatStream(
    userMessage: string,
    history: ChatTurn[],
    model: string,
    ollamaUrl: string,
    noteContext: string | null,
    options?: ChatOptions,
  ): AsyncGenerator<string> {
    const result = await AIChatService.chat(
      userMessage,
      history,
      model,
      ollamaUrl,
      noteContext,
      options,
    );
    yield result;
  },

  /**
   * Simple single-turn chat for slash commands (/resume, /corriger, etc.).
   * No tool use, just sends messages and returns the response.
   */
  async *stream(
    messages: { role: string; content: string }[],
    model: string,
    ollamaUrl: string,
  ): AsyncGenerator<string> {
    const rustMessages: RustChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const result = await safeInvoke("ollama_chat", z.string(), {
      messages: rustMessages,
      model,
      ollamaUrl,
    });

    yield result || "Résultat vide.";
  },
};

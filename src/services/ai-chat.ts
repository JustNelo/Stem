import { z } from "zod";
import { safeInvoke } from "@/lib/tauri";
import { dispatchToolCall, type StoreCallbacks } from "@/services/ai-tools-dispatcher";

// ===== Types matching Rust ChatMessage / ChatResult =====

export interface ChatMessage {
  role: string;
  content?: string | null;
  tool_calls?: { function: { name: string; arguments: Record<string, unknown> } }[];
  tool_name?: string;
}

interface ChatResultToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface ChatResult {
  content: string | null;
  tool_calls: ChatResultToolCall[] | null;
}

export const ChatResultSchema = z.object({
  content: z.string().nullable(),
  tool_calls: z
    .array(z.object({ name: z.string(), arguments: z.record(z.string(), z.unknown()) }))
    .nullable(),
});

// ===== Native Ollama tool definitions =====

const OLLAMA_TOOLS = [
  {
    type: "function",
    function: {
      name: "list_notes",
      description: "Liste toutes les notes de l'utilisateur avec leurs IDs et titres",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "read_note",
      description: "Lit le contenu complet d'une note par son ID",
      parameters: {
        type: "object",
        required: ["note_id"],
        properties: {
          note_id: { type: "string", description: "L'ID de la note à lire" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_note",
      description: "Crée une nouvelle note avec un titre et un contenu optionnel en Markdown",
      parameters: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string", description: "Le titre de la nouvelle note" },
          content: { type: "string", description: "Le contenu Markdown de la note" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_note",
      description: "Modifie le titre et/ou le contenu d'une note existante. Le contenu doit être en Markdown complet (pas un diff).",
      parameters: {
        type: "object",
        required: ["note_id"],
        properties: {
          note_id: { type: "string", description: "L'ID de la note à modifier" },
          title: { type: "string", description: "Le nouveau titre (optionnel)" },
          content: { type: "string", description: "Le nouveau contenu Markdown complet (optionnel)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_note",
      description: "Supprime définitivement une note par son ID",
      parameters: {
        type: "object",
        required: ["note_id"],
        properties: {
          note_id: { type: "string", description: "L'ID de la note à supprimer" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_notes",
      description: "Recherche des notes par mots-clés dans le titre et le contenu",
      parameters: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string", description: "Les mots-clés de recherche" },
        },
      },
    },
  },
];

// ===== Chat history types =====

export interface ChatTurn {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_name?: string;
}

// ===== System prompt (no custom tool format needed — tools are native) =====

const SYSTEM_PROMPT = `Tu es Stem Copilot, un assistant intégré à l'application de notes Stem.

## Langue
Réponds TOUJOURS en français, sauf demande explicite contraire.

## Règles d'utilisation des outils
- Quand l'utilisateur parle de "cette note" ou "la note", utilise l'ID de la note actuellement ouverte fourni dans le contexte.
- Pour modifier une note, utilise TOUJOURS update_note avec le note_id. Le contenu doit être le Markdown complet (pas un diff).
- Si tu n'as pas assez d'infos pour agir (ex: pas de note ouverte), demande une clarification.
- Commence par list_notes ou read_note si tu as besoin d'infos avant d'agir.

## Contenu Markdown
Le contenu passé aux outils DOIT être en Markdown riche : titres (## ###), listes (- ou 1.), code, **gras**, *italique*.

## Style
- Sois bref et naturel (1-2 phrases max dans le chat).
- Ne mentionne JAMAIS les IDs techniques.
- Ne répète JAMAIS le contenu complet d'une note dans le chat.
- Réponds comme un collègue bienveillant, pas comme un robot.`;

const MAX_HISTORY_TURNS = 20;
const MAX_TOOL_ROUNDS = 5;

function boundHistory(history: ChatTurn[]): ChatTurn[] {
  if (history.length <= MAX_HISTORY_TURNS) return history;
  return history.slice(history.length - MAX_HISTORY_TURNS);
}

export interface NoteContext {
  id: string;
  title: string;
  contentPreview: string;
}

function buildSystemPrompt(noteCtx: NoteContext | null): string {
  if (!noteCtx) return SYSTEM_PROMPT;
  return `${SYSTEM_PROMPT}\n\n## Note actuellement ouverte\n- ID: ${noteCtx.id}\n- Titre: "${noteCtx.title}"\n- Aperçu du contenu:\n${noteCtx.contentPreview.slice(0, 500)}`;
}

function buildMessages(
  systemContent: string,
  history: ChatTurn[],
  userMessage: string,
): ChatMessage[] {
  const msgs: ChatMessage[] = [{ role: "system", content: systemContent }];

  for (const h of history) {
    if (h.role === "tool") {
      msgs.push({ role: "tool", content: h.content, tool_name: h.tool_name });
    } else {
      msgs.push({ role: h.role, content: h.content });
    }
  }

  msgs.push({ role: "user", content: userMessage });
  return msgs;
}

export interface ChatOptions {
  storeCallbacks?: StoreCallbacks;
  onToolCall?: (toolName: string) => void;
  abortSignal?: AbortSignal;
}

async function invokeChat(
  messages: ChatMessage[],
  model: string,
  ollamaUrl: string,
  tools: typeof OLLAMA_TOOLS | null,
): Promise<ChatResult> {
  return safeInvoke("ollama_chat", ChatResultSchema, {
    messages,
    model,
    ollamaUrl,
    tools,
  });
}

/**
 * Chat service using the Rust backend with native Ollama tool calling.
 * The agent loop sends tools[], receives structured tool_calls, executes them,
 * then feeds results back as role:"tool" for up to MAX_TOOL_ROUNDS iterations.
 */
export const AIChatService = {
  async chat(
    userMessage: string,
    history: ChatTurn[],
    model: string,
    ollamaUrl: string,
    noteContext: NoteContext | null,
    options?: ChatOptions,
  ): Promise<string> {
    const systemContent = buildSystemPrompt(noteContext);
    const bounded = boundHistory(history);
    const messages = buildMessages(systemContent, bounded, userMessage);

    let lastContent = "";

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      if (options?.abortSignal?.aborted) throw new Error("Génération annulée.");

      const result = await invokeChat(messages, model, ollamaUrl, OLLAMA_TOOLS);

      // If model returned tool calls, execute them and continue the loop
      if (result.tool_calls && result.tool_calls.length > 0) {
        // Push the assistant message with tool_calls marker
        messages.push({
          role: "assistant",
          content: result.content,
          tool_calls: result.tool_calls.map((tc) => ({
            function: { name: tc.name, arguments: tc.arguments },
          })),
        });

        for (const tc of result.tool_calls) {
          options?.onToolCall?.(tc.name);

          const toolResult = await dispatchToolCall(
            { name: tc.name, arguments: tc.arguments },
            options?.storeCallbacks,
          );

          // Native Ollama tool result format
          messages.push({
            role: "tool",
            content: toolResult.result,
            tool_name: tc.name,
          });
        }

        continue;
      }

      // No tool calls — this is the final text response
      lastContent = result.content?.trim() || "";
      break;
    }

    return lastContent || "Pas de réponse.";
  },

  /**
   * Non-streaming chat that yields the full response at once.
   */
  async *chatStream(
    userMessage: string,
    history: ChatTurn[],
    model: string,
    ollamaUrl: string,
    noteContext: NoteContext | null,
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
    const chatMessages: ChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const result = await invokeChat(chatMessages, model, ollamaUrl, null);
    yield result.content?.trim() || "Résultat vide.";
  },
};

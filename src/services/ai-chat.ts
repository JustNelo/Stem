import { z } from "zod";
import { safeInvoke } from "@/lib/tauri";
import { AI_TOOLS, toOllamaTools } from "@/lib/ai-tools";
import { dispatchToolCall } from "@/services/ai-tools-dispatcher";

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

const SYSTEM_PROMPT = `Tu es Stem Copilot, un assistant intelligent intégré à l'application de prise de notes Stem.
Tu as accès à des outils pour interagir directement avec les notes de l'utilisateur.

Règles importantes :
- Réponds TOUJOURS en français sauf si l'utilisateur demande explicitement une autre langue.
- Utilise les outils disponibles pour répondre aux questions sur les notes.
- Quand l'utilisateur te demande de créer ou modifier une note, utilise les outils appropriés et confirme l'action.
- Sois concis et utile. Ne répète pas le contenu brut des notes, synthétise-le.`;

/**
 * Agentic chat service with tool-use support.
 * Implements the ReAct loop: Reason → Act (tool call) → Observe → Respond.
 */
export const AIChatService = {
  /**
   * Single turn of the agentic loop.
   * Returns the final assistant response after resolving all tool calls.
   */
  async chat(
    userMessage: string,
    history: ChatTurn[],
    model: string,
    ollamaUrl: string,
    noteContext: string | null,
    onToolCall?: (toolName: string) => void,
  ): Promise<string> {
    const systemMessage = noteContext
      ? `${SYSTEM_PROMPT}\n\nNote actuellement ouverte :\n---\n${noteContext}\n---`
      : SYSTEM_PROMPT;

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemMessage },
      ...history.map((h) => ({ role: h.role === "tool" ? "tool" : h.role, content: h.content })),
      { role: "user", content: userMessage },
    ];

    const tools = toOllamaTools(AI_TOOLS);
    const MAX_TOOL_ROUNDS = 5;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await safeInvoke("ollama_chat", ChatResponseSchema, {
        messages,
        tools,
        model,
        ollamaUrl,
      });

      const toolCalls = response.tool_calls;

      if (!toolCalls || toolCalls.length === 0) {
        return response.content || "Pas de réponse.";
      }

      messages.push({ role: "assistant", content: response.content || "" });

      for (const tc of toolCalls) {
        const toolName = tc.function.name;
        const toolArgs = typeof tc.function.arguments === "string"
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments;

        onToolCall?.(toolName);

        const result = await dispatchToolCall({
          name: toolName,
          arguments: toolArgs as Record<string, unknown>,
        });

        messages.push({
          role: "tool",
          content: result.result,
        });
      }
    }

    return "Désolé, je n'ai pas pu terminer cette action (trop d'étapes).";
  },
};

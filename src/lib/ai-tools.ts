/**
 * MCP-style tool definitions for Ollama function calling.
 * Each tool maps to a Tauri IPC command that the AI dispatcher can execute.
 */

export interface AIToolParameter {
  type: "string" | "number" | "boolean";
  description: string;
  required?: boolean;
}

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, AIToolParameter>;
}

export interface AIToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIToolResult {
  tool: string;
  result: string;
  isError?: boolean;
}

export const AI_TOOLS: AITool[] = [
  {
    name: "list_notes",
    description: "Liste toutes les notes disponibles avec leur titre et date de modification. Utilise cet outil pour savoir quelles notes existent.",
    parameters: {},
  },
  {
    name: "read_note",
    description: "Lit le contenu complet d'une note par son ID. Utilise list_notes d'abord pour obtenir les IDs.",
    parameters: {
      note_id: {
        type: "string",
        description: "L'identifiant unique de la note à lire",
        required: true,
      },
    },
  },
  {
    name: "create_note",
    description: "Crée une nouvelle note avec un titre et un contenu optionnel.",
    parameters: {
      title: {
        type: "string",
        description: "Le titre de la nouvelle note",
        required: true,
      },
      content: {
        type: "string",
        description: "Le contenu initial de la note (optionnel)",
      },
    },
  },
  {
    name: "update_note",
    description: "Met à jour le titre ou le contenu d'une note existante.",
    parameters: {
      note_id: {
        type: "string",
        description: "L'identifiant unique de la note à modifier",
        required: true,
      },
      title: {
        type: "string",
        description: "Le nouveau titre (optionnel)",
      },
      content: {
        type: "string",
        description: "Le nouveau contenu (optionnel)",
      },
    },
  },
  {
    name: "search_notes",
    description: "Recherche des notes par mot-clé dans le titre et le contenu.",
    parameters: {
      query: {
        type: "string",
        description: "Le terme de recherche",
        required: true,
      },
    },
  },
];

/**
 * Converts the tool definitions to the Ollama function calling format.
 */
export function toOllamaTools(tools: AITool[]): object[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object",
        properties: Object.fromEntries(
          Object.entries(tool.parameters).map(([key, param]) => [
            key,
            { type: param.type, description: param.description },
          ]),
        ),
        required: Object.entries(tool.parameters)
          .filter(([, param]) => param.required)
          .map(([key]) => key),
      },
    },
  }));
}

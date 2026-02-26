import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Channel, invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useNotesStore } from "@/store/useNotesStore";
import { useToastStore } from "@/store/useToastStore";
import { AIChatService, type ChatTurn } from "@/services/ai-chat";
import type { StoreCallbacks } from "@/services/ai-tools-dispatcher";
import { extractPlainText } from "@/lib/utils/text";

interface StreamChunk {
  token: string;
  done: boolean;
}

/**
 * Streams a single response from Ollama via the ollama_chat_stream Tauri command.
 * Calls onToken for each incremental token and resolves with the full text on done.
 */
async function streamOllamaResponse(
  messages: Array<{ role: string; content: string }>,
  model: string,
  ollamaUrl: string,
  onToken: (token: string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let accumulated = "";
    const channel = new Channel<StreamChunk>();

    channel.onmessage = (chunk) => {
      if (chunk.done) {
        resolve(accumulated);
        return;
      }
      accumulated += chunk.token;
      onToken(chunk.token);
    };

    invoke("ollama_chat_stream", { messages, model, ollamaUrl, channel }).catch(
      (err) => reject(err),
    );
  });
}

interface Command {
  name: string;
  description: string;
  action: string;
}

const COMMANDS: Command[] = [
  { name: "resume", description: "Résumer la note", action: "summarize" },
  { name: "traduire", description: "Traduire en anglais", action: "translate" },
  { name: "corriger", description: "Corriger l'orthographe", action: "correct" },
  { name: "expliquer", description: "Expliquer simplement", action: "explain" },
  { name: "idees", description: "Générer des idées", action: "ideas" },
  { name: "notes", description: "Interagir avec toutes les notes (MCP)", action: "mcp" },
];

export { COMMANDS };
export type { Command };

export interface Message {
  id: string;
  type: "user" | "assistant" | "error" | "tool_call";
  content: string;
  command?: string;
  timestamp: Date;
}

const STORAGE_KEY = "stem_chat_messages";
const HISTORY_STORAGE_KEY = "stem_chat_history";
const MAX_PERSISTED_MESSAGES = 100;

function loadMessages(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Message & { timestamp: string }>;
    return parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [];
  }
}

function saveMessages(messages: Message[]): void {
  try {
    const bounded = messages.slice(-MAX_PERSISTED_MESSAGES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bounded));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

function loadHistory(): ChatTurn[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatTurn[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: ChatTurn[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // fail silently
  }
}

interface UseAIChatOptions {
  onExecuteCommand: (command: string, args?: string) => Promise<string>;
  isProcessing: boolean;
  isOpen: boolean;
}

export function useAIChat({ onExecuteCommand, isProcessing, isOpen }: UseAIChatOptions) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => loadMessages());
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [localProcessing, setLocalProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<ChatTurn[]>(loadHistory());

  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);
  const ollamaModel = useSettingsStore((s) => s.ollamaModel);
  const selectedNote = useNotesStore((s) => s.selectedNote);
  const { fetchNotes, selectNote } = useNotesStore();
  const addToast = useToastStore((s) => s.addToast);

  const isCurrentlyProcessing = isProcessing || localProcessing;

  const storeCallbacks = useMemo<StoreCallbacks>(
    () => ({
      onNoteCreated: (note) => {
        fetchNotes();
        selectNote(note);
        addToast(`Note "${note.title}" créée par l'IA`, "success");
      },
      onNoteUpdated: (note) => {
        fetchNotes();
        addToast(`Note "${note.title}" mise à jour par l'IA`, "info");
      },
      onNoteDeleted: () => {
        fetchNotes();
        addToast("Note supprimée par l'IA", "info");
      },
    }),
    [fetchNotes, selectNote, addToast],
  );

  const filteredCommands = useMemo(
    () =>
      input.startsWith("/")
        ? COMMANDS.filter((cmd) =>
            cmd.name.toLowerCase().startsWith(input.slice(1).toLowerCase()),
          )
        : COMMANDS,
    [input],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    saveMessages(messages);
  }, [messages]);

  const showCommands = input.startsWith("/") && !input.includes(" ");

  useEffect(() => {
    setSelectedCommandIndex(0);
  }, [filteredCommands.length]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const addMessage = useCallback((msg: Omit<Message, "id" | "timestamp">) => {
    const fullMsg: Message = { ...msg, id: crypto.randomUUID(), timestamp: new Date() };
    setMessages((prev) => [...prev, fullMsg]);
    return fullMsg;
  }, []);

  const updateMessageContent = useCallback((id: string, token: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: m.content + token } : m)),
    );
  }, []);

  const executeSlashCommand = useCallback(
    async (commandName: string, args?: string) => {
      const command = COMMANDS.find((c) => c.name === commandName);
      if (!command) return;

      addMessage({ type: "user", content: args || `/${commandName}`, command: commandName });
      setInput("");
      setLocalProcessing(true);

      try {
        if (command.action === "mcp") {
          const noteContext = selectedNote
            ? extractPlainText(selectedNote.content)
            : null;

          const userText = args || "Montre-moi mes notes.";

          const result = await AIChatService.chat(
            userText,
            historyRef.current,
            ollamaModel,
            ollamaUrl,
            noteContext,
            {
              storeCallbacks,
              onToolCall: (toolName) => addMessage({ type: "tool_call", content: toolName }),
            },
          );

          historyRef.current = [
            ...historyRef.current,
            { role: "user", content: userText },
            { role: "assistant", content: result },
          ];
          saveHistory(historyRef.current);

          addMessage({ type: "assistant", content: result, command: commandName });
        } else {
          // Non-MCP slash commands use streaming for real-time token delivery
          const prompt = await onExecuteCommand(command.action, args);
          const streamingMsg = addMessage({ type: "assistant", content: "", command: commandName });
          const systemMessages = [
            {
              role: "system",
              content:
                "Tu es un assistant intelligent. Réponds TOUJOURS en français sauf si l'utilisateur demande explicitement une autre langue. Utilise un style clair, structuré et pédagogique.",
            },
            { role: "user", content: prompt },
          ];
          await streamOllamaResponse(
            systemMessages,
            ollamaModel,
            ollamaUrl,
            (token) => updateMessageContent(streamingMsg.id, token),
          );
        }
      } catch (error) {
        addMessage({ type: "error", content: `Erreur: ${error}` });
      } finally {
        setLocalProcessing(false);
      }
    },
    [addMessage, updateMessageContent, onExecuteCommand, selectedNote, ollamaModel, ollamaUrl, storeCallbacks],
  );

  const sendFreeMessage = useCallback(
    async (text: string) => {
      addMessage({ type: "user", content: text });
      setInput("");
      setLocalProcessing(true);

      try {
        const noteContext = selectedNote
          ? extractPlainText(selectedNote.content)
          : null;

        const result = await AIChatService.chat(
          text,
          historyRef.current,
          ollamaModel,
          ollamaUrl,
          noteContext,
          {
            storeCallbacks,
            onToolCall: (toolName) => addMessage({ type: "tool_call", content: toolName }),
          },
        );

        historyRef.current = [
          ...historyRef.current,
          { role: "user", content: text },
          { role: "assistant", content: result },
        ];
        saveHistory(historyRef.current);

        addMessage({ type: "assistant", content: result });
      } catch (error) {
        addMessage({ type: "error", content: `Erreur: ${error}` });
      } finally {
        setLocalProcessing(false);
      }
    },
    [addMessage, selectedNote, ollamaModel, ollamaUrl],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isCurrentlyProcessing) return;

      if (input.startsWith("/")) {
        const parts = input.slice(1).split(" ");
        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1).join(" ");
        executeSlashCommand(commandName, args || undefined);
      } else {
        sendFreeMessage(input.trim());
      }
    },
    [input, isCurrentlyProcessing, executeSlashCommand, sendFreeMessage],
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
    saveMessages([]);
    saveHistory([]);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (showCommands && filteredCommands.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedCommandIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0,
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedCommandIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1,
          );
        } else if (e.key === "Tab" || e.key === "Enter") {
          e.preventDefault();
          const cmd = filteredCommands[selectedCommandIndex];
          setInput(`/${cmd.name} `);
        }
      }
    },
    [showCommands, filteredCommands, selectedCommandIndex],
  );

  const selectCommand = useCallback((cmd: Command) => {
    setInput(`/${cmd.name} `);
    inputRef.current?.focus();
  }, []);

  return {
    input,
    setInput,
    messages,
    showCommands,
    selectedCommandIndex,
    filteredCommands,
    inputRef,
    messagesEndRef,
    ollamaUrl,
    isProcessing: isCurrentlyProcessing,
    handleSubmit,
    handleKeyDown,
    clearConversation,
    selectCommand,
  };
}

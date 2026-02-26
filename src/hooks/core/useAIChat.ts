import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useNotesStore } from "@/store/useNotesStore";
import { AIChatService, type ChatTurn } from "@/services/ai-chat";
import { extractPlainText } from "@/lib/utils/text";

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

interface UseAIChatOptions {
  onExecuteCommand: (command: string, args?: string) => Promise<string>;
  isProcessing: boolean;
  isOpen: boolean;
}

export function useAIChat({ onExecuteCommand, isProcessing, isOpen }: UseAIChatOptions) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [localProcessing, setLocalProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<ChatTurn[]>([]);

  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);
  const ollamaModel = useSettingsStore((s) => s.ollamaModel);
  const selectedNote = useNotesStore((s) => s.selectedNote);

  const isCurrentlyProcessing = isProcessing || localProcessing;

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

          const onToolCall = (toolName: string) => {
            addMessage({ type: "tool_call", content: toolName });
          };

          const result = await AIChatService.chat(
            userText,
            historyRef.current,
            ollamaModel,
            ollamaUrl,
            noteContext,
            onToolCall,
          );

          historyRef.current = [
            ...historyRef.current,
            { role: "user", content: userText },
            { role: "assistant", content: result },
          ];

          addMessage({ type: "assistant", content: result, command: commandName });
        } else {
          const result = await onExecuteCommand(command.action, args);
          addMessage({ type: "assistant", content: result, command: commandName });
        }
      } catch (error) {
        addMessage({ type: "error", content: `Erreur: ${error}` });
      } finally {
        setLocalProcessing(false);
      }
    },
    [addMessage, onExecuteCommand, selectedNote, ollamaModel, ollamaUrl],
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

        const onToolCall = (toolName: string) => {
          addMessage({ type: "tool_call", content: toolName });
        };

        const result = await AIChatService.chat(
          text,
          historyRef.current,
          ollamaModel,
          ollamaUrl,
          noteContext,
          onToolCall,
        );

        historyRef.current = [
          ...historyRef.current,
          { role: "user", content: text },
          { role: "assistant", content: result },
        ];

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

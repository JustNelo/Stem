import { useState, useRef, useEffect, useCallback } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";

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
  { name: "ask", description: "Poser une question", action: "ask" },
];

export { COMMANDS };
export type { Command };

export interface Message {
  id: string;
  type: "user" | "assistant" | "error";
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
  const [showCommands, setShowCommands] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);

  // Filter commands based on input
  const filteredCommands = input.startsWith("/")
    ? COMMANDS.filter((cmd) =>
        cmd.name.toLowerCase().startsWith(input.slice(1).toLowerCase())
      )
    : COMMANDS;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show commands menu when typing /
  useEffect(() => {
    setShowCommands(input.startsWith("/") && !input.includes(" "));
    setSelectedCommandIndex(0);
  }, [input]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const executeCommand = useCallback(async (commandName: string, args?: string) => {
    const command = COMMANDS.find((c) => c.name === commandName);
    if (!command) return;

    const displayContent = args || `/${commandName}`;
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: displayContent,
      command: commandName,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const result = await onExecuteCommand(command.action, args);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: result,
        command: commandName,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "error",
        content: `Erreur: ${error}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  }, [onExecuteCommand]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    if (input.startsWith("/")) {
      const parts = input.slice(1).split(" ");
      const commandName = parts[0].toLowerCase();
      const args = parts.slice(1).join(" ");
      executeCommand(commandName, args || undefined);
    } else {
      executeCommand("ask", input);
    }
  }, [input, isProcessing, executeCommand]);

  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showCommands && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedCommandIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedCommandIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        const cmd = filteredCommands[selectedCommandIndex];
        setInput(`/${cmd.name} `);
        setShowCommands(false);
      }
    }
  }, [showCommands, filteredCommands, selectedCommandIndex]);

  const selectCommand = useCallback((cmd: Command) => {
    setInput(`/${cmd.name} `);
    setShowCommands(false);
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
    handleSubmit,
    handleKeyDown,
    clearConversation,
    selectCommand,
  };
}

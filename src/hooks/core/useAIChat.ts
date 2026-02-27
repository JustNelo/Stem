import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useNotesStore } from "@/store/useNotesStore";
import { useToastStore } from "@/store/useToastStore";
import { AIChatService, type ChatTurn, type NoteContext } from "@/services/ai-chat";
import type { StoreCallbacks } from "@/services/ai-tools-dispatcher";
import { extractPlainText } from "@/lib/utils/text";
import {
  COMMANDS,
  loadMessagesAsync,
  saveMessage,
  updatePersistedMessage,
  loadHistory,
  saveHistory,
  clearStorage,
  type Message,
  type Command,
} from "./useAIChatPersistence";

export { COMMANDS };
export type { Command, Message };

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
  const historyRef = useRef<ChatTurn[]>(loadHistory());
  const abortRef = useRef<AbortController | null>(null);
  const loadedRef = useRef(false);

  // Load messages from SQLite on first mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadMessagesAsync().then((msgs) => {
      if (msgs.length > 0) setMessages(msgs);
    });
  }, []);

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
    saveMessage(fullMsg);
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
          // Slash commands build a prompt via onExecuteCommand then stream it (no tools needed)
          const prompt = await onExecuteCommand(command.action, args);
          const streamingMsg = addMessage({ type: "assistant", content: "", command: commandName });
          const streamMessages = [
            {
              role: "system",
              content:
                "Tu es un assistant intelligent. Réponds TOUJOURS en français sauf si l'utilisateur demande explicitement une autre langue. Utilise un style clair, structuré et pédagogique.",
            },
            { role: "user", content: prompt },
          ];
          let slashFullText = "";
          for await (const token of AIChatService.stream(streamMessages, ollamaModel, ollamaUrl)) {
            slashFullText += token;
            updateMessageContent(streamingMsg.id, token);
          }
          updatePersistedMessage(streamingMsg.id, slashFullText, streamingMsg.timestamp, "assistant", commandName);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        addMessage({ type: "error", content: msg });
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

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const noteContext: NoteContext | null = selectedNote
          ? {
              id: selectedNote.id,
              title: selectedNote.title,
              contentPreview: extractPlainText(selectedNote.content),
            }
          : null;

        const streamingMsg = addMessage({ type: "assistant", content: "" });
        let fullText = "";

        for await (const token of AIChatService.chatStream(
          text,
          historyRef.current,
          ollamaModel,
          ollamaUrl,
          noteContext,
          {
            storeCallbacks,
            onToolCall: (toolName) => addMessage({ type: "tool_call", content: toolName }),
            abortSignal: controller.signal,
          },
        )) {
          fullText += token;
          updateMessageContent(streamingMsg.id, token);
        }

        const finalText = fullText.trim() || "Pas de réponse.";
        if (!fullText.trim()) {
          setMessages((prev) =>
            prev.map((m) => (m.id === streamingMsg.id ? { ...m, content: finalText } : m)),
          );
        }
        updatePersistedMessage(streamingMsg.id, finalText, streamingMsg.timestamp, "assistant");

        historyRef.current = [
          ...historyRef.current,
          { role: "user", content: text },
          { role: "assistant", content: finalText },
        ];
        saveHistory(historyRef.current);
      } catch (error) {
        if (controller.signal.aborted) {
          addMessage({ type: "error", content: "Génération annulée." });
        } else {
          const msg = error instanceof Error ? error.message : String(error);
          addMessage({ type: "error", content: msg });
        }
      } finally {
        abortRef.current = null;
        setLocalProcessing(false);
      }
    },
    [addMessage, updateMessageContent, selectedNote, ollamaModel, ollamaUrl, storeCallbacks],
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

  const abortChat = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
    clearStorage();
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
    abortChat,
    selectCommand,
  };
}

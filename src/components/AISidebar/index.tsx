import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";

// Command definitions - easily extensible
interface Command {
  name: string;
  description: string;
  icon: string;
  action: string;
}

const COMMANDS: Command[] = [
  { name: "resume", description: "Résumer la note", icon: "📝", action: "summarize" },
  { name: "traduire", description: "Traduire en anglais", icon: "🌍", action: "translate" },
  { name: "corriger", description: "Corriger l'orthographe", icon: "✏️", action: "correct" },
  { name: "expliquer", description: "Expliquer simplement", icon: "💡", action: "explain" },
  { name: "idees", description: "Générer des idées", icon: "🧠", action: "ideas" },
  { name: "tags", description: "Suggérer des tags", icon: "🏷️", action: "tags" },
  { name: "ask", description: "Poser une question", icon: "💬", action: "ask" },
];

interface Message {
  id: string;
  type: "user" | "assistant" | "error";
  content: string;
  command?: string;
  timestamp: Date;
}

interface AISidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (command: string, args?: string) => Promise<string>;
  isProcessing: boolean;
}

const SIDEBAR_WIDTH = 320;

export function AISidebar({
  isOpen,
  onClose,
  onExecuteCommand,
  isProcessing,
}: AISidebarProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [showCommands, setShowCommands] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    // Add user message - show only the user's text, not the command
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
      // Free-form question - use ask command
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

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isOpen ? SIDEBAR_WIDTH : 0,
        opacity: isOpen ? 1 : 0,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative z-20 flex h-full shrink-0 flex-col overflow-hidden border-l border-border bg-surface-elevated pt-10"
    >
      <div className="flex h-full w-80 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 leading-none">
            <span className="text-text-secondary">✦</span>
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-text-muted leading-none">
              Copilot
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <motion.button
                onClick={clearConversation}
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Effacer la conversation"
                title="Effacer la conversation"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
              </motion.button>
            )}
            <motion.button
              onClick={onClose}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Close AI panel"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M5 3L9 7L5 11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="popLayout">
            {messages.length === 0 ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full flex-col items-center justify-center gap-4 text-center"
              >
                <div className="text-4xl">✦</div>
                <div>
                  <p className="text-sm text-text-secondary">
                    Tapez <kbd className="rounded bg-surface-hover px-1.5 py-0.5 font-mono text-xs">/</kbd> pour les commandes
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-text-muted">
                    ou posez une question
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`${
                      msg.type === "user"
                        ? "ml-8"
                        : msg.type === "error"
                        ? ""
                        : "mr-8"
                    }`}
                  >
                    {msg.type === "user" ? (
                      <div className="rounded-lg bg-text-secondary/10 px-3 py-2">
                        <code className="text-xs text-text-secondary">{msg.content}</code>
                      </div>
                    ) : msg.type === "error" ? (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
                        <p className="text-xs text-red-400">{msg.content}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-text-secondary">✦</span>
                          <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                            {msg.command}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-text-secondary">
                          {msg.content}
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-text-secondary">✦</span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted animate-pulse">
                      Réflexion...
                    </span>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Input area */}
        <div className="relative border-t border-border p-3">
          {/* Commands popup */}
          <AnimatePresence>
            {showCommands && filteredCommands.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-3 right-3 mb-2 overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-lg"
              >
                <div className="max-h-48 overflow-y-auto py-1">
                  {filteredCommands.map((cmd, index) => (
                    <button
                      key={cmd.name}
                      onClick={() => selectCommand(cmd)}
                      className={`flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors ${
                        index === selectedCommandIndex
                          ? "bg-surface-hover"
                          : "hover:bg-surface-hover"
                      }`}
                    >
                      <span className="text-base">{cmd.icon}</span>
                      <div className="flex-1">
                        <div className="text-sm text-text">/{cmd.name}</div>
                        <div className="text-xs text-text-muted">{cmd.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 focus-within:border-text-muted">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tapez / pour les commandes..."
                disabled={isProcessing}
                className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-ghost disabled:opacity-50"
              />
              <motion.button
                type="submit"
                disabled={!input.trim() || isProcessing}
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text disabled:opacity-30"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </motion.button>
            </div>
          </form>
        </div>
      </div>
    </motion.aside>
  );
}

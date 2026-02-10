import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, ChevronRight, Send, FileText, Globe, PenLine,
  Lightbulb, Brain, MessageCircle, Sparkles, Copy, Check,
} from "lucide-react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useAIChat } from "@/hooks/core/useAIChat";

// Strip all background colors from the theme to avoid the "highlighted" effect
const cleanTheme = Object.fromEntries(
  Object.entries(oneDark).map(([key, value]) => {
    if (typeof value === "object" && value !== null) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { background, backgroundColor, ...rest } = value as Record<string, string>;
      return [key, rest];
    }
    return [key, value];
  }),
);

// Icon mapping for commands
const COMMAND_ICONS: Record<string, React.ReactNode> = {
  resume: <FileText size={14} />,
  traduire: <Globe size={14} />,
  corriger: <PenLine size={14} />,
  expliquer: <Lightbulb size={14} />,
  idees: <Brain size={14} />,
  ask: <MessageCircle size={14} />,
};

interface AISidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (command: string, args?: string) => Promise<string>;
  isProcessing: boolean;
}

const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 240;
const MAX_WIDTH = 600;

export function AISidebar({
  isOpen,
  onClose,
  onExecuteCommand,
  isProcessing,
}: AISidebarProps) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const isResizing = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      const startX = e.clientX;
      const startWidth = sidebarWidth;

      const onMouseMove = (ev: MouseEvent) => {
        if (!isResizing.current) return;
        const delta = startX - ev.clientX;
        const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
        setSidebarWidth(newWidth);
      };

      const onMouseUp = () => {
        isResizing.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [sidebarWidth],
  );

  const {
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
  } = useAIChat({ onExecuteCommand, isProcessing, isOpen });

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isOpen ? sidebarWidth : 0,
        opacity: isOpen ? 1 : 0,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative z-20 flex h-full shrink-0 flex-col overflow-hidden border-l border-border bg-surface-elevated pt-10"
    >
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 z-30 h-full w-1 cursor-col-resize transition-colors hover:bg-text-muted/30"
      />
      <div className="flex h-full w-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 leading-none">
            <Sparkles size={12} className="text-text-secondary" />
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
                <Trash2 size={12} />
              </motion.button>
            )}
            <motion.button
              onClick={onClose}
              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Close AI panel"
            >
              <ChevronRight size={12} />
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
                <Sparkles size={32} className="text-text-muted" />
                <div>
                  <p className="text-sm text-text-secondary">
                    Tapez <kbd className="rounded bg-surface-hover px-1.5 py-0.5 font-mono text-xs">/</kbd> pour les commandes
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-text-muted">
                    ou posez une question
                  </p>
                </div>
                {!ollamaUrl && (
                  <p className="mt-2 rounded-lg border border-border bg-surface px-3 py-2 text-[11px] text-text-muted">
                    Configurez Ollama dans <strong className="text-text-secondary">Paramètres &gt; IA</strong> pour activer le copilot.
                  </p>
                )}
              </motion.div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
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
                      <AssistantMessage content={msg.content} command={msg.command} />
                    )}
                  </motion.div>
                ))}
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <Sparkles size={12} className="animate-pulse text-text-secondary" />
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
                      ref={index === selectedCommandIndex ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined}
                      onClick={() => selectCommand(cmd)}
                      className={`flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors ${
                        index === selectedCommandIndex
                          ? "bg-surface-hover"
                          : "hover:bg-surface-hover"
                      }`}
                    >
                      <span className="text-text-muted">{COMMAND_ICONS[cmd.name]}</span>
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
                <Send size={14} />
              </motion.button>
            </div>
          </form>
        </div>
      </div>
    </motion.aside>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-border">
      <div className="flex items-center justify-between bg-surface-hover/60 px-3 py-1">
        <span className="font-mono text-[11px] font-medium text-text-muted">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-text-ghost transition-colors hover:text-text-muted"
          title="Copier le code"
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
        </button>
      </div>
      <SyntaxHighlighter
        style={cleanTheme}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: "12px",
          fontSize: "12px",
          lineHeight: "1.6",
          background: "transparent",
          backgroundColor: "var(--color-surface)",
          overflowX: "auto",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function AssistantMessage({ content, command }: { content: string; command?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles size={10} className="text-text-secondary" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
          {command}
        </span>
      </div>
      <div className="ai-markdown text-[13px] leading-relaxed text-text-secondary [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-text [&_h2]:mb-1.5 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-text [&_h3]:mb-1.5 [&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-text [&_li]:mb-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_strong]:font-semibold [&_strong]:text-text [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
        <Markdown
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              const codeStr = String(children).replace(/\n$/, "");

              if (match) {
                return <CodeBlock code={codeStr} language={match[1]} />;
              }

              return (
                <code
                  className="rounded bg-surface-hover px-1.5 py-0.5 font-mono text-xs text-text-secondary"
                  {...props}
                >
                  {children}
                </code>
              );
            },
            pre({ children }) {
              return <>{children}</>;
            },
          }}
        >
          {content}
        </Markdown>
      </div>
    </div>
  );
}

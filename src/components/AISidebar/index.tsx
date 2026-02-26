import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, ChevronRight, Send, FileText, Globe, PenLine,
  Lightbulb, Brain, MessageCircle, Sparkles, Copy, Check, Square,
  Plus, Eye, Search, Pencil, FilePlus, Minus,
} from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import Markdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
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
    isProcessing: chatProcessing,
    handleSubmit,
    handleKeyDown,
    clearConversation,
    abortChat,
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
      className="relative z-20 flex h-full shrink-0 flex-col overflow-hidden border-l border-border bg-surface-deep panel-acrylic pt-8"
    >
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 z-30 h-full w-1 cursor-col-resize transition-colors hover:bg-border-metallic/50"
      />
      <div className="flex h-full w-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 leading-none">
            <Sparkles size={12} className="text-accent/60" />
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-text-muted leading-none">
              Copilot
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <IconButton label="Effacer la conversation" onClick={clearConversation}>
                <Trash2 size={12} />
              </IconButton>
            )}
            <IconButton label="Fermer le copilot (Ctrl+J)" onClick={onClose}>
              <ChevronRight size={12} />
            </IconButton>
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
                className="flex h-full flex-col items-center justify-center gap-3 text-center"
              >
                <Sparkles size={24} className="text-text-muted/50" />
                <div>
                  <p className="text-[13px] text-text-secondary">
                    Tapez <kbd className="rounded bg-surface-hover px-1.5 py-0.5 font-mono text-[11px]">/</kbd> pour les commandes
                  </p>
                  <p className="mt-1.5 text-[11px] text-text-muted">
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
              <div className="space-y-3">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {msg.type === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-text-secondary/10 px-3 py-1.5">
                          <p className="text-[13px] text-text-secondary">{msg.content}</p>
                        </div>
                      </div>
                    ) : msg.type === "tool_call" ? (
                      <ToolCallBadge toolName={msg.content} />
                    ) : msg.type === "error" ? (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                        <p className="text-[12px] text-red-400">{msg.content}</p>
                      </div>
                    ) : (
                      <AssistantMessage content={msg.content} command={msg.command} />
                    )}
                  </motion.div>
                ))}
                {chatProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 py-1"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted/60" />
                      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted/60" style={{ animationDelay: "0.15s" }} />
                      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted/60" style={{ animationDelay: "0.3s" }} />
                    </div>
                    <button
                      onClick={abortChat}
                      className="ml-auto flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-[11px] text-text-muted transition-colors hover:border-red-400/50 hover:text-red-400 cursor-pointer"
                      title="Arrêter la génération"
                    >
                      <Square size={8} />
                      Stop
                    </button>
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
                className="absolute bottom-full left-3 right-3 mb-2 overflow-hidden rounded-xl border border-border-metallic bg-surface-elevated shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03),0_4px_16px_rgba(0,0,0,0.35)]"
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
            <div className="flex items-center gap-2 rounded-xl border border-border-metallic/40 bg-surface-deep px-3 py-2.5 transition-all duration-200 focus-within:border-border-metallic focus-within:shadow-[0_0_12px_rgba(180,180,195,0.04)]">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tapez / pour les commandes..."
                disabled={chatProcessing}
                className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-ghost disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || chatProcessing}
                className="btn-sculpted flex h-7 w-7 cursor-pointer items-center justify-center text-text-muted transition-colors hover:text-text disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Send size={13} />
              </button>
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
    <div className="my-2 overflow-hidden rounded-xl border border-border-metallic shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02),0_2px_8px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-between border-b border-border bg-surface-hover/40 px-3 py-1.5">
        <span className="font-mono text-[10px] font-medium lowercase tracking-wide text-text-muted">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="btn-sculpted flex h-5 w-5 cursor-pointer items-center justify-center text-text-ghost transition-colors hover:text-text-muted"
          title="Copier le code"
        >
          {copied ? <Check size={9} /> : <Copy size={9} />}
        </button>
      </div>
      <SyntaxHighlighter
        style={cleanTheme}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: "12px 14px",
          fontSize: "12px",
          lineHeight: "1.7",
          background: "transparent",
          backgroundColor: "var(--color-surface-deep)",
          overflowX: "auto",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

const TOOL_META: Record<string, { label: string; icon: React.ReactNode }> = {
  list_notes: { label: "Lecture des notes", icon: <Eye size={10} /> },
  read_note: { label: "Lecture d'une note", icon: <Eye size={10} /> },
  create_note: { label: "Création d'une note", icon: <Plus size={10} /> },
  update_note: { label: "Mise à jour d'une note", icon: <Pencil size={10} /> },
  delete_note: { label: "Suppression d'une note", icon: <Minus size={10} /> },
  append_to_note: { label: "Ajout de contenu", icon: <FilePlus size={10} /> },
  search_notes: { label: "Recherche", icon: <Search size={10} /> },
};

function ToolCallBadge({ toolName }: { toolName: string }) {
  const meta = TOOL_META[toolName];
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <span className="text-text-ghost">{meta?.icon ?? <Brain size={10} />}</span>
      <span className="text-[11px] text-text-ghost">
        {meta?.label ?? toolName}
      </span>
    </div>
  );
}

function AssistantMessage({ content, command }: { content: string; command?: string }) {
  return (
    <div>
      {command && (
        <div className="mb-1 flex items-center gap-1.5">
          <Sparkles size={9} className="text-text-ghost" />
          <span className="text-[10px] text-text-ghost">{command}</span>
        </div>
      )}
      <div className="ai-markdown text-[13px] leading-[1.6] text-text-secondary [&_h1]:mb-1.5 [&_h1]:mt-3 [&_h1]:text-[14px] [&_h1]:font-semibold [&_h1]:text-text [&_h2]:mb-1 [&_h2]:mt-2.5 [&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:text-text [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-[13px] [&_h3]:font-medium [&_h3]:text-text [&_li]:mb-0.5 [&_li]:text-[13px] [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-1 [&_strong]:font-semibold [&_strong]:text-text [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4">
        <Markdown
          rehypePlugins={[rehypeSanitize]}
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              const codeStr = String(children).replace(/\n$/, "");

              if (match) {
                return <CodeBlock code={codeStr} language={match[1]} />;
              }

              return (
                <code
                  className="rounded bg-surface-hover/80 px-1 py-0.5 font-mono text-[12px] text-text-secondary"
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

import { invoke } from "@tauri-apps/api/core";
import type { ChatTurn } from "@/services/ai-chat";

export interface Message {
  id: string;
  type: "user" | "assistant" | "error" | "tool_call";
  content: string;
  command?: string;
  timestamp: Date;
}

export interface Command {
  name: string;
  description: string;
  action: string;
}

export const COMMANDS: Command[] = [
  { name: "resume", description: "Résumer la note", action: "summarize" },
  { name: "traduire", description: "Traduire en anglais", action: "translate" },
  { name: "corriger", description: "Corriger l'orthographe", action: "correct" },
  { name: "expliquer", description: "Expliquer simplement", action: "explain" },
  { name: "idees", description: "Générer des idées", action: "ideas" },
];

// Rust-side row shape
interface ChatMessageRow {
  id: string;
  role: string;
  content: string;
  command: string | null;
  msg_type: string;
  created_at: number;
}

/** Load all chat messages from SQLite (async, called once on mount). */
export async function loadMessagesAsync(): Promise<Message[]> {
  try {
    const rows = await invoke<ChatMessageRow[]>("get_chat_messages");
    return rows.map((r) => ({
      id: r.id,
      type: r.msg_type as Message["type"],
      content: r.content,
      command: r.command ?? undefined,
      timestamp: new Date(r.created_at * 1000),
    }));
  } catch {
    return [];
  }
}

/** Persist a single message to SQLite (fire-and-forget). */
export function saveMessage(msg: Message): void {
  invoke("save_chat_message", {
    message: {
      id: msg.id,
      role: msg.type === "user" ? "user" : "assistant",
      content: msg.content,
      command: msg.command ?? null,
      msg_type: msg.type,
      created_at: Math.floor(msg.timestamp.getTime() / 1000),
    },
  }).catch(() => {});
}

/** Update content of an existing persisted message (for streaming tokens). */
export function updatePersistedMessage(id: string, content: string, timestamp: Date, msgType: string, command?: string): void {
  invoke("save_chat_message", {
    message: {
      id,
      role: msgType === "user" ? "user" : "assistant",
      content,
      command: command ?? null,
      msg_type: msgType,
      created_at: Math.floor(timestamp.getTime() / 1000),
    },
  }).catch(() => {});
}

/** Synchronous initial load — returns empty, real data comes from loadMessagesAsync. */
export function loadMessages(): Message[] {
  return [];
}

/** Kept for backward compatibility — no-op now, individual saves via saveMessage. */
export function saveMessages(_messages: Message[]): void {}

// Chat history (ChatTurn[]) stays in localStorage — lightweight, only last N turns
const HISTORY_STORAGE_KEY = "stem_chat_history";

export function loadHistory(): ChatTurn[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatTurn[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(history: ChatTurn[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // fail silently
  }
}

export async function clearStorage(): Promise<void> {
  try {
    await invoke("clear_chat_messages");
  } catch {
    // fail silently
  }
  localStorage.removeItem(HISTORY_STORAGE_KEY);
}

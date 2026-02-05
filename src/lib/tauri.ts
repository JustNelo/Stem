import { invoke } from "@tauri-apps/api/core";
import type { z } from "zod";

/**
 * Type-safe Tauri IPC wrapper with runtime Zod validation.
 *
 * Usage:
 *   const notes = await safeInvoke("get_all_notes", NoteArraySchema);
 *   const note  = await safeInvoke("create_note", NoteSchema, { payload });
 */
export async function safeInvoke<T>(
  command: string,
  schema: z.ZodType<T>,
  args?: Record<string, unknown>,
): Promise<T> {
  const raw = await invoke(command, args);
  return schema.parse(raw);
}

/**
 * Fire-and-forget Tauri IPC call (no response validation needed).
 * Used for delete operations or void commands.
 */
export async function invokeVoid(
  command: string,
  args?: Record<string, unknown>,
): Promise<void> {
  await invoke(command, args);
}

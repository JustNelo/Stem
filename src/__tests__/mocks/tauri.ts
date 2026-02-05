import { vi } from "vitest";

// Mock @tauri-apps/api/core
export const invoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke,
}));

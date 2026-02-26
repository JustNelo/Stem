import { describe, it, expect, vi, beforeEach } from "vitest";
import { useNotesStore } from "@/store/useNotesStore";

// Mock @tauri-apps/api/core
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock toast store
vi.mock("@/store/useToastStore", () => ({
  useToastStore: {
    getState: () => ({ addToast: vi.fn() }),
  },
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

const MOCK_NOTE = {
  id: "test-1",
  title: "Test Note",
  content: null,
  created_at: 1700000000,
  updated_at: 1700000000,
  is_pinned: false,
  folder_id: null,
};

describe("useNotesStore", () => {
  beforeEach(() => {
    // Reset store state
    useNotesStore.setState({
      notes: [],
      selectedNote: null,
      isLoading: false,
    });
    vi.clearAllMocks();
  });

  it("has correct initial state", () => {
    const state = useNotesStore.getState();
    expect(state.notes).toEqual([]);
    expect(state.selectedNote).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it("fetchNotes populates notes array", async () => {
    mockInvoke.mockResolvedValueOnce([MOCK_NOTE]);

    await useNotesStore.getState().fetchNotes();

    const state = useNotesStore.getState();
    expect(state.notes).toEqual([MOCK_NOTE]);
    expect(state.isLoading).toBe(false);
    expect(mockInvoke).toHaveBeenCalledWith("get_all_notes", undefined);
  });

  it("fetchNotes handles errors gracefully", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("DB error"));

    await useNotesStore.getState().fetchNotes();

    const state = useNotesStore.getState();
    expect(state.notes).toEqual([]);
    expect(state.isLoading).toBe(false);
  });

  it("createNote calls invoke and adds note to state", async () => {
    const newNote = { ...MOCK_NOTE, id: "new-1", title: "Sans titre" };
    mockInvoke.mockResolvedValueOnce(newNote);

    const result = await useNotesStore.getState().createNote();

    expect(result).toEqual(newNote);
    expect(useNotesStore.getState().notes).toContainEqual(newNote);
    expect(useNotesStore.getState().selectedNote).toEqual(newNote);
  });

  it("createNote returns null on error", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("fail"));

    const result = await useNotesStore.getState().createNote();

    expect(result).toBeNull();
  });

  it("selectNote sets selectedNote", () => {
    useNotesStore.getState().selectNote(MOCK_NOTE);
    expect(useNotesStore.getState().selectedNote).toEqual(MOCK_NOTE);
  });

  it("deleteNote removes note from state", async () => {
    useNotesStore.setState({ notes: [MOCK_NOTE], selectedNote: MOCK_NOTE });
    mockInvoke.mockResolvedValueOnce(undefined);

    await useNotesStore.getState().deleteNote("test-1");

    expect(useNotesStore.getState().notes).toEqual([]);
    expect(useNotesStore.getState().selectedNote).toBeNull();
  });

  it("updateNote calls invoke with correct args", async () => {
    const updated = { ...MOCK_NOTE, title: "Updated" };
    useNotesStore.setState({ notes: [MOCK_NOTE], selectedNote: MOCK_NOTE });
    mockInvoke.mockResolvedValueOnce(updated);

    await useNotesStore.getState().updateNote("test-1", { title: "Updated", content: "content" });

    expect(mockInvoke).toHaveBeenCalledWith("update_note", {
      payload: { id: "test-1", title: "Updated", content: "content" },
    });
  });

  it("togglePin calls invoke and updates note", async () => {
    const pinned = { ...MOCK_NOTE, is_pinned: true };
    useNotesStore.setState({ notes: [MOCK_NOTE] });
    mockInvoke.mockResolvedValueOnce(pinned);

    await useNotesStore.getState().togglePin("test-1");

    const note = useNotesStore.getState().notes.find((n) => n.id === "test-1");
    expect(note?.is_pinned).toBe(true);
  });
});

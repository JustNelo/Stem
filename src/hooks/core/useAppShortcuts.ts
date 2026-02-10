import { useAppStore } from "@/store/useAppStore";
import { useNotesStore } from "@/store/useNotesStore";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

/**
 * Registers all global keyboard shortcuts via useKeyboardShortcut.
 *
 * - Ctrl+B → toggle left sidebar
 * - Ctrl+J → toggle right sidebar (AI)
 * - Ctrl+K → toggle command palette
 * - Ctrl+, → toggle settings
 * - Ctrl+N → create new note
 * - Escape → close command palette / deselect note
 */
export function useAppShortcuts() {
  const toggleLeft = useAppStore((s) => s.toggleLeftSidebar);
  const toggleRight = useAppStore((s) => s.toggleRightSidebar);
  const togglePalette = useAppStore((s) => s.toggleCommandPalette);
  const toggleSettings = useAppStore((s) => s.toggleSettings);
  const commandPaletteOpen = useAppStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const selectNote = useNotesStore((s) => s.selectNote);
  const createNote = useNotesStore((s) => s.createNote);

  useKeyboardShortcut([
    { key: "b", ctrl: true, global: true, handler: () => toggleLeft() },
    { key: "j", ctrl: true, global: true, handler: () => toggleRight() },
    { key: "k", ctrl: true, global: true, handler: () => togglePalette() },
    { key: ",", ctrl: true, global: true, handler: () => toggleSettings() },
    { key: "n", ctrl: true, global: true, handler: () => createNote() },
    {
      key: "Escape",
      global: true,
      handler: () => {
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
        } else {
          selectNote(null);
        }
      },
    },
  ]);
}

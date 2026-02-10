import { useEffect, useRef } from "react";

interface ShortcutDefinition {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** If true, the shortcut fires even when an input/textarea/contenteditable is focused */
  global?: boolean;
  handler: (e: KeyboardEvent) => void;
}

/**
 * Registers multiple keyboard shortcuts with automatic cleanup.
 * Avoids memory leaks by removing the event listener on unmount.
 *
 * Usage:
 *   useKeyboardShortcut([
 *     { key: "k", ctrl: true, handler: () => togglePalette() },
 *     { key: "b", ctrl: true, handler: () => toggleLeftSidebar() },
 *   ]);
 */
export function useKeyboardShortcut(shortcuts: ShortcutDefinition[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditable =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const shortcut of shortcutsRef.current) {
        if (!shortcut.global && isEditable) continue;

        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrl === (e.ctrlKey || e.metaKey);
        const shiftMatch = !!shortcut.shift === e.shiftKey;
        const altMatch = !!shortcut.alt === e.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.handler(e);
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

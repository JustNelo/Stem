import { useEffect, useCallback } from "react";

type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
};

interface UseKeyboardOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export function useKeyboard({ shortcuts, enabled = true }: UseKeyboardOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const target = event.target as HTMLElement;
      const isEditing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          if (shortcut.ctrl || shortcut.alt) {
            event.preventDefault();
            shortcut.action();
            return;
          }

          if (!isEditing) {
            event.preventDefault();
            shortcut.action();
            return;
          }
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

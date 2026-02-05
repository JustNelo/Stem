import { useEffect } from "react";
import type { View } from "@/hooks/core/useEditorState";

interface UseAppShortcutsOptions {
  view: View;
  onBack: () => void;
  onToggleSettings: () => void;
}

/**
 * Registers global keyboard shortcuts:
 * - Ctrl+, → toggle settings
 * - Escape / Ctrl+P (in editor view) → navigate back
 */
export function useAppShortcuts({
  view,
  onBack,
  onToggleSettings,
}: UseAppShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global: toggle settings
      if (e.key === "," && e.ctrlKey) {
        e.preventDefault();
        onToggleSettings();
        return;
      }

      // Editor-only shortcuts
      if (view !== "editor") return;

      if (e.key === "Escape") {
        e.preventDefault();
        onBack();
      }
      if (e.key.toLowerCase() === "p" && e.ctrlKey) {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view, onBack, onToggleSettings]);
}

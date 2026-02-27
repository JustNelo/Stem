import { createRoot, type Root } from "react-dom/client";
import type { SuggestionOptions, SuggestionKeyDownProps } from "@tiptap/suggestion";
import { SlashCommandMenu, type SlashCommandMenuRef } from "./SlashCommandMenu";
import type { SlashCommandItem } from "./slash-command";

/**
 * Bridges @tiptap/suggestion lifecycle to the SlashCommandMenu React component.
 * Renders the menu in a floating div positioned near the cursor.
 */
export function createSuggestionRenderer(): SuggestionOptions<SlashCommandItem>["render"] {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  let menuRef: SlashCommandMenuRef | null = null;

  return () => ({
    onStart(props) {
      container = document.createElement("div");
      container.classList.add("slash-command-portal");
      document.body.appendChild(container);

      root = createRoot(container);

      updatePosition(container, props.clientRect);
      renderMenu(root, props.items, props.command);
    },

    onUpdate(props) {
      if (!root || !container) return;
      updatePosition(container, props.clientRect);
      renderMenu(root, props.items, props.command);
    },

    onKeyDown(props: SuggestionKeyDownProps) {
      if (props.event.key === "Escape") {
        cleanup();
        return true;
      }
      return menuRef?.onKeyDown({ event: props.event }) ?? false;
    },

    onExit() {
      cleanup();
    },
  });

  function renderMenu(
    r: Root,
    items: SlashCommandItem[],
    command: (item: SlashCommandItem) => void,
  ) {
    r.render(
      <SlashCommandMenu
        ref={(ref) => {
          menuRef = ref;
        }}
        items={items}
        command={command}
      />,
    );
  }

  function updatePosition(
    el: HTMLDivElement,
    clientRect: (() => DOMRect | null) | null | undefined,
  ) {
    if (!clientRect) return;
    const rect = typeof clientRect === "function" ? clientRect() : clientRect;
    if (!rect) return;

    el.style.position = "fixed";
    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.bottom + 4}px`;
    el.style.zIndex = "100";
  }

  function cleanup() {
    if (root) {
      root.unmount();
      root = null;
    }
    if (container) {
      container.remove();
      container = null;
    }
    menuRef = null;
  }
}

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Code,
  Quote,
  Minus,
  FileText,
  Globe,
  PenLine,
  Lightbulb,
  Brain,
  Sparkles,
} from "lucide-react";
import type { SlashCommandItem } from "./slash-command";

const ICON_MAP: Record<string, React.ReactNode> = {
  heading1: <Heading1 size={16} />,
  heading2: <Heading2 size={16} />,
  heading3: <Heading3 size={16} />,
  list: <List size={16} />,
  listOrdered: <ListOrdered size={16} />,
  listTodo: <ListTodo size={16} />,
  code: <Code size={16} />,
  quote: <Quote size={16} />,
  minus: <Minus size={16} />,
  fileText: <FileText size={16} />,
  globe: <Globe size={16} />,
  penLine: <PenLine size={16} />,
  lightbulb: <Lightbulb size={16} />,
  brain: <Brain size={16} />,
};

export interface SlashCommandMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface SlashCommandMenuProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export const SlashCommandMenu = forwardRef<
  SlashCommandMenuRef,
  SlashCommandMenuProps
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) command(item);
    },
    [items, command],
  );

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((prev) => (prev >= items.length - 1 ? 0 : prev + 1));
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  // Scroll selected item into view
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (items.length === 0) return null;

  const blockItems = items.filter((i) => i.group === "blocks");
  const aiItems = items.filter((i) => i.group === "ai");

  // We need a flat index across both groups
  let flatIndex = 0;

  return (
    <div
      ref={containerRef}
      className="slash-command-menu"
    >
      {blockItems.length > 0 && (
        <>
          <div className="slash-command-group-label">Blocs</div>
          {blockItems.map((item) => {
            const idx = flatIndex++;
            return (
              <button
                key={item.title}
                data-index={idx}
                onClick={() => selectItem(idx)}
                className={`slash-command-item ${idx === selectedIndex ? "is-selected" : ""}`}
              >
                <span className="slash-command-icon">
                  {ICON_MAP[item.icon] ?? <Code size={16} />}
                </span>
                <div className="slash-command-text">
                  <span className="slash-command-title">{item.title}</span>
                  <span className="slash-command-desc">{item.description}</span>
                </div>
              </button>
            );
          })}
        </>
      )}
      {aiItems.length > 0 && (
        <>
          <div className="slash-command-group-label">
            <Sparkles size={10} className="inline-block mr-1 opacity-60" />
            IA
          </div>
          {aiItems.map((item) => {
            const idx = flatIndex++;
            return (
              <button
                key={item.title}
                data-index={idx}
                onClick={() => selectItem(idx)}
                className={`slash-command-item ${idx === selectedIndex ? "is-selected" : ""}`}
              >
                <span className="slash-command-icon slash-command-icon-ai">
                  {ICON_MAP[item.icon] ?? <Brain size={16} />}
                </span>
                <div className="slash-command-text">
                  <span className="slash-command-title">{item.title}</span>
                  <span className="slash-command-desc">{item.description}</span>
                </div>
              </button>
            );
          })}
        </>
      )}
    </div>
  );
});

SlashCommandMenu.displayName = "SlashCommandMenu";

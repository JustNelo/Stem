interface BlockNoteInlineContent {
  type: "text";
  text: string;
  styles: Record<string, boolean>;
}

interface BlockNoteBlock {
  id: string;
  type: string;
  props: Record<string, string>;
  content: BlockNoteInlineContent[] | string;
  children: BlockNoteBlock[];
}

const DEFAULT_PROPS = { textColor: "default", backgroundColor: "default", textAlignment: "left" };

/**
 * Parses inline Markdown (**bold**, *italic*, `code`) into BlockNote styled text segments.
 */
function parseInlineStyles(text: string): BlockNoteInlineContent[] {
  const segments: BlockNoteInlineContent[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", text: text.slice(lastIndex, match.index), styles: {} });
    }
    if (match[2]) {
      segments.push({ type: "text", text: match[2], styles: { bold: true } });
    } else if (match[3]) {
      segments.push({ type: "text", text: match[3], styles: { italic: true } });
    } else if (match[4]) {
      segments.push({ type: "text", text: match[4], styles: { code: true } });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", text: text.slice(lastIndex), styles: {} });
  }

  return segments.length > 0 ? segments : [{ type: "text", text, styles: {} }];
}

/**
 * Converts Markdown text into a BlockNote-compatible JSON document.
 * Supports: headings (# ## ###), fenced code blocks, bullet lists (-),
 * numbered lists (1.), paragraphs, bold, italic, inline code.
 */
export function markdownToBlockNoteJson(markdown: string): string {
  const lines = markdown.split("\n");
  const blocks: BlockNoteBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith("```")) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({
        id: crypto.randomUUID(),
        type: "codeBlock",
        props: { language: lang || "plain" },
        content: codeLines.join("\n"),
        children: [],
      });
      continue;
    }

    // Empty line → skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push({
        id: crypto.randomUUID(),
        type: "heading",
        props: { ...DEFAULT_PROPS, level: String(level) },
        content: parseInlineStyles(headingMatch[2].trim()),
        children: [],
      });
      i++;
      continue;
    }

    // Bullet list items
    if (line.match(/^\s*[-*]\s+/)) {
      while (i < lines.length && lines[i].match(/^\s*[-*]\s+/)) {
        const itemText = lines[i].replace(/^\s*[-*]\s+/, "");
        blocks.push({
          id: crypto.randomUUID(),
          type: "bulletListItem",
          props: DEFAULT_PROPS,
          content: parseInlineStyles(itemText),
          children: [],
        });
        i++;
      }
      continue;
    }

    // Numbered list items
    if (line.match(/^\s*\d+\.\s+/)) {
      while (i < lines.length && lines[i].match(/^\s*\d+\.\s+/)) {
        const itemText = lines[i].replace(/^\s*\d+\.\s+/, "");
        blocks.push({
          id: crypto.randomUUID(),
          type: "numberedListItem",
          props: DEFAULT_PROPS,
          content: parseInlineStyles(itemText),
          children: [],
        });
        i++;
      }
      continue;
    }

    // Regular paragraph
    blocks.push({
      id: crypto.randomUUID(),
      type: "paragraph",
      props: DEFAULT_PROPS,
      content: parseInlineStyles(line),
      children: [],
    });
    i++;
  }

  return JSON.stringify(blocks);
}

/**
 * Parses a BlockNote JSON string into an array of blocks.
 * Returns an empty array if parsing fails.
 */
export function parseBlockNoteContent(content: string | null): BlockNoteBlock[] {
  if (!content) return [];
  try {
    return JSON.parse(content) as BlockNoteBlock[];
  } catch {
    return [];
  }
}

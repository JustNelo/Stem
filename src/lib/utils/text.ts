/**
 * Extracts plain text from note content.
 * Supports both Markdown (current) and legacy BlockNote JSON.
 * Strips Markdown syntax (headings, bold, code fences, etc.) to return raw text.
 */
export function extractPlainText(content: string | null | undefined): string {
  if (!content) return "";

  // Legacy BlockNote JSON detection — starts with '[' and parses as array
  if (content.trimStart().startsWith("[")) {
    try {
      const blocks = JSON.parse(content);
      let text = "";
      const walk = (obj: unknown): void => {
        if (!obj || typeof obj !== "object") return;
        if (Array.isArray(obj)) {
          obj.forEach(walk);
          return;
        }
        const record = obj as Record<string, unknown>;
        if (typeof record.text === "string") {
          text += " " + record.text;
        }
        if (record.content) walk(record.content);
        if (record.children) walk(record.children);
      };
      walk(blocks);
      return text.trim();
    } catch {
      // Not valid JSON — fall through to Markdown stripping
    }
  }

  // Markdown → plain text: strip syntax
  return content
    .replace(/```[\s\S]*?```/g, " ")       // fenced code blocks
    .replace(/`([^`]+)`/g, "$1")            // inline code
    .replace(/#{1,6}\s+/g, "")              // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")        // bold
    .replace(/\*(.+?)\*/g, "$1")            // italic
    .replace(/__(.+?)__/g, "$1")            // bold alt
    .replace(/_(.+?)_/g, "$1")              // italic alt
    .replace(/~~(.+?)~~/g, "$1")            // strikethrough
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1") // images
    .replace(/^>\s+/gm, "")                 // blockquotes
    .replace(/^[-*+]\s+/gm, "")             // unordered lists
    .replace(/^\d+\.\s+/gm, "")             // ordered lists
    .replace(/^- \[[ x]\]\s+/gm, "")        // task lists
    .replace(/---+/g, "")                    // horizontal rules
    .replace(/\n{2,}/g, "\n")               // collapse blank lines
    .trim();
}

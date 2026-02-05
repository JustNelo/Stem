/**
 * Extracts plain text from BlockNote JSON content.
 * Recursively walks the document tree and concatenates all text nodes.
 */
export function extractPlainText(content: string | null | undefined): string {
  if (!content) return "";
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
    return "";
  }
}

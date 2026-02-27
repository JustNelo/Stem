import { describe, it, expect } from "vitest";
import { extractPlainText } from "@/lib/utils/text";

describe("extractPlainText", () => {
  it("returns empty string for null/undefined", () => {
    expect(extractPlainText(null)).toBe("");
    expect(extractPlainText(undefined as unknown as string)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(extractPlainText("")).toBe("");
  });

  // Legacy BlockNote JSON support
  it("extracts text from simple BlockNote content", () => {
    const content = JSON.stringify([
      {
        type: "paragraph",
        content: [{ type: "text", text: "Hello world" }],
      },
    ]);
    expect(extractPlainText(content)).toBe("Hello world");
  });

  it("extracts text from nested blocks", () => {
    const content = JSON.stringify([
      {
        type: "paragraph",
        content: [{ type: "text", text: "First" }],
        children: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Nested" }],
          },
        ],
      },
    ]);
    const result = extractPlainText(content);
    expect(result).toContain("First");
    expect(result).toContain("Nested");
  });

  it("joins multiple text nodes with spaces", () => {
    const content = JSON.stringify([
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Hello" },
          { type: "text", text: "world" },
        ],
      },
    ]);
    expect(extractPlainText(content)).toBe("Hello world");
  });

  // Markdown support
  it("extracts text from plain Markdown", () => {
    expect(extractPlainText("Hello world")).toBe("Hello world");
  });

  it("strips Markdown headings", () => {
    expect(extractPlainText("## My heading\nSome text")).toBe("My heading\nSome text");
  });

  it("strips bold and italic", () => {
    expect(extractPlainText("**bold** and *italic*")).toBe("bold and italic");
  });

  it("strips code fences", () => {
    const md = "Before\n```js\nconst x = 1;\n```\nAfter";
    const result = extractPlainText(md);
    expect(result).toContain("Before");
    expect(result).toContain("After");
    expect(result).not.toContain("const x");
  });

  it("strips inline code", () => {
    expect(extractPlainText("use `foo` here")).toBe("use foo here");
  });

  it("strips Markdown links", () => {
    expect(extractPlainText("[click me](https://example.com)")).toBe("click me");
  });

  it("handles non-JSON that starts with [", () => {
    expect(extractPlainText("[not valid json")).toBe("[not valid json");
  });
});

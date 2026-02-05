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

  it("returns empty string for invalid JSON", () => {
    expect(extractPlainText("not json")).toBe("");
  });

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
});

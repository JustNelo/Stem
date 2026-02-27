import { describe, it, expect } from "vitest";
import { countWords, formatRelativeTime } from "@/lib/format";

describe("countWords", () => {
  it("returns 0 for null content", () => {
    expect(countWords(null)).toBe(0);
  });

  it("returns 0 for undefined content", () => {
    expect(countWords(undefined as unknown as string)).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(countWords("")).toBe(0);
  });

  it("counts words in legacy BlockNote JSON", () => {
    const content = JSON.stringify([
      {
        type: "paragraph",
        content: [{ type: "text", text: "Hello world foo bar" }],
      },
    ]);
    expect(countWords(content)).toBe(4);
  });

  it("counts words across multiple blocks", () => {
    const content = JSON.stringify([
      {
        type: "paragraph",
        content: [{ type: "text", text: "First block" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Second block here" }],
      },
    ]);
    expect(countWords(content)).toBe(5);
  });

  it("counts words in Markdown content", () => {
    expect(countWords("Hello world foo bar")).toBe(4);
  });

  it("counts words in Markdown with headings", () => {
    expect(countWords("## Heading\nSome text here")).toBe(4);
  });
});

describe("formatRelativeTime", () => {
  it("returns 'À l'instant' for recent timestamps", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatRelativeTime(now)).toBe("À l'instant");
  });

  it("returns minutes for timestamps less than an hour ago", () => {
    const fiveMinAgo = Math.floor(Date.now() / 1000) - 5 * 60;
    expect(formatRelativeTime(fiveMinAgo)).toBe("Il y a 5 min");
  });

  it("returns hours for timestamps less than a day ago", () => {
    const twoHoursAgo = Math.floor(Date.now() / 1000) - 2 * 3600;
    expect(formatRelativeTime(twoHoursAgo)).toBe("Il y a 2h");
  });

  it("returns days for timestamps more than a day ago", () => {
    const threeDaysAgo = Math.floor(Date.now() / 1000) - 3 * 86400;
    expect(formatRelativeTime(threeDaysAgo)).toBe("Il y a 3j");
  });
});

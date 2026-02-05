export type ThemeId = "light" | "dark" | "sepia" | "nord" | "sakura" | "ocean";

export type FontId = "satoshi" | "inter" | "jetbrains-mono";

export type FontSize = "small" | "medium" | "large";

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  description: string;
  preview: {
    surface: string;
    text: string;
    accent: string;
  };
}

export interface FontDefinition {
  id: FontId;
  name: string;
  cssFamily: string;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: "light",
    name: "Light",
    description: "Clean et productif",
    preview: { surface: "#fafaf9", text: "#1c1917", accent: "#18181b" },
  },
  {
    id: "dark",
    name: "Dark",
    description: "Confort nocturne",
    preview: { surface: "#18181b", text: "#fafaf9", accent: "#a1a1aa" },
  },
  {
    id: "sepia",
    name: "Sepia",
    description: "Lecture longue durée",
    preview: { surface: "#f5f0e8", text: "#433422", accent: "#8b7355" },
  },
  {
    id: "nord",
    name: "Nord",
    description: "Nordique et froid",
    preview: { surface: "#2e3440", text: "#eceff4", accent: "#88c0d0" },
  },
  {
    id: "sakura",
    name: "Sakura",
    description: "Doux et printanier",
    preview: { surface: "#fef2f4", text: "#4a2030", accent: "#e8a0b4" },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Profondeur marine",
    preview: { surface: "#0f1b2d", text: "#e0e8f0", accent: "#38bdf8" },
  },
];

export const FONTS: FontDefinition[] = [
  {
    id: "satoshi",
    name: "Satoshi",
    cssFamily: '"Satoshi", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    id: "inter",
    name: "Inter",
    cssFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    id: "jetbrains-mono",
    name: "JetBrains Mono",
    cssFamily: '"JetBrains Mono", ui-monospace, "SF Mono", "Consolas", monospace',
  },
];

export const FONT_SIZES: Record<FontSize, number> = {
  small: 14,
  medium: 16,
  large: 18,
};

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeId, FontId, FontSize } from "@/types/settings";
import { FONTS, FONT_SIZES } from "@/types/settings";

interface SettingsState {
  // User
  userName: string;
  hasCompletedOnboarding: boolean;

  // Appearance
  theme: ThemeId;
  fontFamily: FontId;
  fontSize: FontSize;

  // AI
  ollamaModel: string;
  ollamaUrl: string;
  embeddingModel: string;

  // Git Sync
  gitRepoPath: string;
  gitAutoSync: boolean;

  // Actions
  setUserName: (name: string) => void;
  setTheme: (theme: ThemeId) => void;
  setFontFamily: (font: FontId) => void;
  setFontSize: (size: FontSize) => void;
  setOllamaModel: (model: string) => void;
  setOllamaUrl: (url: string) => void;
  setEmbeddingModel: (model: string) => void;
  setGitRepoPath: (path: string) => void;
  setGitAutoSync: (enabled: boolean) => void;
  completeOnboarding: () => void;
  resetSettings: () => void;
  resetOnboarding: () => void;
}

const DEFAULT_SETTINGS = {
  userName: "",
  hasCompletedOnboarding: false,
  theme: "light" as ThemeId,
  fontFamily: "satoshi" as FontId,
  fontSize: "medium" as FontSize,
  ollamaModel: "qwen2.5",
  ollamaUrl: "http://localhost:11434",
  embeddingModel: "nomic-embed-text",
  gitRepoPath: "",
  gitAutoSync: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setUserName: (userName) => set({ userName }),

      setTheme: (theme) => {
        document.documentElement.setAttribute("data-theme", theme);
        set({ theme });
      },

      setFontFamily: (fontFamily) => {
        const font = FONTS.find((f) => f.id === fontFamily);
        if (font) {
          document.documentElement.style.setProperty("--font-sans", font.cssFamily);
        }
        set({ fontFamily });
      },

      setFontSize: (fontSize) => {
        const size = FONT_SIZES[fontSize];
        document.documentElement.style.setProperty("--font-size-base", `${size}px`);
        set({ fontSize });
      },

      setOllamaModel: (ollamaModel) => set({ ollamaModel }),
      setOllamaUrl: (ollamaUrl) => set({ ollamaUrl }),
      setEmbeddingModel: (embeddingModel) => set({ embeddingModel }),
      setGitRepoPath: (gitRepoPath) => set({ gitRepoPath }),
      setGitAutoSync: (gitAutoSync) => set({ gitAutoSync }),

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

      resetSettings: () => {
        const { hasCompletedOnboarding, userName } = useSettingsStore.getState();
        document.documentElement.setAttribute("data-theme", DEFAULT_SETTINGS.theme);
        document.documentElement.style.removeProperty("--font-sans");
        document.documentElement.style.removeProperty("--font-size-base");
        set({ ...DEFAULT_SETTINGS, hasCompletedOnboarding, userName });
      },

      resetOnboarding: () => {
        document.documentElement.setAttribute("data-theme", DEFAULT_SETTINGS.theme);
        document.documentElement.style.removeProperty("--font-sans");
        document.documentElement.style.removeProperty("--font-size-base");
        set({ ...DEFAULT_SETTINGS });
      },
    }),
    { name: "stem-settings" }
  )
);

/**
 * Apply persisted settings to the DOM on app startup.
 * Call this once in App.tsx or main.tsx.
 */
export function applyPersistedSettings() {
  const state = useSettingsStore.getState();

  // Theme
  document.documentElement.setAttribute("data-theme", state.theme);

  // Font family
  const font = FONTS.find((f) => f.id === state.fontFamily);
  if (font) {
    document.documentElement.style.setProperty("--font-sans", font.cssFamily);
  }

  // Font size
  const size = FONT_SIZES[state.fontSize];
  document.documentElement.style.setProperty("--font-size-base", `${size}px`);
}

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  // User
  userName: string;
  hasCompletedOnboarding: boolean;

  // AI
  ollamaModel: string;
  ollamaUrl: string;
  embeddingModel: string;

  // Git Sync
  gitRepoPath: string;
  gitAutoSync: boolean;

  // Actions
  setUserName: (name: string) => void;
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
      setOllamaModel: (ollamaModel) => set({ ollamaModel }),
      setOllamaUrl: (ollamaUrl) => set({ ollamaUrl }),
      setEmbeddingModel: (embeddingModel) => set({ embeddingModel }),
      setGitRepoPath: (gitRepoPath) => set({ gitRepoPath }),
      setGitAutoSync: (gitAutoSync) => set({ gitAutoSync }),

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

      resetSettings: () => {
        const { hasCompletedOnboarding, userName } = useSettingsStore.getState();
        set({ ...DEFAULT_SETTINGS, hasCompletedOnboarding, userName });
      },

      resetOnboarding: () => {
        set({ ...DEFAULT_SETTINGS });
      },
    }),
    { name: "stem-settings" }
  )
);

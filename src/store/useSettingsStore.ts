import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  // User
  userName: string;
  hasCompletedOnboarding: boolean;

  // AI
  aiEnabled: boolean;
  ollamaModel: string;
  ollamaUrl: string;
  embeddingModel: string;

  // Actions
  setUserName: (name: string) => void;
  setAiEnabled: (enabled: boolean) => void;
  setOllamaModel: (model: string) => void;
  setOllamaUrl: (url: string) => void;
  setEmbeddingModel: (model: string) => void;
  completeOnboarding: () => void;
  resetSettings: () => void;
  resetOnboarding: () => void;
}

const DEFAULT_SETTINGS = {
  userName: "",
  hasCompletedOnboarding: false,
  aiEnabled: true,
  ollamaModel: "mistral:latest",
  ollamaUrl: "http://localhost:11434",
  embeddingModel: "nomic-embed-text",
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setUserName: (userName) => set({ userName }),
      setAiEnabled: (aiEnabled) => set({ aiEnabled }),
      setOllamaModel: (ollamaModel) => set({ ollamaModel }),
      setOllamaUrl: (ollamaUrl) => set({ ollamaUrl }),
      setEmbeddingModel: (embeddingModel) => set({ embeddingModel }),

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),

      resetSettings: () => {
        const { hasCompletedOnboarding, userName } = useSettingsStore.getState();
        set({ ...DEFAULT_SETTINGS, hasCompletedOnboarding, userName });
      },

      resetOnboarding: () => {
        set({ ...DEFAULT_SETTINGS });
      },
    }),
    {
      name: "stem-settings",
      version: 1,
      migrate: (persisted, version) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = persisted as any;
        if (version === 0 && state?.ollamaModel && !state.ollamaModel.includes(":")) {
          state.ollamaModel = `${state.ollamaModel}:latest`;
        }
        return state;
      },
    }
  )
);

import { create } from "zustand";

interface AppState {
  // Sidebar visibility
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;

  // Command palette
  commandPaletteOpen: boolean;

  // Settings overlay
  showSettings: boolean;

  // Actions
  toggleLeftSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  toggleRightSidebar: () => void;
  setRightSidebarOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleSettings: () => void;
  setShowSettings: (show: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  leftSidebarOpen: true,
  rightSidebarOpen: false,
  commandPaletteOpen: false,
  showSettings: false,

  toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
  setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),

  toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
  setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),

  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  toggleSettings: () => set((s) => ({ showSettings: !s.showSettings })),
  setShowSettings: (show) => set({ showSettings: show }),
}));

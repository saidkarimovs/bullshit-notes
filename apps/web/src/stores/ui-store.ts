"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiState = {
  sidebarCollapsed: boolean;
  theme: "dark" | "light";
  paletteOpen: boolean;
  toggleSidebar: () => void;
  setTheme: (theme: "dark" | "light") => void;
  setPaletteOpen: (open: boolean) => void;
};

export const useUiStore = create<UiState>()(persist((set) => ({
  sidebarCollapsed: false,
  theme: "dark",
  paletteOpen: false,
  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setTheme: theme => set({ theme }),
  setPaletteOpen: paletteOpen => set({ paletteOpen }),
}), { name: "skyvision-ui", partialize: state => ({
  sidebarCollapsed: state.sidebarCollapsed, theme: state.theme,
}) }));

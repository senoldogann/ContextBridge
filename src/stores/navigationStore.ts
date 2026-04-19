import { create } from "zustand";

export type View = "dashboard" | "project" | "settings";

interface NavigationState {
  currentView: View;
  navigate: (view: View) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentView: "dashboard",
  navigate: (view: View) => set({ currentView: view }),
}));

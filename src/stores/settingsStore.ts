import { create } from "zustand";
import type { AppSettings } from "@/types";
import * as tauri from "@/lib/tauri";

interface SettingsState extends AppSettings {
  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: "dark",
  autoSync: true,
  enabledAdapters: ["claude", "cursor", "copilot", "codex"],

  loadSettings: async () => {
    try {
      const theme = await tauri.getSetting("theme");
      const autoSync = await tauri.getSetting("auto_sync");
      const adapters = await tauri.getSetting("enabled_adapters");

      set({
        theme: theme === "light" ? "light" : "dark",
        autoSync: autoSync !== "false",
        enabledAdapters: adapters ? JSON.parse(adapters) as string[] : ["claude", "cursor", "copilot", "codex"],
      });
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  },

  updateSetting: async (key: string, value: string) => {
    try {
      await tauri.setSetting(key, value);

      if (key === "theme") {
        set({ theme: value === "light" ? "light" : "dark" });
      } else if (key === "auto_sync") {
        set({ autoSync: value !== "false" });
      } else if (key === "enabled_adapters") {
        set({ enabledAdapters: JSON.parse(value) as string[] });
      }
    } catch (err) {
      console.error("Failed to update setting:", err);
    }
  },
}));

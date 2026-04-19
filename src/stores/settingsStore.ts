import { create } from "zustand";
import type { AppSettings } from "@/types";
import * as tauri from "@/lib/tauri";

function parseStringArray(json: string, fallback: string[]): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) {
      return parsed as string[];
    }
  } catch {
    // invalid JSON, use fallback
  }
  return fallback;
}

const DEFAULT_ADAPTERS = ["claude", "cursor", "copilot", "codex"];

interface SettingsState extends AppSettings {
  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: "dark",
  autoSync: true,
  enabledAdapters: DEFAULT_ADAPTERS,

  loadSettings: async () => {
    try {
      const theme = await tauri.getSetting("theme");
      const autoSync = await tauri.getSetting("auto_sync");
      const adapters = await tauri.getSetting("enabled_adapters");

      set({
        theme: theme === "light" ? "light" : "dark",
        autoSync: autoSync !== "false",
        enabledAdapters: adapters ? parseStringArray(adapters, DEFAULT_ADAPTERS) : DEFAULT_ADAPTERS,
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
        set({ enabledAdapters: parseStringArray(value, DEFAULT_ADAPTERS) });
      }
    } catch (err) {
      console.error("Failed to update setting:", err);
    }
  },
}));

import { create } from "zustand";
import type { AppSettings, ThemeId } from "@/types";
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

const VALID_THEMES: ThemeId[] = [
  "light",
  "dark",
  "system",
  "zinc",
  "midnight",
  "claude",
  "ghostty",
];

const DARK_PALETTE_THEMES: ThemeId[] = ["zinc", "midnight", "claude", "ghostty"];

function isValidTheme(value: string): value is ThemeId {
  return (VALID_THEMES as string[]).includes(value);
}

/** Resolve the effective light/dark mode and data-theme attribute from a ThemeId. */
function resolveThemeClasses(themeId: ThemeId): { isDark: boolean; dataTheme: string } {
  if (themeId === "light") {
    return { isDark: false, dataTheme: "default" };
  }
  if (themeId === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return { isDark: prefersDark, dataTheme: "default" };
  }
  if ((DARK_PALETTE_THEMES as string[]).includes(themeId)) {
    return { isDark: true, dataTheme: themeId };
  }
  // "dark" or any unknown → dark default
  return { isDark: true, dataTheme: "default" };
}

function applyThemeToDOM(themeId: ThemeId): void {
  const { isDark, dataTheme } = resolveThemeClasses(themeId);
  document.documentElement.classList.toggle("light", !isDark);
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.setAttribute("data-theme", dataTheme);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  localStorage.setItem("cb:theme", themeId);
}

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

      const resolvedTheme: ThemeId = theme && isValidTheme(theme) ? theme : "dark";
      applyThemeToDOM(resolvedTheme);

      set({
        theme: resolvedTheme,
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
        const themeId: ThemeId = isValidTheme(value) ? value : "dark";
        set({ theme: themeId });
        applyThemeToDOM(themeId);
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

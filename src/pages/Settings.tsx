import { useEffect } from "react";
import { Moon, Sun, Github, BookOpen, Monitor } from "lucide-react";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import { useSettingsStore } from "@/stores/settingsStore";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";

const THEME_OPTIONS = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
] as const;

const ADAPTER_OPTIONS = ["claude", "cursor", "copilot", "codex"] as const;

export function Settings() {
  const theme = useSettingsStore((s) => s.theme);
  const autoSync = useSettingsStore((s) => s.autoSync);
  const enabledAdapters = useSettingsStore((s) => s.enabledAdapters);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const updateSetting = useSettingsStore((s) => s.updateSetting);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const handleThemeChange = (value: string) => {
    void updateSetting("theme", value);
  };

  const handleAutoSyncToggle = (checked: boolean) => {
    void updateSetting("auto_sync", String(checked));
  };

  const handleAdapterToggle = (adapter: string, checked: boolean) => {
    const updated = checked
      ? [...enabledAdapters, adapter]
      : enabledAdapters.filter((a) => a !== adapter);
    void updateSetting("enabled_adapters", JSON.stringify(updated));
  };

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="border-b border-zinc-800/50 px-6 py-4">
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="mt-0.5 text-xs text-zinc-400">Configure ContextBridge preferences</p>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* Appearance */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h3 className="mb-3 text-sm font-semibold text-zinc-300">Appearance</h3>
          <Card>
            <label className="mb-2 block text-xs text-zinc-400">Theme</label>
            <div className="flex gap-2">
              {THEME_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleThemeChange(opt.value)}
                    className={clsx(
                      "relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200",
                    )}
                    aria-label={`Set theme to ${opt.label}`}
                  >
                    <Icon size={14} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Card>
        </motion.section>

        {/* Gradient divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

        {/* Sync Configuration */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="mb-3 text-sm font-semibold text-zinc-300">Sync Configuration</h3>
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-200">Auto-sync</p>
                <p className="text-xs text-zinc-500">
                  Automatically sync context when changes are detected
                </p>
              </div>
              <Toggle checked={autoSync} onChange={handleAutoSyncToggle} label="Auto-sync" />
            </div>

            <div className="border-t border-zinc-800/50 pt-4">
              <p className="mb-3 text-sm text-zinc-200">Enabled Adapters</p>
              <div className="grid grid-cols-2 gap-3">
                {ADAPTER_OPTIONS.map((adapter) => (
                  <label
                    key={adapter}
                    className="flex items-center gap-2.5 rounded-lg border border-zinc-800/50 bg-zinc-800/30 px-3 py-2 transition-colors hover:bg-zinc-800/50"
                  >
                    <input
                      type="checkbox"
                      checked={enabledAdapters.includes(adapter)}
                      onChange={(e) => handleAdapterToggle(adapter, e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-zinc-600 bg-zinc-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-950"
                    />
                    <span className="text-sm text-zinc-300 capitalize">{adapter}</span>
                  </label>
                ))}
              </div>
            </div>
          </Card>
        </motion.section>

        {/* Gradient divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

        {/* About */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="mb-3 text-sm font-semibold text-zinc-300">About</h3>
          <Card className="overflow-hidden">
            <div className="relative flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-indigo-600/30 to-indigo-500/10 p-2.5 ring-1 ring-indigo-500/20">
                <Monitor size={18} className="text-indigo-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-200">ContextBridge</h4>
                <p className="text-xs text-zinc-500">v0.1.0</p>
              </div>
            </div>
            <div className="relative mt-4 flex gap-3">
              <a
                href="https://github.com/senoldogann/contextbridge"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-400 transition-all hover:bg-zinc-800 hover:text-indigo-400"
              >
                <Github size={14} /> GitHub
              </a>
              <a
                href="https://github.com/senoldogann/contextbridge/blob/main/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-400 transition-all hover:bg-zinc-800 hover:text-indigo-400"
              >
                <BookOpen size={14} /> Documentation
              </a>
            </div>
          </Card>
        </motion.section>
      </div>
    </main>
  );
}

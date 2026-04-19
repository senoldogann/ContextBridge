import { useEffect } from "react";
import { Moon, Sun, Github, BookOpen, Monitor } from "lucide-react";
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
    <main className="theme-transition flex flex-1 flex-col overflow-hidden">
      <header className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Settings
        </h2>
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
          Configure ContextBridge preferences
        </p>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* Appearance */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            Appearance
          </h3>
          <Card>
            <label className="mb-2 block text-xs" style={{ color: "var(--text-muted)" }}>
              Theme
            </label>
            <div className="flex gap-2">
              {THEME_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleThemeChange(opt.value)}
                    className="relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150"
                    style={
                      isActive
                        ? {
                            background: "var(--primary)",
                            color: "#ffffff",
                            boxShadow: "0 2px 8px var(--primary-ring)",
                          }
                        : {
                            background: "var(--bg-hover)",
                            color: "var(--text-muted)",
                            border: "1px solid var(--border)",
                          }
                    }
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

        {/* Divider */}
        <div className="h-px" style={{ background: "var(--border)" }} />

        {/* Sync Configuration */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            Sync Configuration
          </h3>
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  Auto-sync
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Automatically sync context when changes are detected
                </p>
              </div>
              <Toggle checked={autoSync} onChange={handleAutoSyncToggle} label="Auto-sync" />
            </div>

            <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="mb-3 text-sm" style={{ color: "var(--text-primary)" }}>
                Enabled Adapters
              </p>
              <div className="grid grid-cols-2 gap-3">
                {ADAPTER_OPTIONS.map((adapter) => (
                  <label
                    key={adapter}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 transition-colors"
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--bg-input)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={enabledAdapters.includes(adapter)}
                      onChange={(e) => handleAdapterToggle(adapter, e.target.checked)}
                      className="h-3.5 w-3.5 rounded accent-emerald-500"
                    />
                    <span className="text-sm capitalize" style={{ color: "var(--text-secondary)" }}>
                      {adapter}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </Card>
        </motion.section>

        {/* Divider */}
        <div className="h-px" style={{ background: "var(--border)" }} />

        {/* About */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
            About
          </h3>
          <Card className="overflow-hidden">
            <div className="relative flex items-center gap-3">
              <div
                className="rounded-lg p-2.5"
                style={{
                  background: "var(--primary-muted)",
                  boxShadow: `inset 0 0 0 1px var(--primary-ring)`,
                }}
              >
                <Monitor size={18} style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  ContextBridge
                </h4>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  v0.1.0
                </p>
              </div>
            </div>
            <div className="relative mt-4 flex gap-3">
              <a
                href="https://github.com/senoldogann/contextbridge"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-all"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                  (e.currentTarget as HTMLElement).style.color = "var(--primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                }}
              >
                <Github size={14} /> GitHub
              </a>
              <a
                href="https://github.com/senoldogann/contextbridge/blob/main/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-all"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                  (e.currentTarget as HTMLElement).style.color = "var(--primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                }}
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

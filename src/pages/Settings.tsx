import { useEffect, useState } from "react";
import { Github, BookOpen, Monitor, ChevronDown } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { motion } from "framer-motion";
import { useSettingsStore } from "@/stores/settingsStore";
import { Card } from "@/components/ui/Card";
import { ToolLogo } from "@/components/ui/ToolLogo";
import { Toggle } from "@/components/ui/Toggle";
import type { ThemeId } from "@/types";

interface ThemeOption {
  value: ThemeId;
  label: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
  { value: "zinc", label: "Zinc" },
  { value: "midnight", label: "Midnight" },
  { value: "claude", label: "Claude" },
  { value: "ghostty", label: "Ghostty" },
];

function ThemePicker({
  value,
  onChange,
}: {
  value: ThemeId;
  onChange: (themeId: ThemeId) => void;
}) {
  return (
    <div className="relative min-w-[168px]">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as ThemeId)}
        className="w-full appearance-none rounded-lg px-3 py-2 pr-8 text-sm font-medium"
        style={{
          background: "var(--bg-hover)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
        }}
        aria-label="Select theme"
      >
        {THEME_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2"
        style={{ color: "var(--text-muted)" }}
      />
    </div>
  );
}

const ADAPTER_OPTIONS = ["claude", "cursor", "copilot", "codex"] as const;

const ADAPTER_LABELS: Record<(typeof ADAPTER_OPTIONS)[number], string> = {
  claude: "Claude",
  cursor: "Cursor",
  copilot: "Copilot",
  codex: "Codex",
};

export function Settings() {
  const theme = useSettingsStore((s) => s.theme);
  const autoSync = useSettingsStore((s) => s.autoSync);
  const enabledAdapters = useSettingsStore((s) => s.enabledAdapters);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const [version, setVersion] = useState("");

  useEffect(() => {
    let isMounted = true;

    void loadSettings();

    void getVersion()
      .then((value) => {
        if (isMounted) {
          setVersion(value);
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to load app version", { error });
      });

    return () => {
      isMounted = false;
    };
  }, [loadSettings]);

  const handleThemeChange = (themeId: ThemeId) => {
    void updateSetting("theme", themeId);
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
    <main className="theme-transition flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Settings
        </h2>
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
          Configure Context Bridge preferences
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col space-y-6 overflow-y-auto p-6">
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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <label
                  className="block text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Theme
                </label>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  Choose a color palette or follow system preference
                </p>
              </div>
              <ThemePicker value={theme} onChange={handleThemeChange} />
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
                  Automatically refresh project context and sync enabled adapters when changes are
                  detected
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
                      style={{ accentColor: "var(--primary)" }}
                    />
                    <span
                      className="flex items-center gap-2 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <ToolLogo tool={adapter} size={13} />
                      {ADAPTER_LABELS[adapter]}
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
                  Context Bridge
                </h4>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {version ? `v${version}` : ""}
                </p>
              </div>
            </div>
            <div className="relative mt-4 flex gap-3">
              <a
                href="https://github.com/senoldogann/contextbridge"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-all"
                style={{ background: "transparent", color: "var(--text-muted)" }}
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
                style={{ background: "transparent", color: "var(--text-muted)" }}
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

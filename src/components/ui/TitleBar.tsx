import { getCurrentWindow } from "@tauri-apps/api/window";
import { Moon, Sun } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { BridgeIcon } from "@/components/ui/BridgeIcon";

export function TitleBar() {
  const win = getCurrentWindow();
  const theme = useSettingsStore((s) => s.theme);
  const updateSetting = useSettingsStore((s) => s.updateSetting);

  const toggleTheme = () => {
    void updateSetting("theme", theme === "dark" ? "light" : "dark");
  };

  return (
    <div
      data-tauri-drag-region
      className="theme-transition flex h-9 shrink-0 items-center justify-between px-3"
      style={
        {
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border)",
          WebkitAppRegion: "drag",
        } as React.CSSProperties
      }
    >
      {/* Traffic lights */}
      <div
        className="flex items-center gap-1.5"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={() => win.close()}
          className="group flex h-3 w-3 items-center justify-center rounded-full bg-red-500 transition-colors hover:bg-red-400"
        />
        <button
          type="button"
          aria-label="Minimize"
          onClick={() => win.minimize()}
          className="h-3 w-3 rounded-full bg-yellow-500 transition-colors hover:bg-yellow-400"
        />
        <button
          type="button"
          aria-label="Maximize"
          onClick={() => win.toggleMaximize()}
          className="h-3 w-3 rounded-full bg-green-500 transition-colors hover:bg-green-400"
        />
      </div>

      {/* Center logo */}
      <div
        className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5 select-none"
        data-tauri-drag-region
      >
        <BridgeIcon className="h-4 w-4 text-indigo-400" />
        <span
          className="text-xs font-semibold tracking-wide"
          style={{ color: "var(--text-muted)" }}
        >
          ContextBridge
        </span>
      </div>

      {/* Theme toggle */}
      <div style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <button
          type="button"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          onClick={toggleTheme}
          className="flex h-6 w-6 items-center justify-center rounded-md transition-all"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
          }}
        >
          {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
        </button>
      </div>
    </div>
  );
}

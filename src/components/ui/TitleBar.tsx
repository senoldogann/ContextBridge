import { getCurrentWindow } from "@tauri-apps/api/window";
import { Moon, Sun, PanelLeftClose, PanelLeft, HelpCircle } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore } from "@/stores/uiStore";
import { BridgeIcon } from "@/components/ui/BridgeIcon";

interface TitleBarProps {
  onShowGuide: () => void;
}

export function TitleBar({ onShowGuide }: TitleBarProps) {
  const win = getCurrentWindow();
  const theme = useSettingsStore((s) => s.theme);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const toggleTheme = () => {
    void updateSetting("theme", theme === "dark" ? "light" : "dark");
  };

  const noDrag = { WebkitAppRegion: "no-drag" } as React.CSSProperties;

  return (
    <div
      data-tauri-drag-region
      className="theme-transition flex h-10 shrink-0 items-center justify-between px-3"
      style={
        {
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border)",
          WebkitAppRegion: "drag",
        } as React.CSSProperties
      }
    >
      {/* Left: traffic lights + sidebar toggle */}
      <div className="flex items-center gap-2" style={noDrag}>
        {/* macOS traffic lights */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Close"
            onClick={() => win.close()}
            className="flex h-3 w-3 items-center justify-center rounded-full bg-[#ff5f57] transition-opacity hover:opacity-80"
          />
          <button
            type="button"
            aria-label="Minimize"
            onClick={() => win.minimize()}
            className="h-3 w-3 rounded-full bg-[#febc2e] transition-opacity hover:opacity-80"
          />
          <button
            type="button"
            aria-label="Maximize"
            onClick={() => win.toggleMaximize()}
            className="h-3 w-3 rounded-full bg-[#28c840] transition-opacity hover:opacity-80"
          />
        </div>

        {/* Sidebar toggle */}
        <button
          type="button"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          onClick={toggleSidebar}
          className="ml-1 flex h-6 w-6 items-center justify-center rounded-md transition-all"
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
          {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeft size={14} />}
        </button>
      </div>

      {/* Center: logo */}
      <div
        className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5 select-none"
        data-tauri-drag-region
      >
        <BridgeIcon className="h-5 w-5" gradient />
        <span
          className="text-xs font-semibold tracking-wide"
          style={{ color: "var(--text-muted)" }}
        >
          ContextBridge
        </span>
      </div>

      {/* Right: help + theme toggle */}
      <div className="flex items-center gap-1" style={noDrag}>
        <button
          type="button"
          aria-label="Usage guide"
          onClick={onShowGuide}
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
          <HelpCircle size={14} />
        </button>

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
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </div>
  );
}

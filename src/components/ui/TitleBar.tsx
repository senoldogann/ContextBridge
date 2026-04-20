import type { MouseEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Moon, Sun, PanelLeftClose, PanelLeft, HelpCircle } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore } from "@/stores/uiStore";
import { BridgeIcon } from "@/components/ui/BridgeIcon";

interface TitleBarProps {
  onShowGuide: () => void;
}

function isWindowControlTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest("[data-window-control]") !== null;
}

function logWindowActionError(action: string, error: unknown): void {
  console.error("Window action failed", { action, error });
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

  const handleClose = (): void => {
    void win.close().catch((error: unknown) => {
      logWindowActionError("close", error);
    });
  };

  const handleMinimize = (): void => {
    void win.minimize().catch((error: unknown) => {
      logWindowActionError("minimize", error);
    });
  };

  const handleToggleMaximize = (): void => {
    void win.toggleMaximize().catch((error: unknown) => {
      logWindowActionError("toggle-maximize", error);
    });
  };

  const handleTitleBarMouseDown = (event: MouseEvent<HTMLDivElement>): void => {
    if (event.button !== 0 || isWindowControlTarget(event.target)) {
      return;
    }

    void win.startDragging().catch((error: unknown) => {
      logWindowActionError("start-dragging", error);
    });
  };

  return (
    <div
      className="theme-transition relative flex h-10 shrink-0 items-center justify-between px-3 select-none"
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
      }}
      onMouseDown={handleTitleBarMouseDown}
    >
      {/* Left: traffic lights + sidebar toggle */}
      <div className="relative z-10 flex items-center gap-2" data-window-control>
        {/* macOS traffic lights */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Close"
            data-window-control
            onClick={handleClose}
            className="flex h-3 w-3 items-center justify-center rounded-full bg-[#ff5f57] transition-opacity hover:opacity-80"
          />
          <button
            type="button"
            aria-label="Minimize"
            data-window-control
            onClick={handleMinimize}
            className="h-3 w-3 rounded-full bg-[#febc2e] transition-opacity hover:opacity-80"
          />
          <button
            type="button"
            aria-label="Maximize"
            data-window-control
            onClick={handleToggleMaximize}
            className="h-3 w-3 rounded-full bg-[#28c840] transition-opacity hover:opacity-80"
          />
        </div>

        {/* Sidebar toggle */}
        <button
          type="button"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          data-window-control
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
      <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5">
        <BridgeIcon className="h-5 w-5" gradient />
        <span
          className="text-xs font-semibold tracking-wide"
          style={{ color: "var(--text-muted)" }}
        >
          Context Bridge
        </span>
      </div>

      {/* Right: help + theme toggle */}
      <div className="relative z-10 flex items-center gap-1" data-window-control>
        <button
          type="button"
          aria-label="Usage guide"
          data-window-control
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
          data-window-control
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

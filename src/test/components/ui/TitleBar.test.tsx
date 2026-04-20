import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TitleBar } from "@/components/ui/TitleBar";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUIStore } from "@/stores/uiStore";

const windowMocks = vi.hoisted(() => ({
  close: vi.fn().mockResolvedValue(undefined),
  minimize: vi.fn().mockResolvedValue(undefined),
  toggleMaximize: vi.fn().mockResolvedValue(undefined),
  startDragging: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    close: windowMocks.close,
    minimize: windowMocks.minimize,
    toggleMaximize: windowMocks.toggleMaximize,
    startDragging: windowMocks.startDragging,
  }),
}));

describe("TitleBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useSettingsStore.setState({
      theme: "dark",
      autoSync: true,
      enabledAdapters: ["claude", "cursor", "copilot", "codex"],
      loadSettings: vi.fn().mockResolvedValue(undefined),
      updateSetting: vi.fn().mockResolvedValue(undefined),
    });

    useUIStore.setState({
      sidebarOpen: true,
      toggleSidebar: vi.fn(),
      setSidebarOpen: vi.fn(),
    });
  });

  it("calls the native window controls", () => {
    render(<TitleBar onShowGuide={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Minimize" }));
    fireEvent.click(screen.getByRole("button", { name: "Maximize" }));

    expect(windowMocks.close).toHaveBeenCalledTimes(1);
    expect(windowMocks.minimize).toHaveBeenCalledTimes(1);
    expect(windowMocks.toggleMaximize).toHaveBeenCalledTimes(1);
    expect(windowMocks.startDragging).not.toHaveBeenCalled();
  });

  it("starts dragging when the non-interactive title area is pressed", () => {
    render(<TitleBar onShowGuide={vi.fn()} />);

    fireEvent.mouseDown(screen.getByText("Context Bridge"), { button: 0 });

    expect(windowMocks.startDragging).toHaveBeenCalledTimes(1);
  });
});

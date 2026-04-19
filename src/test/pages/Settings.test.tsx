import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Settings } from "@/pages/Settings";
import { useSettingsStore } from "@/stores/settingsStore";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockedInvoke = vi.mocked(invoke);

describe("Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsStore.setState({
      theme: "dark",
      autoSync: true,
      enabledAdapters: ["claude", "cursor", "copilot", "codex"],
    });
    // Mock loadSettings IPC calls (getSetting x3)
    mockedInvoke.mockResolvedValue(null);
  });

  it("renders the Settings heading", async () => {
    render(<Settings />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders theme options (Dark and Light)", async () => {
    render(<Settings />);
    expect(screen.getByLabelText("Set theme to Dark")).toBeInTheDocument();
    expect(screen.getByLabelText("Set theme to Light")).toBeInTheDocument();
  });

  it("renders adapter checkboxes", async () => {
    render(<Settings />);
    expect(screen.getByText("claude")).toBeInTheDocument();
    expect(screen.getByText("cursor")).toBeInTheDocument();
    expect(screen.getByText("copilot")).toBeInTheDocument();
    expect(screen.getByText("codex")).toBeInTheDocument();
  });

  it("adapter checkboxes are checked for enabled adapters", async () => {
    render(<Settings />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(4);
    checkboxes.forEach((cb) => {
      expect(cb).toBeChecked();
    });
  });

  it("renders auto-sync toggle", async () => {
    render(<Settings />);
    const toggle = screen.getByRole("switch", { name: "Auto-sync" });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("clicking theme button calls updateSetting", async () => {
    render(<Settings />);
    fireEvent.click(screen.getByLabelText("Set theme to Light"));

    await waitFor(() => {
      expect(mockedInvoke).toHaveBeenCalledWith("set_setting", {
        key: "theme",
        value: "light",
      });
    });
  });

  it("toggling auto-sync calls updateSetting", async () => {
    render(<Settings />);
    const toggle = screen.getByRole("switch", { name: "Auto-sync" });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(mockedInvoke).toHaveBeenCalledWith("set_setting", {
        key: "auto_sync",
        value: "false",
      });
    });
  });

  it("unchecking an adapter calls updateSetting with updated list", async () => {
    render(<Settings />);
    const checkboxes = screen.getAllByRole("checkbox");
    const firstCheckbox = checkboxes[0];
    if (!firstCheckbox) throw new Error("No checkbox found");
    fireEvent.click(firstCheckbox);

    await waitFor(() => {
      expect(mockedInvoke).toHaveBeenCalledWith("set_setting", {
        key: "enabled_adapters",
        value: JSON.stringify(["cursor", "copilot", "codex"]),
      });
    });
  });

  it("renders About section with version", async () => {
    render(<Settings />);
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("ContextBridge")).toBeInTheDocument();
  });
});

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Settings } from "@/pages/Settings";
import { useSettingsStore } from "@/stores/settingsStore";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: vi.fn().mockResolvedValue("0.1.0"),
}));

const mockedInvoke = vi.mocked(invoke);

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};

async function renderSettings() {
  const result = render(<Settings />);

  await act(async () => {
    await Promise.resolve();
  });

  return result;
}

describe("Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", localStorageMock);
    useSettingsStore.setState({
      theme: "dark",
      autoSync: true,
      enabledAdapters: ["claude", "cursor", "copilot", "codex"],
    });
    // Mock loadSettings IPC calls (getSetting x3)
    mockedInvoke.mockResolvedValue(null);
  });

  it("renders the Settings heading", async () => {
    await renderSettings();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders theme picker with current selection", async () => {
    await renderSettings();
    const select = screen.getByLabelText("Select theme");
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue("dark");
  });

  it("renders adapter checkboxes", async () => {
    await renderSettings();
    expect(screen.getByRole("checkbox", { name: /Claude/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Cursor/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Copilot/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Codex/ })).toBeInTheDocument();
  });

  it("adapter checkboxes are checked for enabled adapters", async () => {
    await renderSettings();
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(4);
    checkboxes.forEach((cb) => {
      expect(cb).toBeChecked();
    });
  });

  it("renders auto-sync toggle", async () => {
    await renderSettings();
    const toggle = screen.getByRole("switch", { name: "Auto-sync" });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("selecting a theme from dropdown calls updateSetting", async () => {
    await renderSettings();
    const themeSelect = screen.getByLabelText("Select theme");
    fireEvent.change(themeSelect, { target: { value: "light" } });

    await waitFor(() => {
      expect(mockedInvoke).toHaveBeenCalledWith("set_setting", {
        key: "theme",
        value: "light",
      });
    });
  });

  it("toggling auto-sync calls updateSetting", async () => {
    await renderSettings();
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
    await renderSettings();
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
    await renderSettings();
    expect(await screen.findByText("v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("Context Bridge")).toBeInTheDocument();
  });
});

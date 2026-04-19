import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { App } from "../App";
import { useNavigationStore } from "@/stores/navigationStore";
import { useProjectStore } from "@/stores/projectStore";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-updater", () => ({
  check: vi.fn().mockResolvedValue(null),
}));

vi.mock("@tauri-apps/plugin-process", () => ({
  relaunch: vi.fn(),
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNavigationStore.setState({ currentView: "dashboard" });
    useProjectStore.setState({
      projects: [],
      selectedProject: null,
      isLoading: false,
      error: null,
      contextMap: {},
    });
  });

  it("renders without crashing", () => {
    render(<App />);
    expect(screen.getByText("ContextBridge")).toBeInTheDocument();
  });

  it("shows dashboard by default", () => {
    render(<App />);
    const matches = screen.getAllByText("No projects yet");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("shows sidebar with navigation buttons", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  });

  it("shows sidebar with add project button", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "Add project" })).toBeInTheDocument();
  });

  it("does not show error banner when there is no error", () => {
    render(<App />);
    expect(screen.queryByText("Dismiss")).not.toBeInTheDocument();
  });

  it("shows error banner when there is an error", async () => {
    render(<App />);
    // Set the error after render so loadProjects' error:null reset has already happened
    await waitFor(() => {
      useProjectStore.setState({ error: "Something went wrong" });
    });
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Dismiss")).toBeInTheDocument();
  });
});

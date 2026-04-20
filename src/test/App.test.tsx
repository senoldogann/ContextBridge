import { act, render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { App } from "../App";
import { useNavigationStore } from "@/stores/navigationStore";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";

const localStorageMock = vi.hoisted(() => ({
  getItem: vi.fn((key: string) => {
    if (key === "cb:onboarding-done") {
      return "true";
    }

    if (key === "cb:theme") {
      return "dark";
    }

    return null;
  }),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
}));

const eventMocks = vi.hoisted(() => ({
  callback: null as ((event: { payload: { project_id: string } }) => unknown) | null,
  unlisten: vi.fn(),
}));

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

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    close: vi.fn().mockResolvedValue(undefined),
    minimize: vi.fn().mockResolvedValue(undefined),
    toggleMaximize: vi.fn().mockResolvedValue(undefined),
    startDragging: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(
    async (
      _eventName: string,
      callback: (event: { payload: { project_id: string } }) => unknown,
    ) => {
      eventMocks.callback = callback;
      return eventMocks.unlisten;
    },
  ),
}));

vi.mock("@/components/ui/SplashScreen", async () => {
  const React = await import("react");

  return {
    SplashScreen: ({ onComplete }: { onComplete: () => void }) => {
      React.useEffect(() => {
        onComplete();
      }, [onComplete]);

      return null;
    },
  };
});

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("localStorage", localStorageMock);
    const refreshProject = vi.fn().mockResolvedValue(undefined);

    useNavigationStore.setState({ currentView: "dashboard" });
    useProjectStore.setState({
      projects: [],
      selectedProject: null,
      isLoading: false,
      isAddingProject: false,
      error: null,
      contextMap: {},
      loadProjects: vi.fn().mockResolvedValue(undefined),
      selectProject: vi.fn(),
      addProject: vi.fn().mockResolvedValue(undefined),
      removeProject: vi.fn().mockResolvedValue(undefined),
      loadContext: vi.fn().mockResolvedValue(undefined),
      syncTarget: vi.fn(),
      syncAll: vi.fn(),
      refreshProject,
      addNote: vi.fn().mockResolvedValue(undefined),
      deleteNote: vi.fn().mockResolvedValue(undefined),
    });
    useSettingsStore.setState({
      theme: "dark",
      autoSync: true,
      enabledAdapters: ["claude", "cursor", "copilot", "codex"],
      loadSettings: vi.fn().mockResolvedValue(undefined),
      updateSetting: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("renders without crashing", () => {
    render(<App />);
    expect(screen.getAllByText("Context Bridge").length).toBeGreaterThan(0);
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
    act(() => {
      useProjectStore.setState({ error: "Something went wrong" });
    });
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Dismiss")).toBeInTheDocument();
  });

  it("refreshes the changed project when auto-sync is enabled", async () => {
    const refreshProject = vi.fn().mockResolvedValue(undefined);
    useProjectStore.setState({ refreshProject });

    render(<App />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(eventMocks.callback).not.toBeNull();

    vi.useFakeTimers();

    await act(async () => {
      await eventMocks.callback?.({
        payload: {
          project_id: "p1",
        },
      });
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(refreshProject).toHaveBeenCalledWith("p1");
    vi.useRealTimers();
  });

  it("ignores watcher events when auto-sync is disabled", async () => {
    const refreshProject = vi.fn().mockResolvedValue(undefined);
    useProjectStore.setState({ refreshProject });
    useSettingsStore.setState({ autoSync: false });

    render(<App />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(eventMocks.callback).not.toBeNull();

    vi.useFakeTimers();

    await act(async () => {
      await eventMocks.callback?.({
        payload: {
          project_id: "p1",
        },
      });
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(refreshProject).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("queues another refresh when new file changes arrive during an in-flight refresh", async () => {
    let resolveRefresh: (() => void) | null = null;
    const refreshProject = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    useProjectStore.setState({ refreshProject });

    render(<App />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(eventMocks.callback).not.toBeNull();

    vi.useFakeTimers();

    await act(async () => {
      await eventMocks.callback?.({
        payload: {
          project_id: "p1",
        },
      });
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(refreshProject).toHaveBeenCalledTimes(1);

    await act(async () => {
      await eventMocks.callback?.({
        payload: {
          project_id: "p1",
        },
      });
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(refreshProject).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRefresh?.();
      await Promise.resolve();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(refreshProject).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveRefresh?.();
      await Promise.resolve();
    });
    vi.useRealTimers();
  });

  it("limits watcher refreshes to two concurrent projects", async () => {
    const resolvers = new Map<string, () => void>();
    const refreshProject = vi.fn().mockImplementation(
      (projectId: string) =>
        new Promise<void>((resolve) => {
          resolvers.set(projectId, resolve);
        }),
    );
    useProjectStore.setState({ refreshProject });

    render(<App />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(eventMocks.callback).not.toBeNull();

    vi.useFakeTimers();

    await act(async () => {
      await eventMocks.callback?.({ payload: { project_id: "p1" } });
      await eventMocks.callback?.({ payload: { project_id: "p2" } });
      await eventMocks.callback?.({ payload: { project_id: "p3" } });
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(refreshProject).toHaveBeenCalledTimes(2);
    expect(refreshProject).toHaveBeenNthCalledWith(1, "p1");
    expect(refreshProject).toHaveBeenNthCalledWith(2, "p2");

    await act(async () => {
      resolvers.get("p1")?.();
      await Promise.resolve();
    });

    expect(refreshProject).toHaveBeenCalledTimes(3);
    expect(refreshProject).toHaveBeenLastCalledWith("p3");

    await act(async () => {
      resolvers.get("p2")?.();
      resolvers.get("p3")?.();
      await Promise.resolve();
    });
    vi.useRealTimers();
  });
});

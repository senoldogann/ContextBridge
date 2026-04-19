import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Dashboard } from "@/pages/Dashboard";
import { useProjectStore } from "@/stores/projectStore";
import type { Project } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

const mockedInvoke = vi.mocked(invoke);
const mockedOpen = vi.mocked(open);

const fakeProjects: Project[] = [
  {
    id: "p1",
    name: "Alpha",
    root_path: "/home/user/alpha",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-06-15T00:00:00Z",
  },
  {
    id: "p2",
    name: "Beta",
    root_path: "/home/user/beta",
    created_at: "2024-02-01T00:00:00Z",
    updated_at: "2024-06-20T00:00:00Z",
  },
];

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProjectStore.setState({
      projects: [],
      selectedProject: null,
      isLoading: false,
      error: null,
      contextMap: {},
    });
  });

  it("shows EmptyState when no projects exist", async () => {
    mockedInvoke.mockResolvedValueOnce([]);
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("No projects yet")).toBeInTheDocument();
    });
  });

  it("shows project cards when projects exist", async () => {
    mockedInvoke.mockResolvedValueOnce(fakeProjects);
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
      expect(screen.getByText("Beta")).toBeInTheDocument();
    });
  });

  it("shows project count in header", async () => {
    mockedInvoke.mockResolvedValueOnce(fakeProjects);
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("2 projects registered")).toBeInTheDocument();
    });
  });

  it("shows 'Add Project' card button", async () => {
    mockedInvoke.mockResolvedValueOnce(fakeProjects);
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByLabelText("Add new project")).toBeInTheDocument();
    });
  });

  it("add project button calls dialog and adds project", async () => {
    // Start with existing projects so the add button card is visible
    useProjectStore.setState({ projects: fakeProjects });
    mockedInvoke.mockResolvedValueOnce([]); // loadProjects call from useEffect
    mockedOpen.mockResolvedValueOnce("/home/user/gamma");
    mockedInvoke.mockResolvedValueOnce({
      id: "p3",
      name: "gamma",
      root_path: "/home/user/gamma",
      created_at: "2024-03-01T00:00:00Z",
      updated_at: "2024-03-01T00:00:00Z",
    });

    render(<Dashboard />);

    const addBtn = screen.getByLabelText("Add new project");
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(mockedOpen).toHaveBeenCalledWith({
        directory: true,
        title: "Select Project Folder",
      });
    });
  });

  it("shows EmptyState 'Add Project' button when no projects", async () => {
    mockedInvoke.mockResolvedValueOnce([]);
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add your first project" })).toBeInTheDocument();
    });
  });
});

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { open } from "@tauri-apps/plugin-dialog";
import { useAddProject } from "@/hooks/useAddProject";
import { useNavigationStore } from "@/stores/navigationStore";
import { useProjectStore } from "@/stores/projectStore";

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

const mockedOpen = vi.mocked(open);

describe("useAddProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useNavigationStore.setState({
      currentView: "dashboard",
      navigate: vi.fn(),
    });

    useProjectStore.setState({
      isAddingProject: false,
      addProject: vi.fn(),
    });
  });

  it("navigates to the project view after a successful add", async () => {
    const navigate = vi.fn();
    const addProject = vi.fn().mockResolvedValue({ id: "p1" });

    useNavigationStore.setState({ navigate });
    useProjectStore.setState({ addProject });
    mockedOpen.mockResolvedValueOnce("/Users/test/project-alpha");

    const { result } = renderHook(() => useAddProject());

    await act(async () => {
      await result.current();
    });

    expect(addProject).toHaveBeenCalledWith("project-alpha", "/Users/test/project-alpha");
    expect(navigate).toHaveBeenCalledWith("project");
  });

  it("does not navigate when project creation fails", async () => {
    const navigate = vi.fn();
    const addProject = vi.fn().mockResolvedValue(null);

    useNavigationStore.setState({ navigate });
    useProjectStore.setState({ addProject });
    mockedOpen.mockResolvedValueOnce("/Users/test/project-beta");

    const { result } = renderHook(() => useAddProject());

    await act(async () => {
      await result.current();
    });

    expect(addProject).toHaveBeenCalledWith("project-beta", "/Users/test/project-beta");
    expect(navigate).not.toHaveBeenCalled();
  });
});

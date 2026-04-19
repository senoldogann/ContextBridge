import { describe, it, expect, beforeEach, vi } from "vitest";
import { useProjectStore } from "@/stores/projectStore";
import type { Project, ProjectContext } from "@/types";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockedInvoke = vi.mocked(invoke);

const fakeProject: Project = {
  id: "p1",
  name: "Test Project",
  root_path: "/home/user/test",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const fakeProject2: Project = {
  id: "p2",
  name: "Second Project",
  root_path: "/home/user/second",
  created_at: "2024-01-02T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
};

const fakeContext: ProjectContext = {
  project: fakeProject,
  tech_stack: [],
  notes: [],
  recent_changes: [],
  sync_state: [],
};

describe("projectStore", () => {
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

  describe("loadProjects", () => {
    it("populates the projects array", async () => {
      mockedInvoke.mockResolvedValueOnce([fakeProject, fakeProject2]);

      await useProjectStore.getState().loadProjects();

      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(2);
      expect(state.projects[0]?.id).toBe("p1");
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("sets isLoading during the call", async () => {
      let loadingDuringCall = false;
      mockedInvoke.mockImplementationOnce(() => {
        loadingDuringCall = useProjectStore.getState().isLoading;
        return Promise.resolve([]);
      });

      await useProjectStore.getState().loadProjects();
      expect(loadingDuringCall).toBe(true);
      expect(useProjectStore.getState().isLoading).toBe(false);
    });
  });

  describe("selectProject", () => {
    it("sets selectedProject when id matches", () => {
      useProjectStore.setState({ projects: [fakeProject, fakeProject2] });

      useProjectStore.getState().selectProject("p2");

      expect(useProjectStore.getState().selectedProject?.id).toBe("p2");
    });

    it("sets selectedProject to null when id does not match", () => {
      useProjectStore.setState({ projects: [fakeProject] });

      useProjectStore.getState().selectProject("nonexistent");

      expect(useProjectStore.getState().selectedProject).toBeNull();
    });
  });

  describe("addProject", () => {
    it("calls IPC and appends the new project", async () => {
      mockedInvoke.mockResolvedValueOnce(fakeProject);

      await useProjectStore.getState().addProject("Test Project", "/home/user/test");

      expect(mockedInvoke).toHaveBeenCalledWith("add_project", {
        name: "Test Project",
        rootPath: "/home/user/test",
      });
      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.selectedProject?.id).toBe("p1");
    });
  });

  describe("removeProject", () => {
    it("calls IPC and removes the project from the array", async () => {
      useProjectStore.setState({ projects: [fakeProject, fakeProject2] });
      mockedInvoke.mockResolvedValueOnce(undefined);

      await useProjectStore.getState().removeProject("p1");

      expect(mockedInvoke).toHaveBeenCalledWith("remove_project", { id: "p1" });
      expect(useProjectStore.getState().projects).toHaveLength(1);
      expect(useProjectStore.getState().projects[0]?.id).toBe("p2");
    });

    it("clears selectedProject if the removed project was selected", async () => {
      useProjectStore.setState({
        projects: [fakeProject],
        selectedProject: fakeProject,
      });
      mockedInvoke.mockResolvedValueOnce(undefined);

      await useProjectStore.getState().removeProject("p1");

      expect(useProjectStore.getState().selectedProject).toBeNull();
    });
  });

  describe("loadContext", () => {
    it("populates contextMap for the given project", async () => {
      mockedInvoke.mockResolvedValueOnce(fakeContext);

      await useProjectStore.getState().loadContext("p1");

      expect(useProjectStore.getState().contextMap["p1"]).toEqual(fakeContext);
    });
  });

  describe("error handling", () => {
    it("sets error state on loadProjects IPC failure", async () => {
      mockedInvoke.mockRejectedValueOnce(new Error("Network error"));

      await useProjectStore.getState().loadProjects();

      expect(useProjectStore.getState().error).toContain("Network error");
      expect(useProjectStore.getState().isLoading).toBe(false);
    });

    it("sets error state on addProject IPC failure", async () => {
      mockedInvoke.mockRejectedValueOnce(new Error("Permission denied"));

      await useProjectStore.getState().addProject("fail", "/fail");

      expect(useProjectStore.getState().error).toContain("Permission denied");
    });

    it("sets error state on removeProject IPC failure", async () => {
      useProjectStore.setState({ projects: [fakeProject] });
      mockedInvoke.mockRejectedValueOnce(new Error("DB error"));

      await useProjectStore.getState().removeProject("p1");

      expect(useProjectStore.getState().error).toContain("DB error");
      // Project should still be in the list since removal failed
      expect(useProjectStore.getState().projects).toHaveLength(1);
    });

    it("sets error state on loadContext IPC failure", async () => {
      mockedInvoke.mockRejectedValueOnce(new Error("Not found"));

      await useProjectStore.getState().loadContext("p1");

      expect(useProjectStore.getState().error).toContain("Not found");
    });
  });
});

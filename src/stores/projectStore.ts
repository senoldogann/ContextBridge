import { create } from "zustand";
import type { Project, ProjectContext, SyncResult } from "@/types";
import * as tauri from "@/lib/tauri";

interface ProjectState {
  projects: Project[];
  selectedProject: Project | null;
  isLoading: boolean;
  error: string | null;
  contextMap: Record<string, ProjectContext>;
  loadProjects: () => Promise<void>;
  selectProject: (id: string) => void;
  addProject: (name: string, path: string) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  loadContext: (projectId: string) => Promise<void>;
  syncTarget: (projectId: string, target: string) => Promise<SyncResult>;
  syncAll: (projectId: string) => Promise<SyncResult[]>;
  refreshProject: (projectId: string) => Promise<void>;
  addNote: (
    projectId: string,
    category: string,
    title: string,
    content: string,
    priority: number,
  ) => Promise<void>;
  deleteNote: (projectId: string, noteId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProject: null,
  isLoading: false,
  error: null,
  contextMap: {},

  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await tauri.listProjects();
      set({ projects, isLoading: false });
    } catch (err) {
      console.error("Failed to load projects:", err);
      set({ isLoading: false, error: String(err) });
    }
  },

  selectProject: (id: string) => {
    const project = get().projects.find((p) => p.id === id) ?? null;
    set({ selectedProject: project });
  },

  addProject: async (name: string, path: string) => {
    set({ error: null });
    try {
      const project = await tauri.addProject(name, path);
      set((state) => ({
        projects: [...state.projects, project],
        selectedProject: project,
      }));
    } catch (err) {
      console.error("Failed to add project:", err);
      set({ error: String(err) });
    }
  },

  removeProject: async (id: string) => {
    set({ error: null });
    try {
      await tauri.removeProject(id);
      set((state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: _removed, ...rest } = state.contextMap;
        return {
          projects: state.projects.filter((p) => p.id !== id),
          selectedProject: state.selectedProject?.id === id ? null : state.selectedProject,
          contextMap: rest,
        };
      });
    } catch (err) {
      console.error("Failed to remove project:", err);
      set({ error: String(err) });
    }
  },

  loadContext: async (projectId: string) => {
    try {
      const context = await tauri.getProjectContext(projectId);
      set((state) => ({
        contextMap: { ...state.contextMap, [projectId]: context },
      }));
    } catch (err) {
      console.error("Failed to load context:", err);
      set({ error: String(err) });
    }
  },

  syncTarget: async (projectId: string, target: string) => {
    try {
      const result = await tauri.syncToTool(projectId, target);
      void get().loadContext(projectId);
      return result;
    } catch (err) {
      set({ error: `Sync failed: ${String(err)}` });
      throw err;
    }
  },

  syncAll: async (projectId: string) => {
    try {
      const results = await tauri.syncAllTools(projectId);
      void get().loadContext(projectId);
      return results;
    } catch (err) {
      set({ error: `Sync failed: ${String(err)}` });
      throw err;
    }
  },

  refreshProject: async (projectId: string) => {
    try {
      await tauri.refreshProjectContext(projectId);
      await get().loadContext(projectId);
    } catch (err) {
      console.error("Failed to refresh project:", err);
      set({ error: String(err) });
    }
  },

  addNote: async (projectId, category, title, content, priority) => {
    try {
      await tauri.addNote(projectId, category, title, content, priority);
      await get().loadContext(projectId);
    } catch (err) {
      console.error("Failed to add note:", err);
      set({ error: String(err) });
    }
  },

  deleteNote: async (projectId, noteId) => {
    try {
      await tauri.deleteNote(projectId, noteId);
      await get().loadContext(projectId);
    } catch (err) {
      console.error("Failed to delete note:", err);
      set({ error: String(err) });
    }
  },
}));

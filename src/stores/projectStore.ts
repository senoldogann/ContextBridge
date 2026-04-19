import { create } from "zustand";
import type { Project } from "@/types";
import * as tauri from "@/lib/tauri";

interface ProjectState {
  projects: Project[];
  selectedProject: Project | null;
  isLoading: boolean;
  loadProjects: () => Promise<void>;
  selectProject: (id: string) => void;
  addProject: (name: string, path: string) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProject: null,
  isLoading: false,

  loadProjects: async () => {
    set({ isLoading: true });
    try {
      const projects = await tauri.listProjects();
      set({ projects, isLoading: false });
    } catch (err) {
      console.error("Failed to load projects:", err);
      set({ isLoading: false });
    }
  },

  selectProject: (id: string) => {
    const project = get().projects.find((p) => p.id === id) ?? null;
    set({ selectedProject: project });
  },

  addProject: async (name: string, path: string) => {
    try {
      const project = await tauri.addProject(name, path);
      set((state) => ({
        projects: [...state.projects, project],
        selectedProject: project,
      }));
    } catch (err) {
      console.error("Failed to add project:", err);
    }
  },

  removeProject: async (id: string) => {
    try {
      await tauri.removeProject(id);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        selectedProject: state.selectedProject?.id === id ? null : state.selectedProject,
      }));
    } catch (err) {
      console.error("Failed to remove project:", err);
    }
  },
}));

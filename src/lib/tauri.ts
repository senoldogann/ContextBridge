import { invoke } from "@tauri-apps/api/core";
import type { ContextNote, Project, ProjectContext } from "@/types";

/** List all registered projects. */
export async function listProjects(): Promise<Project[]> {
  return invoke<Project[]>("list_projects");
}

/** Register a new project by name and root path. */
export async function addProject(name: string, rootPath: string): Promise<Project> {
  return invoke<Project>("add_project", { name, rootPath });
}

/** Remove a project by ID. */
export async function removeProject(id: string): Promise<void> {
  return invoke<void>("remove_project", { id });
}

/** Get the full assembled context for a project. */
export async function getProjectContext(projectId: string): Promise<ProjectContext> {
  return invoke<ProjectContext>("get_project_context", { projectId });
}

/** Search context notes via full-text search. */
export async function searchContext(projectId: string, query: string): Promise<ContextNote[]> {
  return invoke<ContextNote[]>("search_context", { projectId, query });
}

/** Retrieve a setting value by key. */
export async function getSetting(key: string): Promise<string | null> {
  return invoke<string | null>("get_setting", { key });
}

/** Set a setting value by key. */
export async function setSetting(key: string, value: string): Promise<void> {
  return invoke<void>("set_setting", { key, value });
}

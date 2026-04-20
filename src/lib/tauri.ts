import { invoke } from "@tauri-apps/api/core";
import type {
  ContextNote,
  ContextRefreshResult,
  Project,
  ProjectContext,
  SyncResult,
} from "@/types";

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
  return invoke<undefined>("remove_project", { id });
}

/** Get the full assembled context for a project. */
export async function getProjectContext(projectId: string): Promise<ProjectContext> {
  return invoke<ProjectContext>("get_project_context", { projectId });
}

/** Trigger a full scan of a project directory and git repo. */
export async function scanProject(projectId: string): Promise<ContextRefreshResult> {
  return invoke<ContextRefreshResult>("scan_project", { projectId });
}

/** Refresh project context (full rescan). */
export async function refreshProjectContext(projectId: string): Promise<ContextRefreshResult> {
  return invoke<ContextRefreshResult>("refresh_project_context", { projectId });
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
  return invoke<undefined>("set_setting", { key, value });
}

/** Sync project context to a specific AI tool target. */
export async function syncToTool(projectId: string, target: string): Promise<SyncResult> {
  return invoke<SyncResult>("sync_to_tool", { projectId, target });
}

/** Sync project context to all enabled AI tool targets. */
export async function syncAllTools(projectId: string): Promise<SyncResult[]> {
  return invoke<SyncResult[]>("sync_all_tools", { projectId });
}

/** Add a context note to a project. */
export async function addNote(
  projectId: string,
  category: string,
  title: string,
  content: string,
  priority: number,
): Promise<ContextNote> {
  return invoke<ContextNote>("add_note", { projectId, category, title, content, priority });
}

/** Delete a context note by ID. */
export async function deleteNote(projectId: string, noteId: string): Promise<void> {
  return invoke<undefined>("delete_note", { projectId, noteId });
}

/** Update an existing context note. */
export async function updateNote(
  projectId: string,
  noteId: string,
  category: string,
  title: string,
  content: string,
  priority: number,
): Promise<ContextNote> {
  return invoke<ContextNote>("update_note", {
    projectId,
    noteId,
    category,
    title,
    content,
    priority,
  });
}

/** Partially refresh project context for specific changed file paths. */
export async function partialRefreshProject(
  projectId: string,
  changedPaths: string[],
): Promise<void> {
  return invoke<undefined>("partial_refresh_project", { projectId, changedPaths });
}

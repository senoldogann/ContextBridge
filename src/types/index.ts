/** A monitored project — mirrors the Rust `Project` struct. */
export interface Project {
  id: string;
  name: string;
  root_path: string;
  created_at: string;
  updated_at: string;
}

/** A single technology detected in a project. */
export interface TechEntry {
  id: number;
  project_id: string;
  category: string;
  name: string;
  version: string | null;
  confidence: number;
  source: string;
}

/** A user- or AI-generated context note attached to a project. */
export interface ContextNote {
  id: string;
  project_id: string;
  category: string;
  title: string;
  content: string;
  source: string;
  priority: number;
  created_at: string;
  updated_at: string;
}

/** A recently observed change (commit, file edit, etc.). */
export interface RecentChange {
  id: number;
  project_id: string;
  change_type: string;
  summary: string;
  files: string;
  author: string | null;
  timestamp: string;
  commit_hash: string | null;
}

/** Tracks the last sync of generated output for a project × target pair. */
export interface SyncState {
  id: number;
  project_id: string;
  target: string;
  output_path: string;
  content_hash: string;
  synced_at: string;
}

/** Fully assembled context for a project — the main data payload. */
export interface ProjectContext {
  project: Project;
  tech_stack: TechEntry[];
  notes: ContextNote[];
  recent_changes: RecentChange[];
  sync_state: SyncState[];
}

/** Application settings. */
export interface AppSettings {
  theme: "dark" | "light";
  autoSync: boolean;
  enabledAdapters: string[];
}

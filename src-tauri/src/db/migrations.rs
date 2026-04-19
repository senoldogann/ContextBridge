//! Database schema migrations.

use crate::errors::AppError;
use rusqlite::Connection;

/// Run all schema migrations against the given connection.
pub fn run_migrations(conn: &Connection) -> Result<(), AppError> {
    conn.execute_batch(MIGRATION_V1)
        .map_err(|e| AppError::Database(format!("migration failed: {e}")))?;
    Ok(())
}

const MIGRATION_V1: &str = r#"
-- projects table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    root_path TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- project_tech_stack
CREATE TABLE IF NOT EXISTS project_tech_stack (
    id INTEGER PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    version TEXT,
    confidence REAL NOT NULL DEFAULT 1.0,
    source TEXT NOT NULL,
    UNIQUE(project_id, category, name)
);

-- project_files
CREATE TABLE IF NOT EXISTS project_files (
    id INTEGER PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    rel_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    language TEXT,
    size_bytes INTEGER NOT NULL,
    content_hash TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(project_id, rel_path)
);

-- context_notes
CREATE TABLE IF NOT EXISTS context_notes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- recent_changes
CREATE TABLE IF NOT EXISTS recent_changes (
    id INTEGER PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    change_type TEXT NOT NULL,
    summary TEXT NOT NULL,
    files TEXT NOT NULL,
    author TEXT,
    timestamp TEXT NOT NULL,
    commit_hash TEXT
);

-- sync_state
CREATE TABLE IF NOT EXISTS sync_state (
    id INTEGER PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    target TEXT NOT NULL,
    output_path TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    synced_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(project_id, target)
);

-- settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- FTS5 for context notes
CREATE VIRTUAL TABLE IF NOT EXISTS context_fts USING fts5(
    project_id,
    content,
    category
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tech_stack_project ON project_tech_stack(project_id);
CREATE INDEX IF NOT EXISTS idx_files_project ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_notes_project_cat ON context_notes(project_id, category);
CREATE INDEX IF NOT EXISTS idx_changes_project_time ON recent_changes(project_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sync_project_target ON sync_state(project_id, target);
"#;

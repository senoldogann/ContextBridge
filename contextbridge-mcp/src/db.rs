//! Read-only database access for the MCP server.
//!
//! Opens the same SQLite database the main ContextBridge app uses and
//! provides query functions that mirror the app's read paths.

use anyhow::{Context, Result};
use contextbridge_core::*;
use rusqlite::{params, Connection, OpenFlags};

/// Open a read-only connection to the ContextBridge database.
///
/// The path is resolved from `CONTEXTBRIDGE_DB_PATH` env var, or falls back
/// to the platform-specific default location.
pub fn open_db() -> Result<Connection> {
    let path =
        std::env::var("CONTEXTBRIDGE_DB_PATH").unwrap_or_else(|_| default_db_path());

    let conn = Connection::open_with_flags(
        &path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_FULL_MUTEX,
    )
    .with_context(|| "failed to open ContextBridge database")?;

    Ok(conn)
}

/// List all registered projects, ordered by name.
pub fn list_projects(conn: &Connection) -> Result<Vec<Project>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, root_path, created_at, updated_at FROM projects ORDER BY name",
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            root_path: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })?;

    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(Into::into)
}

/// Get a single project by ID.
pub fn get_project(conn: &Connection, id: &str) -> Result<Project> {
    conn.query_row(
        "SELECT id, name, root_path, created_at, updated_at FROM projects WHERE id = ?1",
        params![id],
        |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                root_path: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    )
    .with_context(|| format!("project not found: {id}"))
}

/// Assemble the full [`ProjectContext`] for a given project.
pub fn assemble_context(conn: &Connection, project_id: &str) -> Result<ProjectContext> {
    let project = get_project(conn, project_id)?;

    let tech_stack = query_collect(conn,
        "SELECT id, project_id, category, name, version, confidence, source
         FROM project_tech_stack WHERE project_id = ?1 ORDER BY category, name",
        params![project_id],
        |row| Ok(TechEntry {
            id: row.get(0)?,
            project_id: row.get(1)?,
            category: row.get(2)?,
            name: row.get(3)?,
            version: row.get(4)?,
            confidence: row.get(5)?,
            source: row.get(6)?,
        }),
    )?;

    let notes = query_collect(conn,
        "SELECT id, project_id, category, title, content, source, priority, created_at, updated_at
         FROM context_notes WHERE project_id = ?1 ORDER BY priority DESC, updated_at DESC",
        params![project_id],
        map_note,
    )?;

    let recent_changes = query_collect(conn,
        "SELECT id, project_id, change_type, summary, files, author, timestamp, commit_hash
         FROM recent_changes WHERE project_id = ?1 ORDER BY timestamp DESC LIMIT 50",
        params![project_id],
        |row| Ok(RecentChange {
            id: row.get(0)?,
            project_id: row.get(1)?,
            change_type: row.get(2)?,
            summary: row.get(3)?,
            files: row.get(4)?,
            author: row.get(5)?,
            timestamp: row.get(6)?,
            commit_hash: row.get(7)?,
        }),
    )?;

    let sync_state = query_collect(conn,
        "SELECT id, project_id, target, output_path, content_hash, synced_at
         FROM sync_state WHERE project_id = ?1",
        params![project_id],
        |row| Ok(SyncState {
            id: row.get(0)?,
            project_id: row.get(1)?,
            target: row.get(2)?,
            output_path: row.get(3)?,
            content_hash: row.get(4)?,
            synced_at: row.get(5)?,
        }),
    )?;

    Ok(ProjectContext {
        project,
        tech_stack,
        notes,
        recent_changes,
        sync_state,
    })
}

/// Search context notes via FTS5 full-text search.
///
/// User input is sanitized to strip FTS5 special operators.
pub fn search_notes(
    conn: &Connection,
    project_id: &str,
    query: &str,
) -> Result<Vec<ContextNote>> {
    let sanitized: String = query
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '-' || *c == '_')
        .collect();

    // Strip leading/trailing hyphens from each word to prevent FTS5 NOT operator abuse
    let sanitized: String = sanitized
        .split_whitespace()
        .map(|w| w.trim_matches('-'))
        .filter(|w| !w.is_empty())
        .collect::<Vec<_>>()
        .join(" ");

    if sanitized.is_empty() {
        return Ok(Vec::new());
    }

    let fts_query = format!("\"{}\"", sanitized.replace('"', "\"\""));

    query_collect(conn,
        "SELECT cn.id, cn.project_id, cn.category, cn.title, cn.content, cn.source,
                cn.priority, cn.created_at, cn.updated_at
         FROM context_notes cn
         JOIN context_fts fts ON cn.id = fts.note_id
         WHERE context_fts MATCH ?1
           AND cn.project_id = ?2
         ORDER BY rank",
        params![fts_query, project_id],
        map_note,
    )
}

// ---- helpers ----------------------------------------------------------------

/// Helper: prepare → query_map → collect into Vec, avoiding lifetime issues.
fn query_collect<T, P, F>(
    conn: &Connection,
    sql: &str,
    params: P,
    f: F,
) -> Result<Vec<T>>
where
    P: rusqlite::Params,
    F: FnMut(&rusqlite::Row<'_>) -> rusqlite::Result<T>,
{
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map(params, f)?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row?);
    }
    Ok(out)
}

fn map_note(row: &rusqlite::Row) -> rusqlite::Result<ContextNote> {
    Ok(ContextNote {
        id: row.get(0)?,
        project_id: row.get(1)?,
        category: row.get(2)?,
        title: row.get(3)?,
        content: row.get(4)?,
        source: row.get(5)?,
        priority: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

/// Default database path — must match the main app (`~/.contextbridge/data.db`).
fn default_db_path() -> String {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
    #[cfg(not(target_os = "windows"))]
    {
        format!("{home}/.contextbridge/data.db")
    }
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| home);
        format!("{appdata}/.contextbridge/data.db")
    }
}

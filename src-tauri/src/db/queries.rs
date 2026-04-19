//! SQL query functions for all database operations.

use crate::db::models::*;
use crate::errors::AppError;
use rusqlite::{params, Connection};

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

/// Insert a new project.
pub fn insert_project(conn: &Connection, project: &Project) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO projects (id, name, root_path, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![project.id, project.name, project.root_path, project.created_at, project.updated_at],
    )?;
    Ok(())
}

/// Get a project by its ID.
pub fn get_project(conn: &Connection, id: &str) -> Result<Project, AppError> {
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
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => {
            AppError::NotFound(format!("project {id}"))
        }
        other => AppError::Database(other.to_string()),
    })
}

/// List all projects.
pub fn list_projects(conn: &Connection) -> Result<Vec<Project>, AppError> {
    let mut stmt =
        conn.prepare("SELECT id, name, root_path, created_at, updated_at FROM projects ORDER BY name")?;
    let rows = stmt.query_map([], |row| {
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            root_path: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })?;

    let mut projects = Vec::new();
    for row in rows {
        projects.push(row?);
    }
    Ok(projects)
}

/// Delete a project and all its related data (cascading).
///
/// FTS5 virtual tables don't participate in CASCADE deletes,
/// so we clean up `context_fts` manually before removing the project.
pub fn delete_project(conn: &Connection, id: &str) -> Result<(), AppError> {
    // Clean up FTS entries before cascade delete
    conn.execute(
        "DELETE FROM context_fts WHERE project_id = ?1",
        params![id],
    )?;
    let affected = conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("project {id}")));
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Tech stack
// ---------------------------------------------------------------------------

/// Insert or update a tech stack entry.
pub fn upsert_tech_stack(conn: &Connection, entry: &TechEntry) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO project_tech_stack (project_id, category, name, version, confidence, source)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(project_id, category, name) DO UPDATE SET
           version = excluded.version,
           confidence = excluded.confidence,
           source = excluded.source",
        params![
            entry.project_id,
            entry.category,
            entry.name,
            entry.version,
            entry.confidence,
            entry.source,
        ],
    )?;
    Ok(())
}

/// Get the full tech stack for a project.
pub fn get_tech_stack(conn: &Connection, project_id: &str) -> Result<Vec<TechEntry>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, category, name, version, confidence, source
         FROM project_tech_stack WHERE project_id = ?1 ORDER BY category, name",
    )?;
    let rows = stmt.query_map(params![project_id], |row| {
        Ok(TechEntry {
            id: row.get(0)?,
            project_id: row.get(1)?,
            category: row.get(2)?,
            name: row.get(3)?,
            version: row.get(4)?,
            confidence: row.get(5)?,
            source: row.get(6)?,
        })
    })?;

    let mut entries = Vec::new();
    for row in rows {
        entries.push(row?);
    }
    Ok(entries)
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

/// Insert or update a tracked file.
pub fn upsert_file(
    conn: &Connection,
    project_id: &str,
    rel_path: &str,
    file_type: &str,
    language: Option<&str>,
    size_bytes: i64,
    content_hash: Option<&str>,
) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO project_files (project_id, rel_path, file_type, language, size_bytes, content_hash, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))
         ON CONFLICT(project_id, rel_path) DO UPDATE SET
           file_type = excluded.file_type,
           language = excluded.language,
           size_bytes = excluded.size_bytes,
           content_hash = excluded.content_hash,
           updated_at = excluded.updated_at",
        params![project_id, rel_path, file_type, language, size_bytes, content_hash],
    )?;
    Ok(())
}

/// List all tracked files for a project.
pub fn list_project_files(
    conn: &Connection,
    project_id: &str,
) -> Result<Vec<(String, String, Option<String>, i64)>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT rel_path, file_type, language, size_bytes
         FROM project_files WHERE project_id = ?1 ORDER BY rel_path",
    )?;
    let rows = stmt.query_map(params![project_id], |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
    })?;

    let mut files = Vec::new();
    for row in rows {
        files.push(row?);
    }
    Ok(files)
}

// ---------------------------------------------------------------------------
// Context notes
// ---------------------------------------------------------------------------

/// Delete a context note by its ID (also removes FTS entry, transactional).
pub fn delete_context_note(conn: &Connection, note_id: &str) -> Result<(), AppError> {
    let tx = conn.unchecked_transaction()?;
    tx.execute(
        "DELETE FROM context_fts WHERE note_id = ?1",
        params![note_id],
    )?;
    let affected = tx.execute(
        "DELETE FROM context_notes WHERE id = ?1",
        params![note_id],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("note {note_id}")));
    }
    tx.commit()?;
    Ok(())
}

/// Insert a new context note.
pub fn insert_context_note(conn: &Connection, note: &ContextNote) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO context_notes (id, project_id, category, title, content, source, priority, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            note.id,
            note.project_id,
            note.category,
            note.title,
            note.content,
            note.source,
            note.priority,
            note.created_at,
            note.updated_at,
        ],
    )?;

    // Index in FTS with note_id for reliable JOIN
    conn.execute(
        "INSERT INTO context_fts (note_id, project_id, content, category) VALUES (?1, ?2, ?3, ?4)",
        params![note.id, note.project_id, note.content, note.category],
    )?;

    Ok(())
}

/// List context notes for a project, optionally filtered by category.
pub fn list_context_notes(
    conn: &Connection,
    project_id: &str,
    category: Option<&str>,
) -> Result<Vec<ContextNote>, AppError> {
    let sql = match category {
        Some(_) => {
            "SELECT id, project_id, category, title, content, source, priority, created_at, updated_at
             FROM context_notes WHERE project_id = ?1 AND category = ?2 ORDER BY priority DESC, updated_at DESC"
        }
        None => {
            "SELECT id, project_id, category, title, content, source, priority, created_at, updated_at
             FROM context_notes WHERE project_id = ?1 ORDER BY priority DESC, updated_at DESC"
        }
    };

    let mut stmt = conn.prepare(sql)?;

    let rows = if let Some(cat) = category {
        stmt.query_map(params![project_id, cat], map_context_note)?
    } else {
        stmt.query_map(params![project_id], map_context_note)?
    };

    let mut notes = Vec::new();
    for row in rows {
        notes.push(row?);
    }
    Ok(notes)
}

fn map_context_note(row: &rusqlite::Row) -> rusqlite::Result<ContextNote> {
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

// ---------------------------------------------------------------------------
// Recent changes
// ---------------------------------------------------------------------------

/// Insert a recent change record.
pub fn insert_recent_change(conn: &Connection, change: &RecentChange) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO recent_changes (project_id, change_type, summary, files, author, timestamp, commit_hash)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            change.project_id,
            change.change_type,
            change.summary,
            change.files,
            change.author,
            change.timestamp,
            change.commit_hash,
        ],
    )?;
    Ok(())
}

/// List recent changes for a project (newest first, limited).
pub fn list_recent_changes(
    conn: &Connection,
    project_id: &str,
    limit: i64,
) -> Result<Vec<RecentChange>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, project_id, change_type, summary, files, author, timestamp, commit_hash
         FROM recent_changes WHERE project_id = ?1 ORDER BY timestamp DESC LIMIT ?2",
    )?;
    let rows = stmt.query_map(params![project_id, limit], |row| {
        Ok(RecentChange {
            id: row.get(0)?,
            project_id: row.get(1)?,
            change_type: row.get(2)?,
            summary: row.get(3)?,
            files: row.get(4)?,
            author: row.get(5)?,
            timestamp: row.get(6)?,
            commit_hash: row.get(7)?,
        })
    })?;

    let mut changes = Vec::new();
    for row in rows {
        changes.push(row?);
    }
    Ok(changes)
}

// ---------------------------------------------------------------------------
// Sync state
// ---------------------------------------------------------------------------

/// Insert or update the sync state for a project × target pair.
pub fn upsert_sync_state(conn: &Connection, state: &SyncState) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO sync_state (project_id, target, output_path, content_hash, synced_at)
         VALUES (?1, ?2, ?3, ?4, datetime('now'))
         ON CONFLICT(project_id, target) DO UPDATE SET
           output_path = excluded.output_path,
           content_hash = excluded.content_hash,
           synced_at = excluded.synced_at",
        params![
            state.project_id,
            state.target,
            state.output_path,
            state.content_hash,
        ],
    )?;
    Ok(())
}

/// Get the sync state for a project × target pair.
pub fn get_sync_state(
    conn: &Connection,
    project_id: &str,
    target: &str,
) -> Result<Option<SyncState>, AppError> {
    let result = conn.query_row(
        "SELECT id, project_id, target, output_path, content_hash, synced_at
         FROM sync_state WHERE project_id = ?1 AND target = ?2",
        params![project_id, target],
        |row| {
            Ok(SyncState {
                id: row.get(0)?,
                project_id: row.get(1)?,
                target: row.get(2)?,
                output_path: row.get(3)?,
                content_hash: row.get(4)?,
                synced_at: row.get(5)?,
            })
        },
    );

    match result {
        Ok(state) => Ok(Some(state)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e.to_string())),
    }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/// Get a setting value by key.
pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, AppError> {
    let result = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    );

    match result {
        Ok(val) => Ok(Some(val)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e.to_string())),
    }
}

/// Set a setting value (insert or update).
pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), AppError> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Context assembly
// ---------------------------------------------------------------------------

/// Assemble the full [`ProjectContext`] for a given project ID.
pub fn assemble_context(conn: &Connection, project_id: &str) -> Result<ProjectContext, AppError> {
    let project = get_project(conn, project_id)?;
    let tech_stack = get_tech_stack(conn, project_id)?;
    let notes = list_context_notes(conn, project_id, None)?;
    let recent_changes = list_recent_changes(conn, project_id, 50)?;

    let mut stmt = conn.prepare(
        "SELECT id, project_id, target, output_path, content_hash, synced_at
         FROM sync_state WHERE project_id = ?1",
    )?;
    let sync_rows = stmt.query_map(params![project_id], |row| {
        Ok(SyncState {
            id: row.get(0)?,
            project_id: row.get(1)?,
            target: row.get(2)?,
            output_path: row.get(3)?,
            content_hash: row.get(4)?,
            synced_at: row.get(5)?,
        })
    })?;

    let mut sync_state = Vec::new();
    for row in sync_rows {
        sync_state.push(row?);
    }

    Ok(ProjectContext {
        project,
        tech_stack,
        notes,
        recent_changes,
        sync_state,
    })
}

/// Search context notes using FTS5 full-text search.
///
/// User input is sanitized to strip FTS5 special operators. The `project_id`
/// is enforced via a standard SQL WHERE clause, not through the FTS MATCH
/// expression, to prevent cross-project data access.
pub fn search_context_notes(
    conn: &Connection,
    project_id: &str,
    query: &str,
) -> Result<Vec<ContextNote>, AppError> {
    // Sanitize: strip FTS5 operators and special characters
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

    // Double-quote to treat as literal phrase in FTS5
    let fts_query = format!("\"{}\"", sanitized.replace('"', "\"\""));

    let mut stmt = conn.prepare(
        "SELECT cn.id, cn.project_id, cn.category, cn.title, cn.content, cn.source,
                cn.priority, cn.created_at, cn.updated_at
         FROM context_notes cn
         JOIN context_fts fts ON cn.id = fts.note_id
         WHERE context_fts MATCH ?1
           AND cn.project_id = ?2
         ORDER BY rank",
    )?;

    let rows = stmt.query_map(params![fts_query, project_id], map_context_note)?;

    let mut notes = Vec::new();
    for row in rows {
        notes.push(row?);
    }
    Ok(notes)
}

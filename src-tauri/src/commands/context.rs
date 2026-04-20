//! Context query commands exposed over Tauri IPC.

use crate::db::{models::ContextNote, queries};
use crate::errors::AppError;
use crate::state::AppState;
use tauri::State;

/// Search context notes using full-text search.
#[tauri::command]
pub fn search_context(
    state: State<'_, AppState>,
    project_id: String,
    query: String,
) -> Result<Vec<ContextNote>, AppError> {
    let storage = state
        .storage
        .lock()
        .map_err(|_| AppError::Internal("State unavailable".into()))?;
    queries::search_context_notes(&storage.conn, &project_id, &query)
}

/// Add a context note to a project.
#[tauri::command]
pub fn add_note(
    state: State<'_, AppState>,
    project_id: String,
    category: String,
    title: String,
    content: String,
    priority: i32,
) -> Result<ContextNote, AppError> {
    const ALLOWED_CATEGORIES: &[&str] = &[
        "architecture",
        "conventions",
        "dependencies",
        "patterns",
        "testing",
        "deployment",
        "other",
    ];

    let title = title.trim().to_string();
    let content = content.trim().to_string();

    if title.is_empty() {
        return Err(AppError::InvalidInput("Title must not be empty".into()));
    }
    if title.len() > 500 {
        return Err(AppError::InvalidInput(
            "Title must not exceed 500 characters".into(),
        ));
    }
    if content.len() > 100_000 {
        return Err(AppError::InvalidInput(
            "Content must not exceed 100KB".into(),
        ));
    }
    if !(0..=10).contains(&priority) {
        return Err(AppError::InvalidInput(
            "Priority must be between 0 and 10".into(),
        ));
    }
    if !ALLOWED_CATEGORIES.contains(&category.as_str()) {
        return Err(AppError::InvalidInput("Invalid category".into()));
    }

    let now = chrono::Utc::now().to_rfc3339();
    let note = ContextNote {
        id: uuid::Uuid::new_v4().to_string(),
        project_id,
        category,
        title,
        content,
        source: "manual".to_string(),
        priority,
        created_at: now.clone(),
        updated_at: now,
    };

    let storage = state
        .storage
        .lock()
        .map_err(|_| AppError::Internal("State unavailable".into()))?;
    let tx = storage.conn.unchecked_transaction()?;
    queries::insert_context_note(&tx, &note)?;
    tx.commit()?;
    Ok(note)
}

/// Delete a context note by its ID, verifying it belongs to the given project.
#[tauri::command]
pub fn delete_note(
    state: State<'_, AppState>,
    project_id: String,
    note_id: String,
) -> Result<(), AppError> {
    let storage = state
        .storage
        .lock()
        .map_err(|_| AppError::Internal("State unavailable".into()))?;
    queries::delete_context_note(&storage.conn, &note_id, &project_id)
}

/// Update an existing context note, re-validating all fields.
#[tauri::command]
pub fn update_note(
    state: State<'_, AppState>,
    project_id: String,
    note_id: String,
    category: String,
    title: String,
    content: String,
    priority: i32,
) -> Result<ContextNote, AppError> {
    const ALLOWED_CATEGORIES: &[&str] = &[
        "architecture",
        "conventions",
        "dependencies",
        "patterns",
        "testing",
        "deployment",
        "other",
    ];

    let title = title.trim().to_string();
    let content = content.trim().to_string();

    if title.is_empty() {
        return Err(AppError::InvalidInput("Title must not be empty".into()));
    }
    if title.len() > 500 {
        return Err(AppError::InvalidInput(
            "Title must not exceed 500 characters".into(),
        ));
    }
    if content.len() > 100_000 {
        return Err(AppError::InvalidInput(
            "Content must not exceed 100KB".into(),
        ));
    }
    if !(0..=10).contains(&priority) {
        return Err(AppError::InvalidInput(
            "Priority must be between 0 and 10".into(),
        ));
    }
    if !ALLOWED_CATEGORIES.contains(&category.as_str()) {
        return Err(AppError::InvalidInput("Invalid category".into()));
    }

    let now = chrono::Utc::now().to_rfc3339();

    let storage = state
        .storage
        .lock()
        .map_err(|_| AppError::Internal("State unavailable".into()))?;

    let tx = storage.conn.unchecked_transaction()?;

    // Verify note exists and belongs to the project
    let affected = tx.execute(
        "UPDATE context_notes
         SET category = ?1, title = ?2, content = ?3, priority = ?4, updated_at = ?5
         WHERE id = ?6 AND project_id = ?7",
        rusqlite::params![category, title, content, priority, now, note_id, project_id],
    )?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("note {note_id}")));
    }

    // Update FTS index
    tx.execute(
        "DELETE FROM context_fts WHERE note_id = ?1",
        rusqlite::params![note_id],
    )?;
    tx.execute(
        "INSERT INTO context_fts (note_id, project_id, content, category) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![note_id, project_id, content, category],
    )?;

    tx.commit()?;

    // Return updated note fetched from DB
    let note = storage.conn.query_row(
        "SELECT id, project_id, category, title, content, source, priority, created_at, updated_at
         FROM context_notes WHERE id = ?1",
        rusqlite::params![note_id],
        |row| {
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
        },
    )?;

    Ok(note)
}

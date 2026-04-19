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
    let storage = state.storage.lock().map_err(|_| AppError::Internal("State unavailable".into()))?;
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
        "architecture", "conventions", "dependencies", "patterns", "testing", "deployment", "other",
    ];

    let title = title.trim().to_string();
    let content = content.trim().to_string();

    if title.is_empty() {
        return Err(AppError::InvalidInput("Title must not be empty".into()));
    }
    if title.len() > 500 {
        return Err(AppError::InvalidInput("Title must not exceed 500 characters".into()));
    }
    if content.len() > 100_000 {
        return Err(AppError::InvalidInput("Content must not exceed 100KB".into()));
    }
    if !(0..=10).contains(&priority) {
        return Err(AppError::InvalidInput("Priority must be between 0 and 10".into()));
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

    let storage = state.storage.lock().map_err(|_| AppError::Internal("State unavailable".into()))?;
    queries::insert_context_note(&storage.conn, &note)?;
    Ok(note)
}

/// Delete a context note by its ID.
#[tauri::command]
pub fn delete_note(
    state: State<'_, AppState>,
    note_id: String,
) -> Result<(), AppError> {
    let storage = state.storage.lock().map_err(|_| AppError::Internal("State unavailable".into()))?;
    queries::delete_context_note(&storage.conn, &note_id)
}

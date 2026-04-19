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

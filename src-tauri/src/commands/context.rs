//! Context query commands exposed over Tauri IPC.

use crate::db::{models::ContextNote, queries};
use crate::errors::AppError;
use crate::state::AppState;
use contextbridge_core::ProjectContext;
use tauri::State;

/// Get the full assembled context for a project.
#[tauri::command]
pub fn get_context(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<ProjectContext, AppError> {
    let storage = state.storage.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    queries::assemble_context(&storage.conn, &project_id)
}

/// Search context notes using full-text search.
#[tauri::command]
pub fn search_context(
    state: State<'_, AppState>,
    project_id: String,
    query: String,
) -> Result<Vec<ContextNote>, AppError> {
    let storage = state.storage.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    queries::search_context_notes(&storage.conn, &project_id, &query)
}

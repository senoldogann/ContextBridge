//! Settings commands exposed over Tauri IPC.

use crate::db::queries;
use crate::errors::AppError;
use crate::state::AppState;
use tauri::State;

/// Retrieve a setting value by key.
#[tauri::command]
pub fn get_setting(
    state: State<'_, AppState>,
    key: String,
) -> Result<Option<String>, AppError> {
    let storage = state.storage.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    queries::get_setting(&storage.conn, &key)
}

/// Set a setting value by key.
#[tauri::command]
pub fn set_setting(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), AppError> {
    let storage = state.storage.lock().map_err(|e| AppError::Internal(e.to_string()))?;
    queries::set_setting(&storage.conn, &key, &value)
}

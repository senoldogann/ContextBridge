//! Settings commands exposed over Tauri IPC.

use crate::db::queries;
use crate::errors::AppError;
use crate::state::AppState;
use tauri::State;

/// Allowed settings keys.
const ALLOWED_KEYS: &[&str] = &["theme", "auto_sync", "enabled_adapters"];

/// Retrieve a setting value by key.
#[tauri::command]
pub fn get_setting(state: State<'_, AppState>, key: String) -> Result<Option<String>, AppError> {
    let storage = state
        .storage
        .lock()
        .map_err(|_| AppError::Internal("State unavailable".into()))?;
    queries::get_setting(&storage.conn, &key)
}

/// Set a setting value by key. Only whitelisted keys are accepted.
#[tauri::command]
pub fn set_setting(state: State<'_, AppState>, key: String, value: String) -> Result<(), AppError> {
    if !ALLOWED_KEYS.contains(&key.as_str()) {
        return Err(AppError::InvalidInput(format!(
            "Unknown setting key: {key}"
        )));
    }
    if value.len() > 10_000 {
        return Err(AppError::InvalidInput(
            "Setting value too long (max 10,000 bytes)".into(),
        ));
    }
    let storage = state
        .storage
        .lock()
        .map_err(|_| AppError::Internal("State unavailable".into()))?;
    queries::set_setting(&storage.conn, &key, &value)
}

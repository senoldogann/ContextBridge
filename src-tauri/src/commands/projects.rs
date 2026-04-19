//! Project CRUD commands exposed over Tauri IPC.

use crate::db::{models::Project, queries};
use crate::errors::AppError;
use crate::state::AppState;
use contextbridge_core::ProjectContext;
use tauri::State;

/// List all registered projects.
#[tauri::command]
pub fn list_projects(state: State<'_, AppState>) -> Result<Vec<Project>, AppError> {
    let storage = state.storage.lock().map_err(|_| AppError::Internal("State unavailable".into()))?;
    queries::list_projects(&storage.conn)
}

/// Register a new project by name and root path.
///
/// Validates that the name is non-empty and the path is an existing
/// absolute directory. The path is canonicalized to resolve symlinks
/// and `..` segments.
#[tauri::command]
pub fn add_project(
    state: State<'_, AppState>,
    name: String,
    root_path: String,
) -> Result<Project, AppError> {
    // Validate name
    let name = name.trim().to_string();
    if name.is_empty() || name.len() > 255 {
        return Err(AppError::InvalidInput(
            "Project name must be 1–255 characters".into(),
        ));
    }

    // Validate and canonicalize path
    let canonical = std::fs::canonicalize(&root_path)
        .map_err(|_| AppError::InvalidInput(format!("Path does not exist: {root_path}")))?;

    if !canonical.is_dir() {
        return Err(AppError::InvalidInput("Path must be a directory".into()));
    }

    let storage = state.storage.lock().map_err(|_| AppError::Internal("State unavailable".into()))?;
    let now = chrono::Utc::now().to_rfc3339();
    let project = Project {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        root_path: canonical.to_string_lossy().to_string(),
        created_at: now.clone(),
        updated_at: now,
    };
    queries::insert_project(&storage.conn, &project)?;
    Ok(project)
}

/// Remove a project by ID.
#[tauri::command]
pub fn remove_project(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    let storage = state.storage.lock().map_err(|_| AppError::Internal("State unavailable".into()))?;
    queries::delete_project(&storage.conn, &id)
}

/// Assemble and return the full context for a project.
#[tauri::command]
pub fn get_project_context(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<ProjectContext, AppError> {
    let storage = state.storage.lock().map_err(|_| AppError::Internal("State unavailable".into()))?;
    queries::assemble_context(&storage.conn, &project_id)
}

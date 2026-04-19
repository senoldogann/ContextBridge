//! Project CRUD commands exposed over Tauri IPC.

use crate::core::context_engine::{self, RefreshOptions};
use crate::db::{models::Project, queries};
use crate::errors::AppError;
use crate::state::AppState;
use contextbridge_core::ProjectContext;
use tauri::State;

/// List all registered projects.
#[tauri::command]
pub fn list_projects(state: State<'_, AppState>) -> Result<Vec<Project>, AppError> {
    let storage = state
        .storage
        .lock()
        .map_err(|_| AppError::Internal("State unavailable".into()))?;
    queries::list_projects(&storage.conn)
}

/// Register a new project by name and root path.
///
/// Validates that the name is non-empty and the path is an existing
/// absolute directory. The path is canonicalized to resolve symlinks
/// and `..` segments. Automatically scans the project after adding.
#[tauri::command]
pub fn add_project(
    state: State<'_, AppState>,
    name: String,
    root_path: String,
) -> Result<Project, AppError> {
    // Validate name
    let name = name.trim().to_string();
    if name.is_empty() || name.chars().count() > 255 {
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

    let project = {
        let storage = state
            .storage
            .lock()
            .map_err(|_| AppError::Internal("State unavailable".into()))?;
        let now = chrono::Utc::now().to_rfc3339();
        let project = Project {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            root_path: canonical.to_string_lossy().to_string(),
            created_at: now.clone(),
            updated_at: now,
        };
        queries::insert_project(&storage.conn, &project)?;
        project
    }; // storage lock released

    // Auto-scan after adding (re-acquire lock briefly)
    {
        let storage = state
            .storage
            .lock()
            .map_err(|_| AppError::Internal("State unavailable".into()))?;
        if let Err(e) =
            context_engine::refresh_context(&storage, &project.id, &RefreshOptions::default())
        {
            tracing::warn!(project_id = %project.id, error = %e, "Auto-scan failed after adding project");
        }
    } // storage lock released

    // Start watching the project directory
    if let Ok(mut watcher) = state.watcher.lock() {
        if let Err(e) = watcher.watch_project(project.id.clone(), canonical) {
            tracing::warn!(project_id = %project.id, error = %e, "Failed to start file watcher");
        }
    }

    Ok(project)
}

/// Remove a project by ID. Stops its watcher first.
#[tauri::command]
pub fn remove_project(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    // Stop watcher for this project
    if let Ok(mut watcher) = state.watcher.lock() {
        let _ = watcher.unwatch_project(&id);
    }

    let storage = state
        .storage
        .lock()
        .map_err(|_| AppError::Internal("State unavailable".into()))?;
    queries::delete_project(&storage.conn, &id)
}

/// Assemble and return the full context for a project.
#[tauri::command]
pub fn get_project_context(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<ProjectContext, AppError> {
    let storage = state
        .storage
        .lock()
        .map_err(|_| AppError::Internal("State unavailable".into()))?;
    queries::assemble_context(&storage.conn, &project_id)
}

/// Trigger a full scan of a project's directory and git repo.
#[tauri::command]
pub fn scan_project(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<context_engine::ContextRefreshResult, AppError> {
    let storage = state
        .storage
        .lock()
        .map_err(|_| AppError::Internal("State unavailable".into()))?;
    context_engine::refresh_context(&storage, &project_id, &RefreshOptions::default())
}

/// Refresh project context (delegates to scan_project).
#[tauri::command]
pub fn refresh_project_context(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<context_engine::ContextRefreshResult, AppError> {
    scan_project(state, project_id)
}

/// Sync project context to a specific AI tool target.
#[tauri::command]
pub fn sync_to_tool(
    state: State<'_, AppState>,
    project_id: String,
    target: String,
) -> Result<crate::core::sync::SyncResult, AppError> {
    let storage = state
        .storage
        .lock()
        .map_err(|_| AppError::Internal("State unavailable".into()))?;
    crate::core::sync::sync_to_tool(&storage, &project_id, &target)
}

/// Sync project context to all enabled AI tool targets.
#[tauri::command]
pub fn sync_all_tools(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<Vec<crate::core::sync::SyncResult>, AppError> {
    let storage = state
        .storage
        .lock()
        .map_err(|_| AppError::Internal("State unavailable".into()))?;
    crate::core::sync::sync_all(&storage, &project_id)
}

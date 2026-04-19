//! Context engine.
//!
//! Orchestrates scanning, analysis, and context assembly for a project.

/// Run a full context refresh for the given project ID.
pub fn refresh_context(_project_id: &str) -> Result<(), crate::errors::AppError> {
    // TODO: coordinate scanner → git analyzer → note assembly → sync
    tracing::info!("Context refresh (stub) for {}", _project_id);
    Ok(())
}

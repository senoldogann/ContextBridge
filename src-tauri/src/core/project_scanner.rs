//! Project scanner.
//!
//! Scans a project directory to detect tech stack, file structure, and metadata.

/// Scan a project directory and populate the database with results.
pub fn scan_project(_root_path: &str) -> Result<(), crate::errors::AppError> {
    // TODO: implement directory walking, tech detection, etc.
    tracing::info!("Project scan (stub) for {}", _root_path);
    Ok(())
}

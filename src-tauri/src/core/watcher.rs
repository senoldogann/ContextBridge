//! File system watcher supervisor.
//!
//! Watches project directories for changes and triggers re-scanning.

/// Supervises file-system watchers for all registered projects.
pub struct WatcherSupervisor;

impl WatcherSupervisor {
    /// Start watching the given project root.
    pub fn start(_root_path: &str) -> Result<Self, crate::errors::AppError> {
        // TODO: implement with notify crate
        tracing::info!("Watcher started (stub) for {}", _root_path);
        Ok(Self)
    }

    /// Stop all active watchers.
    pub fn stop(&self) {
        // TODO: implement
        tracing::info!("Watcher stopped (stub)");
    }
}

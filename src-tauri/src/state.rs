//! Application state shared across Tauri commands.

use crate::core::watcher::WatcherSupervisor;
use crate::db::StorageManager;
use std::sync::{Arc, Mutex};

/// Shared application state managed by Tauri.
pub struct AppState {
    /// Thread-safe handle to the storage layer.
    pub storage: Arc<Mutex<StorageManager>>,
    /// File watcher supervisor for all tracked projects.
    pub watcher: Arc<Mutex<WatcherSupervisor>>,
}

impl AppState {
    /// Create a new [`AppState`] wrapping the given storage manager and watcher.
    pub fn new(storage: StorageManager, watcher: WatcherSupervisor) -> Self {
        Self {
            storage: Arc::new(Mutex::new(storage)),
            watcher: Arc::new(Mutex::new(watcher)),
        }
    }
}

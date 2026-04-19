//! Application state shared across Tauri commands.

use crate::db::StorageManager;
use std::sync::{Arc, Mutex};

/// Shared application state managed by Tauri.
pub struct AppState {
    /// Thread-safe handle to the storage layer.
    pub storage: Arc<Mutex<StorageManager>>,
}

impl AppState {
    /// Create a new [`AppState`] wrapping the given storage manager.
    pub fn new(storage: StorageManager) -> Self {
        Self {
            storage: Arc::new(Mutex::new(storage)),
        }
    }
}

//! Application error types for Tauri IPC serialization.

use serde::Serialize;
use thiserror::Error;

/// Application error that serializes cleanly over Tauri IPC.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        AppError::Database(e.to_string())
    }
}

impl From<contextbridge_core::AppError> for AppError {
    fn from(e: contextbridge_core::AppError) -> Self {
        AppError::Internal(e.to_string())
    }
}

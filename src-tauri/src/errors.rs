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
        // Sanitize internal errors before sending to frontend
        let msg = match self {
            AppError::Internal(_) => "Internal error: An unexpected error occurred".to_string(),
            other => other.to_string(),
        };
        serializer.serialize_str(&msg)
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        tracing::error!("Database error: {e}");
        AppError::Database("A database error occurred".into())
    }
}

impl From<contextbridge_core::AppError> for AppError {
    fn from(e: contextbridge_core::AppError) -> Self {
        tracing::error!("Core error: {e}");
        AppError::Internal("An unexpected error occurred".into())
    }
}

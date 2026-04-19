//! Database layer — storage manager, migrations, models, and queries.

pub mod migrations;
pub mod models;
pub mod queries;

use crate::errors::AppError;
use rusqlite::Connection;
use std::path::Path;

/// Manages the SQLite database connection and schema.
pub struct StorageManager {
    /// The underlying SQLite connection.
    pub conn: Connection,
}

impl StorageManager {
    /// Open (or create) the database at `path` and run all pending migrations.
    pub fn new(path: &Path) -> Result<Self, AppError> {
        let conn = Connection::open(path).map_err(|e| AppError::Database(e.to_string()))?;

        // Performance pragmas
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA foreign_keys = ON;
             PRAGMA synchronous = NORMAL;",
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

        migrations::run_migrations(&conn)?;

        Ok(Self { conn })
    }

    /// Create an in-memory database (useful for tests).
    pub fn in_memory() -> Result<Self, AppError> {
        let conn = Connection::open_in_memory().map_err(|e| AppError::Database(e.to_string()))?;

        conn.execute_batch("PRAGMA foreign_keys = ON;")
            .map_err(|e| AppError::Database(e.to_string()))?;

        migrations::run_migrations(&conn)?;

        Ok(Self { conn })
    }
}

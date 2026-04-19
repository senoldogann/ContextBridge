#![deny(clippy::all)]

//! Shared types and traits for ContextBridge.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use thiserror::Error;

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

/// A monitored project.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub root_path: String,
    pub created_at: String,
    pub updated_at: String,
}

/// A single technology detected in a project (language, framework, tool…).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechEntry {
    pub id: i64,
    pub project_id: String,
    pub category: String,
    pub name: String,
    pub version: Option<String>,
    pub confidence: f64,
    pub source: String,
}

/// A user- or AI-generated context note attached to a project.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextNote {
    pub id: String,
    pub project_id: String,
    pub category: String,
    pub title: String,
    pub content: String,
    pub source: String,
    pub priority: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// A recently observed change (commit, file edit, etc.).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentChange {
    pub id: i64,
    pub project_id: String,
    pub change_type: String,
    pub summary: String,
    pub files: String,
    pub author: Option<String>,
    pub timestamp: String,
    pub commit_hash: Option<String>,
}

/// Tracks the last sync of generated output for a project × target pair.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncState {
    pub id: i64,
    pub project_id: String,
    pub target: String,
    pub output_path: String,
    pub content_hash: String,
    pub synced_at: String,
}

/// Fully assembled context for a project — the main data payload.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectContext {
    pub project: Project,
    pub tech_stack: Vec<TechEntry>,
    pub notes: Vec<ContextNote>,
    pub recent_changes: Vec<RecentChange>,
    pub sync_state: Vec<SyncState>,
}

// ---------------------------------------------------------------------------
// ContextFormatter trait
// ---------------------------------------------------------------------------

/// Trait for formatting a [`ProjectContext`] into a specific output format
/// (e.g. CLAUDE.md, .cursorrules, etc.).
pub trait ContextFormatter {
    /// Render the full formatted output as a string.
    fn format(&self, ctx: &ProjectContext) -> Result<String, AppError>;

    /// The file name to write (e.g. `CLAUDE.md`).
    fn output_filename(&self) -> &str;

    /// The directory (relative to the project root) where the file is written.
    fn output_directory(&self) -> PathBuf;
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

/// Shared error type used across all ContextBridge crates.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Project not found: {0}")]
    ProjectNotFound(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Watcher error: {0}")]
    Watcher(String),

    #[error("Git error: {0}")]
    Git(String),

    #[error("{0}")]
    Other(String),
}

impl From<std::fmt::Error> for AppError {
    fn from(e: std::fmt::Error) -> Self {
        AppError::Other(e.to_string())
    }
}

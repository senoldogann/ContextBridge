//! Sync engine — writes formatted context files to project directories.

use std::path::Path;

use sha2::{Digest, Sha256};

use contextbridge_core::{ContextFormatter, ProjectContext, SyncState};

use crate::db::{queries, StorageManager};
use crate::errors::AppError;
use crate::output::{
    claude::ClaudeFormatter, codex::CodexFormatter, copilot::CopilotFormatter,
    cursor::CursorFormatter,
};

/// Supported sync targets.
pub const VALID_TARGETS: &[&str] = &["claude", "cursor", "copilot", "codex"];

/// Result of a sync operation.
#[derive(Debug, Clone, serde::Serialize)]
pub struct SyncResult {
    /// Which AI tool was targeted.
    pub target: String,
    /// Absolute path of the written output file.
    pub output_path: String,
    /// `false` if content was unchanged and the write was skipped.
    pub written: bool,
    /// SHA-256 hex digest of the file content.
    pub content_hash: String,
}

/// Sync context for a specific target tool.
///
/// Formats the project context using the appropriate formatter, writes the
/// output file into the project directory, and records sync state in the DB.
/// If the content has not changed since the last sync the write is skipped.
pub fn sync_to_tool(
    storage: &StorageManager,
    project_id: &str,
    target: &str,
) -> Result<SyncResult, AppError> {
    // Validate target
    if !VALID_TARGETS.contains(&target) {
        return Err(AppError::InvalidInput(format!(
            "Unknown sync target: {target}. Valid: {}",
            VALID_TARGETS.join(", ")
        )));
    }

    // Get project context
    let ctx = queries::assemble_context(&storage.conn, project_id)?;

    // Get formatter for target
    let (content, filename, output_dir) = format_for_target(target, &ctx)?;

    // Compute content hash
    let hash = compute_hash(&content);

    // Check if content changed since last sync
    if let Some(existing) = queries::get_sync_state(&storage.conn, project_id, target)? {
        if existing.content_hash == hash {
            return Ok(SyncResult {
                target: target.to_string(),
                output_path: existing.output_path,
                written: false,
                content_hash: hash,
            });
        }
    }

    // Resolve output path (project_root / output_dir / filename)
    let project_root = Path::new(&ctx.project.root_path);

    // Validate project root exists
    if !project_root.is_dir() {
        return Err(AppError::InvalidInput(
            "Project root directory not found".into(),
        ));
    }

    let dir = project_root.join(&output_dir);

    // Create output directory if needed
    std::fs::create_dir_all(&dir).map_err(|e| {
        AppError::Internal(format!("Failed to create directory {}: {e}", dir.display()))
    })?;

    let file_path = dir.join(&filename);

    // Verify the resolved path is within the project root (path traversal protection)
    let canonical_root = std::fs::canonicalize(project_root)
        .map_err(|_| AppError::InvalidInput("Cannot resolve project root".into()))?;
    let canonical_dir = std::fs::canonicalize(&dir)
        .map_err(|_| AppError::InvalidInput("Cannot resolve output directory".into()))?;
    if !canonical_dir.starts_with(&canonical_root) {
        return Err(AppError::InvalidInput(
            "Output path escapes project root".into(),
        ));
    }

    // Write file
    std::fs::write(&file_path, &content)
        .map_err(|e| AppError::Internal(format!("Failed to write {}: {e}", file_path.display())))?;

    let output_path_str = file_path.to_string_lossy().to_string();

    // Update sync state in DB
    let state = SyncState {
        id: 0, // auto-incremented
        project_id: project_id.to_string(),
        target: target.to_string(),
        output_path: output_path_str.clone(),
        content_hash: hash.clone(),
        synced_at: String::new(), // set by DB default
    };
    queries::upsert_sync_state(&storage.conn, &state)?;

    Ok(SyncResult {
        target: target.to_string(),
        output_path: output_path_str,
        written: true,
        content_hash: hash,
    })
}

/// Sync all enabled targets for a project.
///
/// Iterates over every [`VALID_TARGETS`] entry and returns one
/// [`SyncResult`] per target.
pub fn sync_all(
    storage: &StorageManager,
    project_id: &str,
) -> Result<Vec<SyncResult>, AppError> {
    let mut results = Vec::new();
    for target in VALID_TARGETS {
        results.push(sync_to_tool(storage, project_id, target)?);
    }
    Ok(results)
}

/// Format context for a specific target, returning `(content, filename, output_dir)`.
fn format_for_target(
    target: &str,
    ctx: &ProjectContext,
) -> Result<(String, String, String), AppError> {
    match target {
        "claude" => {
            let f = ClaudeFormatter;
            Ok((
                f.format(ctx)?,
                f.output_filename().to_string(),
                f.output_directory().to_string_lossy().to_string(),
            ))
        }
        "cursor" => {
            let f = CursorFormatter;
            Ok((
                f.format(ctx)?,
                f.output_filename().to_string(),
                f.output_directory().to_string_lossy().to_string(),
            ))
        }
        "copilot" => {
            let f = CopilotFormatter;
            Ok((
                f.format(ctx)?,
                f.output_filename().to_string(),
                f.output_directory().to_string_lossy().to_string(),
            ))
        }
        "codex" => {
            let f = CodexFormatter;
            Ok((
                f.format(ctx)?,
                f.output_filename().to_string(),
                f.output_directory().to_string_lossy().to_string(),
            ))
        }
        _ => Err(AppError::InvalidInput(format!("Unknown target: {target}"))),
    }
}

/// Compute the SHA-256 hex digest of the given content.
fn compute_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

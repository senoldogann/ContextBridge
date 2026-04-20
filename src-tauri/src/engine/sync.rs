//! Sync engine — writes formatted context files to project directories.

use std::path::Path;

use sha2::{Digest, Sha256};

use contextbridge_core::{ContextFormatter, ProjectContext, SyncState};
use serde_json::Value;

use crate::db::{queries, StorageManager};
use crate::errors::AppError;
use crate::output::{
    claude::ClaudeFormatter, codex::CodexFormatter, copilot::CopilotFormatter,
    cursor::CursorFormatter,
};

/// Supported sync targets.
pub const VALID_TARGETS: &[&str] = &["claude", "cursor", "copilot", "codex"];

const AUTO_SYNC_SETTING_KEY: &str = "auto_sync";
const ENABLED_ADAPTERS_SETTING_KEY: &str = "enabled_adapters";

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

    let ctx = queries::assemble_context(&storage.conn, project_id)?;
    sync_to_tool_with_context(storage, project_id, target, &ctx)
}

/// Internal: sync a single target using a pre-assembled context.
fn sync_to_tool_with_context(
    storage: &StorageManager,
    project_id: &str,
    target: &str,
    ctx: &ProjectContext,
) -> Result<SyncResult, AppError> {
    // Get formatter for target
    let (content, filename, output_dir) = format_for_target(target, ctx)?;

    // Compute content hash
    let hash = compute_hash(&content);

    // Resolve output path (project_root / output_dir / filename)
    let project_root = Path::new(&ctx.project.root_path);

    // Validate project root exists
    if !project_root.is_dir() {
        return Err(AppError::InvalidInput(
            "Project root directory not found".into(),
        ));
    }

    let canonical_root = std::fs::canonicalize(project_root)
        .map_err(|_| AppError::InvalidInput("Cannot resolve project root".into()))?;

    // Check output_dir components for symlinks BEFORE creating dirs
    if path_contains_symlink_relative(&canonical_root, Path::new(&output_dir)) {
        return Err(AppError::InvalidInput(
            "Output path contains symlinks — refusing to write".into(),
        ));
    }

    // Create output directory
    let dir = canonical_root.join(&output_dir);
    std::fs::create_dir_all(&dir).map_err(|e| {
        AppError::Internal(format!("Failed to create directory {}: {e}", dir.display()))
    })?;

    // Resolve the canonical path of the output directory BEFORE writing
    let canonical_dir = std::fs::canonicalize(&dir)
        .map_err(|_| AppError::InvalidInput("Cannot resolve output directory".into()))?;
    if !canonical_dir.starts_with(&canonical_root) {
        return Err(AppError::InvalidInput(
            "Output path escapes project root".into(),
        ));
    }

    let file_path = canonical_dir.join(&filename);
    let output_path_str = file_path.to_string_lossy().to_string();

    // Skip the write only if the on-disk file still matches the generated content.
    if let Some(existing) = queries::get_sync_state(&storage.conn, project_id, target)? {
        if existing.content_hash == hash && output_matches_content(&file_path, &content)? {
            let refreshed_state = SyncState {
                id: existing.id,
                project_id: project_id.to_string(),
                target: target.to_string(),
                output_path: output_path_str.clone(),
                content_hash: hash.clone(),
                synced_at: existing.synced_at,
            };
            queries::upsert_sync_state(&storage.conn, &refreshed_state)?;

            return Ok(SyncResult {
                target: target.to_string(),
                output_path: output_path_str,
                written: false,
                content_hash: hash,
            });
        }
    }

    // Final validation: ensure the resolved file path stays under root
    if !file_path.starts_with(&canonical_root) {
        return Err(AppError::InvalidInput(
            "Output file path escapes project root".into(),
        ));
    }

    // Write file only after path validation
    std::fs::write(&file_path, &content)
        .map_err(|e| AppError::Internal(format!("Failed to write {}: {e}", file_path.display())))?;

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
/// [`SyncResult`] per target. Failures for individual targets are logged
/// but do not prevent other targets from syncing.
pub fn sync_all(storage: &StorageManager, project_id: &str) -> Result<Vec<SyncResult>, AppError> {
    let enabled_targets = load_enabled_targets(storage)?;

    if enabled_targets.is_empty() {
        return Ok(Vec::new());
    }

    let ctx = queries::assemble_context(&storage.conn, project_id)?;
    let mut results = Vec::new();
    for target in enabled_targets {
        match sync_to_tool_with_context(storage, project_id, target, &ctx) {
            Ok(r) => results.push(r),
            Err(e) => {
                tracing::warn!(target, error = %e, "sync failed for target");
            }
        }
    }
    Ok(results)
}

/// Run a settings-aware sync after a context refresh.
///
/// When `auto_sync` is disabled the function returns an empty vector and does
/// not write any output files.
pub fn sync_after_refresh(
    storage: &StorageManager,
    project_id: &str,
) -> Result<Vec<SyncResult>, AppError> {
    if !load_auto_sync_enabled(storage)? {
        return Ok(Vec::new());
    }

    sync_all(storage, project_id)
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

fn output_matches_content(file_path: &Path, content: &str) -> Result<bool, AppError> {
    match std::fs::read_to_string(file_path) {
        Ok(existing_content) => Ok(existing_content == content),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(error) => Err(AppError::Internal(format!(
            "Failed to read existing output {}: {error}",
            file_path.display()
        ))),
    }
}

fn load_auto_sync_enabled(storage: &StorageManager) -> Result<bool, AppError> {
    let raw = queries::get_setting(&storage.conn, AUTO_SYNC_SETTING_KEY)?;
    Ok(raw.as_deref() != Some("false"))
}

fn load_enabled_targets(storage: &StorageManager) -> Result<Vec<&str>, AppError> {
    let raw = queries::get_setting(&storage.conn, ENABLED_ADAPTERS_SETTING_KEY)?;

    match raw {
        Some(value) => parse_enabled_targets(&value),
        None => Ok(VALID_TARGETS.to_vec()),
    }
}

fn parse_enabled_targets(raw: &str) -> Result<Vec<&'static str>, AppError> {
    let parsed: Value = serde_json::from_str(raw).map_err(|error| {
        AppError::InvalidInput(format!("Invalid enabled_adapters setting: {error}"))
    })?;

    let adapters = parsed.as_array().ok_or_else(|| {
        AppError::InvalidInput("enabled_adapters setting must be a JSON array".into())
    })?;

    let mut enabled = Vec::new();
    for value in adapters {
        let adapter = value.as_str().ok_or_else(|| {
            AppError::InvalidInput("enabled_adapters setting must only contain strings".into())
        })?;

        let normalized = VALID_TARGETS
            .iter()
            .find(|candidate| **candidate == adapter)
            .copied()
            .ok_or_else(|| {
                AppError::InvalidInput(format!(
                    "Unknown adapter in enabled_adapters setting: {adapter}"
                ))
            })?;

        if !enabled.contains(&normalized) {
            enabled.push(normalized);
        }
    }

    Ok(enabled)
}

/// Check whether any existing component in the relative `suffix` path contains a symlink
/// when resolved under `base`.
fn path_contains_symlink_relative(base: &Path, suffix: &Path) -> bool {
    let mut current = base.to_path_buf();
    for component in suffix.components() {
        current.push(component);
        if current.exists() {
            if let Ok(meta) = current.symlink_metadata() {
                if meta.file_type().is_symlink() {
                    return true;
                }
            }
        }
    }
    false
}

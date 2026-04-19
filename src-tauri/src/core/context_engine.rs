//! Context engine.
//!
//! Orchestrates scanning, git analysis, and context assembly into a unified
//! project context. This is the central coordinator for all context operations.

use std::path::Path;
use std::time::Instant;

use chrono::Utc;
use contextbridge_core::{ContextNote, ProjectContext, TechEntry};
use rusqlite::params;

use crate::core::git_analyzer;
use crate::core::project_scanner::{self, ScannedFile};
use crate::db::queries;
use crate::db::StorageManager;
use crate::errors::AppError;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/// Options for context refresh operations.
#[derive(Debug, Clone)]
pub struct RefreshOptions {
    /// Whether to perform git analysis (skip if not a git repo).
    pub include_git: bool,
    /// Maximum number of commits to analyze.
    pub commit_limit: usize,
    /// Whether to compute file content hashes.
    pub compute_hashes: bool,
}

impl Default for RefreshOptions {
    fn default() -> Self {
        Self {
            include_git: true,
            commit_limit: 50,
            compute_hashes: true,
        }
    }
}

/// Result of a context refresh.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ContextRefreshResult {
    /// The project that was refreshed.
    pub project_id: String,
    /// Number of technologies detected.
    pub tech_count: usize,
    /// Number of files discovered.
    pub file_count: usize,
    /// Number of git commits analysed.
    pub commit_count: usize,
    /// Wall-clock scan duration in milliseconds.
    pub scan_duration_ms: u64,
}

// ---------------------------------------------------------------------------
// Config files that trigger full tech re-detection
// ---------------------------------------------------------------------------

const CONFIG_FILES: &[&str] = &[
    "package.json",
    "Cargo.toml",
    "pyproject.toml",
    "go.mod",
    "Gemfile",
    "pubspec.yaml",
    "build.gradle",
    "build.gradle.kts",
    "Dockerfile",
    "docker-compose.yml",
    "tsconfig.json",
    "tailwind.config.js",
    "tailwind.config.ts",
    "vite.config.ts",
    "vite.config.js",
    "webpack.config.js",
    "jest.config.js",
    "vitest.config.ts",
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/// Full context refresh for a project — runs scanner + git analyzer.
///
/// 1. Retrieves the project from the database.
/// 2. Verifies the project path still exists on disk.
/// 3. Runs the project scanner to detect tech stack and files.
/// 4. Optionally runs git analysis if the path is a git repository.
/// 5. Generates auto-context notes (tech summary, architecture).
/// 6. Returns a summary of the refresh.
pub fn refresh_context(
    storage: &StorageManager,
    project_id: &str,
    options: &RefreshOptions,
) -> Result<ContextRefreshResult, AppError> {
    let conn = storage.conn();
    let project = queries::get_project(conn, project_id)?;

    let root = Path::new(&project.root_path);
    if !root.exists() {
        return Err(AppError::InvalidInput(format!(
            "project path no longer exists: {}",
            project.root_path
        )));
    }

    tracing::info!(project_id, path = %project.root_path, "Starting context refresh");
    let start = Instant::now();

    // --- scan project ---
    let scan_result = project_scanner::scan_and_persist(conn, &project)?;

    // --- git analysis ---
    let commit_count = if options.include_git && is_git_repo(root) {
        match git_analyzer::analyze_and_persist(conn, project_id, root) {
            Ok(analysis) => analysis.total_commits,
            Err(e) => {
                tracing::warn!(project_id, error = %e, "Git analysis failed; continuing without it");
                0
            }
        }
    } else {
        tracing::debug!(project_id, "Skipping git analysis");
        0
    };

    // --- auto-generated context notes ---
    let tech_stack = queries::get_tech_stack(conn, project_id)?;
    let tech_note = generate_tech_summary_note(&tech_stack, project_id);
    upsert_auto_note(conn, &tech_note)?;

    let arch_note = generate_architecture_note(&scan_result.files, project_id);
    upsert_auto_note(conn, &arch_note)?;

    let elapsed = start.elapsed();
    let result = ContextRefreshResult {
        project_id: project_id.to_string(),
        tech_count: scan_result.tech_stack.len(),
        file_count: scan_result.total_files,
        commit_count,
        scan_duration_ms: elapsed.as_millis() as u64,
    };

    tracing::info!(
        project_id,
        techs = result.tech_count,
        files = result.file_count,
        commits = result.commit_count,
        duration_ms = result.scan_duration_ms,
        "Context refresh complete"
    );

    Ok(result)
}

/// Partial refresh — only re-scan specific changed paths.
///
/// For each changed path:
/// - If it's a known config file → re-run full tech detection and regenerate
///   the tech summary note.
/// - If it's a source file that still exists → update file entry in the DB.
/// - If the file has been deleted → remove it from `project_files`.
pub fn partial_refresh(
    storage: &StorageManager,
    project_id: &str,
    changed_paths: &[String],
) -> Result<(), AppError> {
    let conn = storage.conn();
    let project = queries::get_project(conn, project_id)?;
    let root = Path::new(&project.root_path);

    if !root.exists() {
        return Err(AppError::InvalidInput(format!(
            "project path no longer exists: {}",
            project.root_path
        )));
    }

    tracing::debug!(
        project_id,
        count = changed_paths.len(),
        "Starting partial refresh"
    );

    let mut config_changed = false;

    for rel_path in changed_paths {
        let file_name = Path::new(rel_path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        if CONFIG_FILES.iter().any(|&cf| cf == file_name) {
            config_changed = true;
        }

        let abs = root.join(rel_path);

        if abs.exists() {
            // File still exists — update its entry.
            let meta = std::fs::metadata(&abs).map_err(|e| {
                AppError::Internal(format!("cannot read metadata for {rel_path}: {e}"))
            })?;
            let size = meta.len() as i64;
            let ext = Path::new(rel_path)
                .extension()
                .map(|e| e.to_string_lossy().to_string())
                .unwrap_or_default();
            let language = detect_language_simple(&ext);
            let file_type = if config_changed && CONFIG_FILES.iter().any(|&cf| cf == file_name) {
                "config".to_string()
            } else {
                classify_simple(&ext)
            };

            let hash = compute_hash_if_small(&abs);

            queries::upsert_file(
                conn,
                project_id,
                rel_path,
                &file_type,
                language.as_deref(),
                size,
                hash.as_deref(),
            )?;
        } else {
            // File was deleted — remove from DB.
            conn.execute(
                "DELETE FROM project_files WHERE project_id = ?1 AND rel_path = ?2",
                params![project_id, rel_path],
            )?;
            tracing::debug!(project_id, path = %rel_path, "Removed deleted file from DB");
        }
    }

    // If any config file changed, re-run tech detection and regenerate note.
    if config_changed {
        tracing::info!(project_id, "Config file changed; re-running tech detection");
        let scan_result = project_scanner::scan_project(root)?;

        // Persist updated tech stack.
        for entry in &scan_result.tech_stack {
            let persisted = TechEntry {
                id: 0,
                project_id: project_id.to_string(),
                category: entry.category.clone(),
                name: entry.name.clone(),
                version: entry.version.clone(),
                confidence: entry.confidence,
                source: entry.source.clone(),
            };
            queries::upsert_tech_stack(conn, &persisted)?;
        }

        let tech_stack = queries::get_tech_stack(conn, project_id)?;
        let note = generate_tech_summary_note(&tech_stack, project_id);
        upsert_auto_note(conn, &note)?;
    }

    Ok(())
}

/// Get the full assembled context for a project (from DB).
pub fn get_assembled_context(
    storage: &StorageManager,
    project_id: &str,
) -> Result<ProjectContext, AppError> {
    queries::assemble_context(storage.conn(), project_id)
}

// ---------------------------------------------------------------------------
// Auto-generated context notes
// ---------------------------------------------------------------------------

/// Generate a human-readable tech summary note from detected tech entries.
fn generate_tech_summary_note(tech_stack: &[TechEntry], project_id: &str) -> ContextNote {
    let now = Utc::now().to_rfc3339();
    let note_id = format!("auto-tech-summary-{project_id}");

    if tech_stack.is_empty() {
        return ContextNote {
            id: note_id,
            project_id: project_id.to_string(),
            category: "tech".into(),
            title: "Tech stack summary".into(),
            content: "No technologies detected.".into(),
            source: "context_engine".into(),
            priority: 8,
            created_at: now.clone(),
            updated_at: now,
        };
    }

    // Group entries by category.
    let mut categories: std::collections::BTreeMap<String, Vec<String>> =
        std::collections::BTreeMap::new();

    for entry in tech_stack {
        let label = if let Some(ref v) = entry.version {
            if v.is_empty() {
                entry.name.clone()
            } else {
                format!("{} {v}", entry.name)
            }
        } else {
            entry.name.clone()
        };
        categories
            .entry(entry.category.clone())
            .or_default()
            .push(label);
    }

    // Build a concise summary string.
    let mut parts: Vec<String> = Vec::new();
    for (cat, names) in &categories {
        let joined = names.join(", ");
        parts.push(format!("{cat}: {joined}"));
    }
    let content = parts.join(". ") + ".";

    // Also build a one-line title.
    let primary_names: Vec<&str> = tech_stack
        .iter()
        .filter(|t| t.confidence >= 80.0)
        .take(4)
        .map(|t| t.name.as_str())
        .collect();
    let title = if primary_names.is_empty() {
        "Tech stack summary".to_string()
    } else {
        format!("Tech stack — {}", primary_names.join(" + "))
    };

    ContextNote {
        id: note_id,
        project_id: project_id.to_string(),
        category: "tech".into(),
        title,
        content,
        source: "context_engine".into(),
        priority: 8,
        created_at: now.clone(),
        updated_at: now,
    }
}

/// Generate an architecture note by analysing directory structure patterns.
fn generate_architecture_note(files: &[ScannedFile], project_id: &str) -> ContextNote {
    let now = Utc::now().to_rfc3339();
    let note_id = format!("auto-architecture-{project_id}");

    let mut patterns: Vec<&str> = Vec::new();

    // Collect unique top-level directories.
    let top_dirs: std::collections::HashSet<String> = files
        .iter()
        .filter_map(|f| f.rel_path.split('/').next().map(String::from))
        .collect();

    // Collect all relative paths for deeper analysis.
    let all_paths: std::collections::HashSet<&str> =
        files.iter().map(|f| f.rel_path.as_str()).collect();

    // Detect monorepo / workspace patterns.
    let cargo_toml_count = files
        .iter()
        .filter(|f| f.rel_path.ends_with("Cargo.toml"))
        .count();
    if cargo_toml_count > 1 {
        patterns.push("Monorepo with Cargo workspace");
    }

    let package_json_dirs: std::collections::HashSet<&str> = files
        .iter()
        .filter(|f| f.rel_path.ends_with("package.json"))
        .filter_map(|f| f.rel_path.rsplit_once('/').map(|(dir, _)| dir))
        .collect();
    if package_json_dirs.len() > 1 {
        patterns.push("Monorepo with multiple package.json workspaces");
    }

    // Frontend-backend split.
    if top_dirs.contains("src") && top_dirs.contains("src-tauri") {
        patterns.push("Frontend-backend split (src/ + src-tauri/)");
    }

    // Standard React patterns.
    let has_components = files
        .iter()
        .any(|f| f.rel_path.starts_with("src/components/"));
    let has_hooks = files.iter().any(|f| f.rel_path.starts_with("src/hooks/"));
    let has_pages = files.iter().any(|f| {
        f.rel_path.starts_with("src/pages/") || f.rel_path.starts_with("src/app/")
    });
    if has_components && (has_hooks || has_pages) {
        patterns.push("Standard React project structure");
    }

    // API / server patterns.
    if top_dirs.contains("api") || top_dirs.contains("server") {
        patterns.push("Dedicated API/server directory");
    }

    // Testing patterns.
    if top_dirs.contains("tests") || top_dirs.contains("__tests__") {
        patterns.push("Dedicated test directory");
    }
    if top_dirs.contains("e2e") || top_dirs.contains("cypress") {
        patterns.push("End-to-end test suite");
    }

    // Documentation.
    if top_dirs.contains("docs") {
        patterns.push("Documentation directory");
    }

    // CI/CD.
    if all_paths.contains(".github/workflows") || files.iter().any(|f| f.rel_path.starts_with(".github/workflows/")) {
        patterns.push("GitHub Actions CI/CD");
    }

    // Docker.
    if files.iter().any(|f| f.rel_path == "Dockerfile" || f.rel_path == "docker-compose.yml") {
        patterns.push("Docker containerisation");
    }

    let content = if patterns.is_empty() {
        "Standard project layout with no distinct architectural patterns detected.".to_string()
    } else {
        patterns.join("\n• ")
    };

    let title = if patterns.is_empty() {
        "Architecture overview".to_string()
    } else {
        format!(
            "Architecture — {} pattern(s) detected",
            patterns.len()
        )
    };

    ContextNote {
        id: note_id,
        project_id: project_id.to_string(),
        category: "architecture".into(),
        title,
        content: if patterns.is_empty() {
            content
        } else {
            format!("Detected patterns:\n• {content}")
        },
        source: "context_engine".into(),
        priority: 7,
        created_at: now.clone(),
        updated_at: now,
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Check if a path is a git repository.
fn is_git_repo(path: &Path) -> bool {
    path.join(".git").exists()
}

/// Insert or replace an auto-generated context note.
///
/// Removes the previous note (by ID) from both `context_notes` and
/// `context_fts`, then inserts the new version.
fn upsert_auto_note(conn: &rusqlite::Connection, note: &ContextNote) -> Result<(), AppError> {
    conn.execute(
        "DELETE FROM context_notes WHERE id = ?1",
        params![note.id],
    )?;
    conn.execute(
        "DELETE FROM context_fts WHERE note_id = ?1",
        params![note.id],
    )?;
    queries::insert_context_note(conn, note)?;
    Ok(())
}

/// Minimal language detection by file extension (used in partial refresh).
fn detect_language_simple(ext: &str) -> Option<String> {
    match ext {
        "rs" => Some("Rust".into()),
        "ts" | "tsx" => Some("TypeScript".into()),
        "js" | "jsx" | "mjs" | "cjs" => Some("JavaScript".into()),
        "py" => Some("Python".into()),
        "go" => Some("Go".into()),
        "rb" => Some("Ruby".into()),
        "java" => Some("Java".into()),
        "kt" | "kts" => Some("Kotlin".into()),
        "swift" => Some("Swift".into()),
        "dart" => Some("Dart".into()),
        "c" | "h" => Some("C".into()),
        "cpp" | "cc" | "cxx" | "hpp" => Some("C++".into()),
        "cs" => Some("C#".into()),
        "html" | "htm" => Some("HTML".into()),
        "css" | "scss" | "sass" | "less" => Some("CSS".into()),
        "json" => Some("JSON".into()),
        "yaml" | "yml" => Some("YAML".into()),
        "toml" => Some("TOML".into()),
        "md" | "mdx" => Some("Markdown".into()),
        "sql" => Some("SQL".into()),
        "sh" | "bash" | "zsh" => Some("Shell".into()),
        _ => None,
    }
}

/// Simple file classification by extension (used in partial refresh).
fn classify_simple(ext: &str) -> String {
    match ext {
        "rs" | "ts" | "tsx" | "js" | "jsx" | "mjs" | "cjs" | "py" | "go" | "rb" | "java"
        | "kt" | "kts" | "swift" | "dart" | "c" | "h" | "cpp" | "cc" | "cs" => {
            "source".into()
        }
        "json" | "yaml" | "yml" | "toml" | "xml" | "ini" | "env" => "config".into(),
        "md" | "mdx" | "txt" | "rst" => "documentation".into(),
        "html" | "htm" | "css" | "scss" | "sass" | "less" => "source".into(),
        "png" | "jpg" | "jpeg" | "gif" | "svg" | "ico" | "webp" => "asset".into(),
        "lock" => "lockfile".into(),
        _ => "other".into(),
    }
}

/// Compute SHA-256 hash for a file if it is under 1 MB.
fn compute_hash_if_small(path: &Path) -> Option<String> {
    use sha2::{Digest, Sha256};

    let meta = std::fs::metadata(path).ok()?;
    if meta.len() > 1_048_576 {
        return None;
    }
    let data = std::fs::read(path).ok()?;
    let hash = Sha256::digest(&data);
    Some(format!("{hash:x}"))
}

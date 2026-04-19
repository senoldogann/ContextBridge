//! Git repository analyzer.
//!
//! Extracts recent changes, branch info, and commit history from git repos
//! using the `git2` crate.

use std::path::Path;

use chrono::{TimeZone, Utc};
use contextbridge_core::{ContextNote, RecentChange};
use git2::{DiffOptions, Repository, StatusOptions};
use rusqlite::Connection;

use crate::db::queries;
use crate::errors::AppError;

/// Result of analyzing a git repository.
pub struct GitAnalysis {
    /// Current branch name, if available.
    pub current_branch: Option<String>,
    /// Remote URL (origin preferred), with credentials stripped.
    pub remote_url: Option<String>,
    /// Recent commits extracted from the log.
    pub recent_commits: Vec<RecentChange>,
    /// Whether the working tree has uncommitted changes.
    pub is_dirty: bool,
    /// Total number of commits walked (up to `limit`).
    pub total_commits: usize,
}

/// Analyze the git repository at the given path.
///
/// Opens the repository, reads branch / remote metadata, walks the commit log
/// up to `limit` entries, and checks the dirty state.
pub fn analyze_git_repo(
    repo_path: &Path,
    project_id: &str,
    limit: usize,
) -> Result<GitAnalysis, AppError> {
    let repo = Repository::open(repo_path).map_err(|e| {
        if e.code() == git2::ErrorCode::NotFound {
            AppError::Internal("Not a git repository".into())
        } else {
            AppError::Internal(e.to_string())
        }
    })?;

    // --- branch ---
    let current_branch = match repo.head() {
        Ok(head) => head.shorthand().map(String::from),
        Err(e) if e.code() == git2::ErrorCode::UnbornBranch => None,
        Err(e) => return Err(AppError::Internal(e.to_string())),
    };

    // --- remote URL ---
    let remote_url = detect_remote_url(&repo);

    // --- dirty state ---
    let is_dirty = check_dirty(&repo);

    // --- commit log ---
    let (recent_commits, total_commits) =
        collect_commits(&repo, project_id, limit);

    tracing::info!(
        project_id,
        branch = ?current_branch,
        commits = total_commits,
        dirty = is_dirty,
        "Git analysis complete"
    );

    Ok(GitAnalysis {
        current_branch,
        remote_url,
        recent_commits,
        is_dirty,
        total_commits,
    })
}

/// Analyze and persist results to the database.
///
/// Clears existing `recent_changes` for the project, inserts fresh commit
/// records, and writes a summary context note.
pub fn analyze_and_persist(
    conn: &Connection,
    project_id: &str,
    repo_path: &Path,
) -> Result<GitAnalysis, AppError> {
    let analysis = analyze_git_repo(repo_path, project_id, 50)?;

    // Clear previous recent_changes for this project.
    conn.execute(
        "DELETE FROM recent_changes WHERE project_id = ?1",
        rusqlite::params![project_id],
    )?;

    // Persist each commit.
    for change in &analysis.recent_commits {
        queries::insert_recent_change(conn, change)?;
    }

    // Build a context note summarising the git state.
    let branch_label = analysis
        .current_branch
        .as_deref()
        .unwrap_or("(detached)");
    let now = Utc::now().to_rfc3339();
    let note_id = format!("git-summary-{project_id}");

    let summary_content = format!(
        "Branch: {branch}\nRemote: {remote}\nTotal commits analysed: {total}\nDirty: {dirty}",
        branch = branch_label,
        remote = analysis.remote_url.as_deref().unwrap_or("none"),
        total = analysis.total_commits,
        dirty = analysis.is_dirty,
    );

    // Remove any previous git-summary note, then insert the new one.
    conn.execute(
        "DELETE FROM context_notes WHERE id = ?1",
        rusqlite::params![note_id],
    )?;
    conn.execute(
        "DELETE FROM context_fts WHERE note_id = ?1",
        rusqlite::params![note_id],
    )?;

    let note = ContextNote {
        id: note_id,
        project_id: project_id.to_string(),
        category: "git".into(),
        title: format!("Git summary — {branch_label}"),
        content: summary_content,
        source: "git_analyzer".into(),
        priority: 5,
        created_at: now.clone(),
        updated_at: now,
    };
    queries::insert_context_note(conn, &note)?;

    tracing::info!(project_id, "Git analysis persisted");

    Ok(analysis)
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Detect the remote URL, preferring `origin`.
/// Strips embedded credentials (user:pass@) from the URL.
fn detect_remote_url(repo: &Repository) -> Option<String> {
    let url = repo
        .find_remote("origin")
        .ok()
        .and_then(|r| r.url().map(String::from))
        .or_else(|| {
            repo.remotes()
                .ok()
                .and_then(|names| {
                    names.iter().flatten().next().map(String::from)
                })
                .and_then(|name| {
                    repo.find_remote(&name)
                        .ok()
                        .and_then(|r| r.url().map(String::from))
                })
        });

    url.map(|u| strip_credentials(&u))
}

/// Remove `user:password@` from a URL.
fn strip_credentials(url: &str) -> String {
    // Handles both https://user:pass@host/... and ssh://user@host/...
    if let Some(scheme_end) = url.find("://") {
        let after_scheme = &url[scheme_end + 3..];
        if let Some(at_pos) = after_scheme.find('@') {
            // Only strip if the '@' appears before the first '/' (i.e. it's
            // in the authority portion, not part of a path).
            let slash_pos = after_scheme.find('/').unwrap_or(after_scheme.len());
            if at_pos < slash_pos {
                return format!("{}{}", &url[..scheme_end + 3], &after_scheme[at_pos + 1..]);
            }
        }
    }
    url.to_string()
}

/// Return `true` if the working directory has any uncommitted changes.
fn check_dirty(repo: &Repository) -> bool {
    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(false);

    repo.statuses(Some(&mut opts))
        .map(|s| !s.is_empty())
        .unwrap_or(false)
}

/// Walk commits and build `RecentChange` entries.
///
/// Returns `(changes, count)` where `count` is the number of commits
/// successfully parsed (capped at `limit`).
fn collect_commits(
    repo: &Repository,
    project_id: &str,
    limit: usize,
) -> (Vec<RecentChange>, usize) {
    let mut changes = Vec::with_capacity(limit);

    let mut revwalk = match repo.revwalk() {
        Ok(rw) => rw,
        Err(e) => {
            tracing::debug!("Cannot start revwalk: {e}");
            return (changes, 0);
        }
    };

    if revwalk.push_head().is_err() {
        // Unborn HEAD — no commits yet.
        return (changes, 0);
    }
    revwalk.set_sorting(git2::Sort::TIME).ok();

    for oid_result in revwalk {
        if changes.len() >= limit {
            break;
        }

        let oid = match oid_result {
            Ok(o) => o,
            Err(e) => {
                tracing::debug!("Revwalk error: {e}");
                continue;
            }
        };

        let commit = match repo.find_commit(oid) {
            Ok(c) => c,
            Err(e) => {
                tracing::debug!("Cannot read commit {oid}: {e}");
                continue;
            }
        };

        let summary = commit
            .summary()
            .unwrap_or_default()
            .to_string();

        let author = commit.author().name().map(String::from);

        let time = commit.time();
        let timestamp = Utc
            .timestamp_opt(time.seconds(), 0)
            .single()
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_default();

        let commit_hash = oid.to_string();

        let files = changed_files(repo, &commit);

        changes.push(RecentChange {
            id: 0, // auto-assigned by DB
            project_id: project_id.to_string(),
            change_type: "commit".into(),
            summary,
            files,
            author,
            timestamp,
            commit_hash: Some(commit_hash),
        });
    }

    let total = changes.len();
    (changes, total)
}

/// Compute the list of changed files for a commit as a comma-separated string.
///
/// For merge commits, diffs against the first parent.
/// For initial commits (no parent), diffs against an empty tree.
fn changed_files(repo: &Repository, commit: &git2::Commit<'_>) -> String {
    let commit_tree = match commit.tree() {
        Ok(t) => t,
        Err(_) => return String::new(),
    };

    let parent_tree = if commit.parent_count() > 0 {
        commit
            .parent(0)
            .ok()
            .and_then(|p| p.tree().ok())
    } else {
        None // initial commit — diff against empty tree
    };

    let mut diff_opts = DiffOptions::new();
    let diff = repo.diff_tree_to_tree(
        parent_tree.as_ref(),
        Some(&commit_tree),
        Some(&mut diff_opts),
    );

    match diff {
        Ok(d) => {
            let mut paths: Vec<String> = Vec::new();
            d.deltas().for_each(|delta| {
                if let Some(p) = delta.new_file().path().and_then(|p| p.to_str()) {
                    paths.push(p.to_string());
                } else if let Some(p) = delta.old_file().path().and_then(|p| p.to_str()) {
                    paths.push(p.to_string());
                }
            });
            paths.join(",")
        }
        Err(e) => {
            tracing::debug!("Diff error for {}: {e}", commit.id());
            String::new()
        }
    }
}

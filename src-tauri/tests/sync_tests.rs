//! Integration tests for Phase 3 sync engine.

use contextbridge_core::{ContextNote, RecentChange, TechEntry};
use contextbridge_lib::db::models::Project;
use contextbridge_lib::db::{queries, StorageManager};
use tempfile::TempDir;

/// Helper: create an in-memory DB with a project pointing at `dir`.
fn setup_test_project() -> (StorageManager, TempDir, String) {
    let storage = StorageManager::in_memory().unwrap();
    let dir = TempDir::new().unwrap();
    let project_id = "sync-test-1".to_string();
    let now = "2026-01-01T00:00:00Z";

    let project = Project {
        id: project_id.clone(),
        name: "SyncTest".into(),
        root_path: dir.path().to_string_lossy().to_string(),
        created_at: now.into(),
        updated_at: now.into(),
    };
    queries::insert_project(&storage.conn, &project).unwrap();

    // Add a tech entry so formatters produce meaningful content
    let tech = TechEntry {
        id: 0,
        project_id: project_id.clone(),
        category: "language".into(),
        name: "Rust".into(),
        version: Some("1.78".into()),
        confidence: 0.95,
        source: "Cargo.toml".into(),
    };
    queries::upsert_tech_stack(&storage.conn, &tech).unwrap();

    // Add a context note
    let note = ContextNote {
        id: "sn1".into(),
        project_id: project_id.clone(),
        category: "conventions".into(),
        title: "Naming".into(),
        content: "Use snake_case.".into(),
        source: "auto".into(),
        priority: 1,
        created_at: now.into(),
        updated_at: now.into(),
    };
    queries::insert_context_note(&storage.conn, &note).unwrap();

    // Add a recent change
    let change = RecentChange {
        id: 0,
        project_id: project_id.clone(),
        change_type: "commit".into(),
        summary: "initial commit".into(),
        files: "src/main.rs".into(),
        author: Some("dev".into()),
        timestamp: now.into(),
        commit_hash: Some("abc1234567890".into()),
    };
    queries::insert_recent_change(&storage.conn, &change).unwrap();

    (storage, dir, project_id)
}

// ---------------------------------------------------------------------------
// Per-target sync tests
// ---------------------------------------------------------------------------

#[test]
fn test_sync_to_claude() {
    let (storage, dir, pid) = setup_test_project();

    let result =
        contextbridge_lib::core::sync::sync_to_tool(&storage, &pid, "claude").unwrap();

    assert!(result.written, "first sync should write");
    assert_eq!(result.target, "claude");

    let path = dir.path().join("CLAUDE.md");
    assert!(path.exists(), "CLAUDE.md should exist");

    let content = std::fs::read_to_string(&path).unwrap();
    assert!(
        content.starts_with("# SyncTest"),
        "CLAUDE.md should start with project name header"
    );
}

#[test]
fn test_sync_to_cursor() {
    let (storage, dir, pid) = setup_test_project();

    let result =
        contextbridge_lib::core::sync::sync_to_tool(&storage, &pid, "cursor").unwrap();

    assert!(result.written);
    assert_eq!(result.target, "cursor");

    let path = dir.path().join(".cursor/rules/contextbridge.mdc");
    assert!(path.exists(), "contextbridge.mdc should exist");

    let content = std::fs::read_to_string(&path).unwrap();
    assert!(
        content.starts_with("---"),
        "Cursor output should start with frontmatter ---"
    );
}

#[test]
fn test_sync_to_copilot() {
    let (storage, dir, pid) = setup_test_project();

    let result =
        contextbridge_lib::core::sync::sync_to_tool(&storage, &pid, "copilot").unwrap();

    assert!(result.written);
    assert_eq!(result.target, "copilot");

    let path = dir.path().join(".github/copilot-instructions.md");
    assert!(path.exists(), "copilot-instructions.md should exist");
}

#[test]
fn test_sync_to_codex() {
    let (storage, dir, pid) = setup_test_project();

    let result =
        contextbridge_lib::core::sync::sync_to_tool(&storage, &pid, "codex").unwrap();

    assert!(result.written);
    assert_eq!(result.target, "codex");

    let path = dir.path().join("AGENTS.md");
    assert!(path.exists(), "AGENTS.md should exist");
}

// ---------------------------------------------------------------------------
// Content-hash deduplication
// ---------------------------------------------------------------------------

#[test]
fn test_sync_content_hash_skip() {
    let (storage, _dir, pid) = setup_test_project();

    let first =
        contextbridge_lib::core::sync::sync_to_tool(&storage, &pid, "claude").unwrap();
    assert!(first.written, "first sync should write");

    let second =
        contextbridge_lib::core::sync::sync_to_tool(&storage, &pid, "claude").unwrap();
    assert!(
        !second.written,
        "second sync with unchanged content should skip"
    );
    assert_eq!(first.content_hash, second.content_hash);
}

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

#[test]
fn test_sync_invalid_target() {
    let (storage, _dir, pid) = setup_test_project();

    let result = contextbridge_lib::core::sync::sync_to_tool(&storage, &pid, "invalid");
    assert!(result.is_err(), "invalid target should return an error");

    let err_msg = result.unwrap_err().to_string();
    assert!(
        err_msg.contains("Unknown sync target"),
        "error should mention unknown target, got: {err_msg}"
    );
}

// ---------------------------------------------------------------------------
// Sync all
// ---------------------------------------------------------------------------

#[test]
fn test_sync_all() {
    let (storage, _dir, pid) = setup_test_project();

    let results =
        contextbridge_lib::core::sync::sync_all(&storage, &pid).unwrap();

    assert_eq!(results.len(), 4, "sync_all should produce 4 results");

    let targets: Vec<&str> = results.iter().map(|r| r.target.as_str()).collect();
    assert!(targets.contains(&"claude"), "missing claude target");
    assert!(targets.contains(&"cursor"), "missing cursor target");
    assert!(targets.contains(&"copilot"), "missing copilot target");
    assert!(targets.contains(&"codex"), "missing codex target");

    for r in &results {
        assert!(r.written, "all first syncs should write");
    }
}

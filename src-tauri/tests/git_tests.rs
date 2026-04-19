use std::fs;
use tempfile::TempDir;

/// Initialise a test git repository with two commits.
fn init_test_repo(dir: &std::path::Path) {
    let repo = git2::Repository::init(dir).unwrap();

    // First commit
    fs::write(dir.join("README.md"), "# Test Project").unwrap();

    let mut index = repo.index().unwrap();
    index.add_path(std::path::Path::new("README.md")).unwrap();
    index.write().unwrap();
    let tree_id = index.write_tree().unwrap();
    let tree = repo.find_tree(tree_id).unwrap();

    let sig = git2::Signature::now("Test Author", "test@example.com").unwrap();
    repo.commit(Some("HEAD"), &sig, &sig, "Initial commit", &tree, &[])
        .unwrap();

    // Second commit
    fs::write(dir.join("src.rs"), "fn main() {}").unwrap();
    let mut index = repo.index().unwrap();
    index.add_path(std::path::Path::new("src.rs")).unwrap();
    index.write().unwrap();
    let tree_id = index.write_tree().unwrap();
    let tree = repo.find_tree(tree_id).unwrap();
    let head = repo.head().unwrap().peel_to_commit().unwrap();
    repo.commit(Some("HEAD"), &sig, &sig, "Add source file", &tree, &[&head])
        .unwrap();
}

#[test]
fn test_analyze_git_repo() {
    let dir = TempDir::new().unwrap();
    init_test_repo(dir.path());

    let result =
        contextbridge_lib::engine::git_analyzer::analyze_git_repo(dir.path(), "test-proj", 50)
            .unwrap();

    // Should detect a branch
    assert!(
        result.current_branch.is_some(),
        "Expected a current branch to be detected"
    );
    // Should find 2 commits
    assert_eq!(result.recent_commits.len(), 2, "Expected 2 commits");
    // Most recent commit first
    assert!(
        result.recent_commits[0].summary.contains("Add source file"),
        "Expected most recent commit first, got: {}",
        result.recent_commits[0].summary
    );
    // Should not be dirty (we committed everything)
    assert!(!result.is_dirty, "Repo should not be dirty");
}

#[test]
fn test_analyze_dirty_repo() {
    let dir = TempDir::new().unwrap();
    init_test_repo(dir.path());

    // Create an untracked file to make it dirty
    fs::write(dir.path().join("untracked.txt"), "dirty").unwrap();

    let result =
        contextbridge_lib::engine::git_analyzer::analyze_git_repo(dir.path(), "test-proj", 50)
            .unwrap();
    assert!(
        result.is_dirty,
        "Repo should be dirty after adding untracked file"
    );
}

#[test]
fn test_analyze_and_persist() {
    let dir = TempDir::new().unwrap();
    init_test_repo(dir.path());

    let sm = contextbridge_lib::db::StorageManager::in_memory().unwrap();
    let project = contextbridge_lib::db::models::Project {
        id: "git-test".to_string(),
        name: "Git Test".to_string(),
        root_path: dir.path().to_string_lossy().to_string(),
        created_at: "2025-01-01T00:00:00Z".to_string(),
        updated_at: "2025-01-01T00:00:00Z".to_string(),
    };
    contextbridge_lib::db::queries::insert_project(sm.conn(), &project).unwrap();

    let result = contextbridge_lib::engine::git_analyzer::analyze_and_persist(
        sm.conn(),
        "git-test",
        dir.path(),
    )
    .unwrap();
    assert_eq!(result.recent_commits.len(), 2);

    // Verify persisted
    let changes =
        contextbridge_lib::db::queries::list_recent_changes(sm.conn(), "git-test", 50).unwrap();
    assert_eq!(changes.len(), 2, "Expected 2 persisted recent changes");
}

#[test]
fn test_not_a_git_repo() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("file.txt"), "not a repo").unwrap();

    let result = contextbridge_lib::engine::git_analyzer::analyze_git_repo(dir.path(), "test", 50);
    assert!(result.is_err(), "Should fail for a non-git directory");
}

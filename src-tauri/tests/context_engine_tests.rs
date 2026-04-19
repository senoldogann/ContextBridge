use std::fs;
use tempfile::TempDir;

/// Create a realistic project with a git repo, package.json, and source files.
fn create_full_project(dir: &std::path::Path) {
    fs::write(
        dir.join("package.json"),
        r#"{
        "name": "full-test",
        "dependencies": { "react": "^19.0.0" },
        "devDependencies": { "typescript": "^5.7.0" }
    }"#,
    )
    .unwrap();
    fs::write(dir.join("tsconfig.json"), "{}").unwrap();
    fs::create_dir_all(dir.join("src/components")).unwrap();
    fs::write(dir.join("src/App.tsx"), "export default function App() {}").unwrap();
    fs::write(
        dir.join("src/components/Button.tsx"),
        "export function Button() {}",
    )
    .unwrap();

    // Init git repo and make an initial commit
    let repo = git2::Repository::init(dir).unwrap();
    let mut index = repo.index().unwrap();
    index
        .add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)
        .unwrap();
    index.write().unwrap();
    let tree_id = index.write_tree().unwrap();
    let tree = repo.find_tree(tree_id).unwrap();
    let sig = git2::Signature::now("Dev", "dev@test.com").unwrap();
    repo.commit(Some("HEAD"), &sig, &sig, "Initial setup", &tree, &[])
        .unwrap();
}

#[test]
fn test_full_context_refresh() {
    let dir = TempDir::new().unwrap();
    create_full_project(dir.path());

    let sm = contextbridge_lib::db::StorageManager::in_memory().unwrap();
    let project = contextbridge_lib::db::models::Project {
        id: "full-test".to_string(),
        name: "Full Test".to_string(),
        root_path: dir.path().to_string_lossy().to_string(),
        created_at: "2025-01-01T00:00:00Z".to_string(),
        updated_at: "2025-01-01T00:00:00Z".to_string(),
    };
    contextbridge_lib::db::queries::insert_project(sm.conn(), &project).unwrap();

    let options = contextbridge_lib::engine::context_engine::RefreshOptions::default();
    let result =
        contextbridge_lib::engine::context_engine::refresh_context(&sm, "full-test", &options)
            .unwrap();

    assert!(result.tech_count > 0, "Should have detected tech");
    assert!(result.file_count > 0, "Should have found files");
    assert!(result.commit_count > 0, "Should have found git commits");
    assert!(
        result.scan_duration_ms < 10_000,
        "Should have completed within 10s, took {}ms",
        result.scan_duration_ms
    );
}

#[test]
fn test_context_refresh_generates_notes() {
    let dir = TempDir::new().unwrap();
    create_full_project(dir.path());

    let sm = contextbridge_lib::db::StorageManager::in_memory().unwrap();
    let project = contextbridge_lib::db::models::Project {
        id: "notes-test".to_string(),
        name: "Notes Test".to_string(),
        root_path: dir.path().to_string_lossy().to_string(),
        created_at: "2025-01-01T00:00:00Z".to_string(),
        updated_at: "2025-01-01T00:00:00Z".to_string(),
    };
    contextbridge_lib::db::queries::insert_project(sm.conn(), &project).unwrap();

    let options = contextbridge_lib::engine::context_engine::RefreshOptions::default();
    contextbridge_lib::engine::context_engine::refresh_context(&sm, "notes-test", &options)
        .unwrap();

    // Should have auto-generated context notes
    let notes =
        contextbridge_lib::db::queries::list_context_notes(sm.conn(), "notes-test", None).unwrap();
    assert!(
        !notes.is_empty(),
        "Should have generated at least one context note"
    );

    // Should have a tech summary note
    let has_tech_note = notes
        .iter()
        .any(|n| n.category == "tech" || n.title.contains("Tech"));
    assert!(has_tech_note, "Should have a tech summary note");
}

#[test]
fn test_context_refresh_missing_path() {
    let sm = contextbridge_lib::db::StorageManager::in_memory().unwrap();
    let project = contextbridge_lib::db::models::Project {
        id: "missing-path".to_string(),
        name: "Missing Path".to_string(),
        root_path: "/nonexistent/path/that/does/not/exist/12345".to_string(),
        created_at: "2025-01-01T00:00:00Z".to_string(),
        updated_at: "2025-01-01T00:00:00Z".to_string(),
    };
    contextbridge_lib::db::queries::insert_project(sm.conn(), &project).unwrap();

    let options = contextbridge_lib::engine::context_engine::RefreshOptions::default();
    let result =
        contextbridge_lib::engine::context_engine::refresh_context(&sm, "missing-path", &options);
    assert!(
        result.is_err(),
        "Should fail when project path doesn't exist"
    );
}

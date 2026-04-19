use std::fs;
use tempfile::TempDir;

#[test]
fn test_scan_rust_project() {
    let dir = TempDir::new().unwrap();
    fs::write(
        dir.path().join("Cargo.toml"),
        r#"
[package]
name = "test-proj"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = "1"
tokio = "1"
"#,
    )
    .unwrap();
    fs::create_dir_all(dir.path().join("src")).unwrap();
    fs::write(dir.path().join("src/main.rs"), "fn main() {}").unwrap();
    fs::write(dir.path().join("src/lib.rs"), "// lib").unwrap();
    fs::write(dir.path().join("README.md"), "# Test").unwrap();

    let result = contextbridge_lib::core::project_scanner::scan_project(dir.path()).unwrap();

    // Should detect Rust
    assert!(
        result.tech_stack.iter().any(|t| t.name == "Rust"),
        "Expected Rust in tech stack, got: {:?}",
        result
            .tech_stack
            .iter()
            .map(|t| &t.name)
            .collect::<Vec<_>>()
    );
    // Should find at least 3 files
    assert!(
        result.files.len() >= 3,
        "Expected >= 3 files, got {}",
        result.files.len()
    );
    // Total count should match files vec length
    assert_eq!(result.total_files, result.files.len());
}

#[test]
fn test_scan_node_project() {
    let dir = TempDir::new().unwrap();
    fs::write(
        dir.path().join("package.json"),
        r#"{
        "name": "test-app",
        "version": "1.0.0",
        "dependencies": {
            "react": "^19.0.0",
            "next": "^15.0.0"
        },
        "devDependencies": {
            "typescript": "^5.7.0"
        }
    }"#,
    )
    .unwrap();
    fs::write(dir.path().join("tsconfig.json"), "{}").unwrap();
    fs::create_dir_all(dir.path().join("src")).unwrap();
    fs::write(
        dir.path().join("src/index.tsx"),
        "export default function App() {}",
    )
    .unwrap();

    let result = contextbridge_lib::core::project_scanner::scan_project(dir.path()).unwrap();

    let names: Vec<&str> = result.tech_stack.iter().map(|t| t.name.as_str()).collect();
    assert!(
        names.contains(&"TypeScript"),
        "Expected TypeScript in {names:?}"
    );
    assert!(names.contains(&"React"), "Expected React in {names:?}");
}

#[test]
fn test_scan_ignores_node_modules() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("package.json"), r#"{"name":"test"}"#).unwrap();
    fs::create_dir_all(dir.path().join("node_modules/react")).unwrap();
    fs::write(dir.path().join("node_modules/react/index.js"), "// react").unwrap();
    fs::create_dir_all(dir.path().join("src")).unwrap();
    fs::write(dir.path().join("src/app.js"), "// app").unwrap();

    let result = contextbridge_lib::core::project_scanner::scan_project(dir.path()).unwrap();

    assert!(
        !result
            .files
            .iter()
            .any(|f| f.rel_path.contains("node_modules")),
        "node_modules files should not appear in scan results"
    );
}

#[test]
fn test_scan_and_persist() {
    let dir = TempDir::new().unwrap();
    fs::write(
        dir.path().join("Cargo.toml"),
        r#"
[package]
name = "persist-test"
edition = "2021"
"#,
    )
    .unwrap();
    fs::create_dir_all(dir.path().join("src")).unwrap();
    fs::write(dir.path().join("src/main.rs"), "fn main() {}").unwrap();

    let sm = contextbridge_lib::db::StorageManager::in_memory().unwrap();
    let project = contextbridge_lib::db::models::Project {
        id: "test-scan".to_string(),
        name: "Scan Test".to_string(),
        root_path: dir.path().to_string_lossy().to_string(),
        created_at: "2025-01-01T00:00:00Z".to_string(),
        updated_at: "2025-01-01T00:00:00Z".to_string(),
    };
    contextbridge_lib::db::queries::insert_project(&sm.conn, &project).unwrap();

    let result =
        contextbridge_lib::core::project_scanner::scan_and_persist(&sm.conn, &project).unwrap();

    assert!(
        result.tech_stack.iter().any(|t| t.name == "Rust"),
        "Expected Rust in tech stack"
    );

    // Verify data was persisted
    let tech = contextbridge_lib::db::queries::get_tech_stack(&sm.conn, "test-scan").unwrap();
    assert!(!tech.is_empty(), "Tech stack should have been persisted");
}

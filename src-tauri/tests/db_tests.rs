//! Integration tests for the database layer.

use contextbridge_core::{ContextNote, Project, TechEntry};

/// Helper: build a StorageManager backed by an in-memory DB.
fn setup_db() -> contextbridge_lib::db::StorageManager {
    contextbridge_lib::db::StorageManager::in_memory().unwrap()
}

#[test]
fn test_create_and_list_projects() {
    let sm = setup_db();
    let conn = &sm.conn;

    let project = Project {
        id: "p1".to_string(),
        name: "My Project".to_string(),
        root_path: "/tmp/my-project".to_string(),
        created_at: "2025-01-01T00:00:00Z".to_string(),
        updated_at: "2025-01-01T00:00:00Z".to_string(),
    };

    contextbridge_lib::db::queries::insert_project(conn, &project).unwrap();

    let projects = contextbridge_lib::db::queries::list_projects(conn).unwrap();
    assert_eq!(projects.len(), 1);
    assert_eq!(projects[0].name, "My Project");
    assert_eq!(projects[0].root_path, "/tmp/my-project");
}

#[test]
fn test_insert_and_query_tech_stack() {
    let sm = setup_db();
    let conn = &sm.conn;

    // Insert a project first
    let project = Project {
        id: "p2".to_string(),
        name: "Tech Project".to_string(),
        root_path: "/tmp/tech-project".to_string(),
        created_at: "2025-01-01T00:00:00Z".to_string(),
        updated_at: "2025-01-01T00:00:00Z".to_string(),
    };
    contextbridge_lib::db::queries::insert_project(conn, &project).unwrap();

    let entry = TechEntry {
        id: 0,
        project_id: "p2".to_string(),
        category: "language".to_string(),
        name: "Rust".to_string(),
        version: Some("1.80".to_string()),
        confidence: 0.95,
        source: "Cargo.toml".to_string(),
    };
    contextbridge_lib::db::queries::upsert_tech_stack(conn, &entry).unwrap();

    let stack = contextbridge_lib::db::queries::get_tech_stack(conn, "p2").unwrap();
    assert_eq!(stack.len(), 1);
    assert_eq!(stack[0].name, "Rust");
    assert_eq!(stack[0].version.as_deref(), Some("1.80"));
}

#[test]
fn test_assemble_context() {
    let sm = setup_db();
    let conn = &sm.conn;

    // Insert project
    let project = Project {
        id: "p3".to_string(),
        name: "Context Project".to_string(),
        root_path: "/tmp/context-project".to_string(),
        created_at: "2025-01-01T00:00:00Z".to_string(),
        updated_at: "2025-01-01T00:00:00Z".to_string(),
    };
    contextbridge_lib::db::queries::insert_project(conn, &project).unwrap();

    // Insert tech stack
    let entry = TechEntry {
        id: 0,
        project_id: "p3".to_string(),
        category: "framework".to_string(),
        name: "Tauri".to_string(),
        version: Some("2.0".to_string()),
        confidence: 1.0,
        source: "Cargo.toml".to_string(),
    };
    contextbridge_lib::db::queries::upsert_tech_stack(conn, &entry).unwrap();

    // Insert context note
    let note = ContextNote {
        id: "n1".to_string(),
        project_id: "p3".to_string(),
        category: "architecture".to_string(),
        title: "Design Decision".to_string(),
        content: "Using SQLite with FTS5 for search".to_string(),
        source: "manual".to_string(),
        priority: 1,
        created_at: "2025-01-01T00:00:00Z".to_string(),
        updated_at: "2025-01-01T00:00:00Z".to_string(),
    };
    contextbridge_lib::db::queries::insert_context_note(conn, &note).unwrap();

    // Assemble
    let ctx = contextbridge_lib::db::queries::assemble_context(conn, "p3").unwrap();
    assert_eq!(ctx.project.name, "Context Project");
    assert_eq!(ctx.tech_stack.len(), 1);
    assert_eq!(ctx.notes.len(), 1);
    assert_eq!(ctx.notes[0].title, "Design Decision");
    assert!(ctx.recent_changes.is_empty());
}

//! Integration tests for Phase 3 AI tool output formatters.

use contextbridge_core::*;
use contextbridge_lib::output::{generate_build_commands, generate_globs_from_tech};

/// Helper: build a realistic [`ProjectContext`] for formatter tests.
fn test_context() -> ProjectContext {
    ProjectContext {
        project: Project {
            id: "test-123".into(),
            name: "TestProject".into(),
            root_path: "/tmp/test-project".into(),
            created_at: "2026-01-01T00:00:00Z".into(),
            updated_at: "2026-01-01T00:00:00Z".into(),
        },
        tech_stack: vec![
            TechEntry {
                id: 1,
                project_id: "test-123".into(),
                category: "language".into(),
                name: "Rust".into(),
                version: Some("1.78".into()),
                confidence: 0.95,
                source: "Cargo.toml".into(),
            },
            TechEntry {
                id: 2,
                project_id: "test-123".into(),
                category: "language".into(),
                name: "TypeScript".into(),
                version: Some("5.7".into()),
                confidence: 0.90,
                source: "tsconfig.json".into(),
            },
            TechEntry {
                id: 3,
                project_id: "test-123".into(),
                category: "framework".into(),
                name: "Tauri".into(),
                version: Some("2.0".into()),
                confidence: 0.99,
                source: "Cargo.toml".into(),
            },
        ],
        notes: vec![
            ContextNote {
                id: "n1".into(),
                project_id: "test-123".into(),
                category: "conventions".into(),
                title: "Code Style".into(),
                content: "Use snake_case for Rust, camelCase for TypeScript.".into(),
                source: "auto".into(),
                priority: 1,
                created_at: "2026-01-01T00:00:00Z".into(),
                updated_at: "2026-01-01T00:00:00Z".into(),
            },
            ContextNote {
                id: "n2".into(),
                project_id: "test-123".into(),
                category: "architecture".into(),
                title: "Module Layout".into(),
                content: "commands/ → core/ → db/ → output/".into(),
                source: "auto".into(),
                priority: 2,
                created_at: "2026-01-01T00:00:00Z".into(),
                updated_at: "2026-01-01T00:00:00Z".into(),
            },
        ],
        recent_changes: vec![RecentChange {
            id: 1,
            project_id: "test-123".into(),
            change_type: "commit".into(),
            summary: "feat: add formatters".into(),
            files: "src/output".into(),
            author: Some("dev".into()),
            timestamp: "2026-01-01T00:00:00Z".into(),
            commit_hash: Some("abc1234567890".into()),
        }],
        sync_state: vec![],
    }
}

// ---------------------------------------------------------------------------
// Claude formatter
// ---------------------------------------------------------------------------

#[test]
fn test_claude_formatter_structure() {
    use contextbridge_lib::output::claude::ClaudeFormatter;

    let ctx = test_context();
    let output = ClaudeFormatter.format(&ctx).unwrap();

    assert!(output.contains("# TestProject"), "missing project header");
    assert!(output.contains("## Overview"), "missing Overview section");
    assert!(
        output.contains("## Tech Stack"),
        "missing Tech Stack section"
    );
    assert!(output.contains("| Name |"), "missing tech table headers");
    assert!(output.contains("Rust"), "missing Rust in tech table");
    assert!(
        output.contains("TypeScript"),
        "missing TypeScript in tech table"
    );
    assert!(
        output.contains("## Build & Run"),
        "missing Build & Run section"
    );
    assert!(
        output.contains("cargo build"),
        "missing cargo build command"
    );
    assert!(
        output.contains("## Coding Conventions"),
        "missing Coding Conventions section"
    );
    assert!(
        output.contains("Code Style"),
        "missing Code Style note title"
    );
    assert!(
        output.contains("## Architecture"),
        "missing Architecture section"
    );
    assert!(
        output.contains("Module Layout"),
        "missing Module Layout note title"
    );
    assert!(
        output.contains("## Recent Changes"),
        "missing Recent Changes section"
    );
    assert!(
        output.contains("abc1234"),
        "missing short commit hash abc1234"
    );
}

#[test]
fn test_claude_formatter_empty_context() {
    use contextbridge_lib::output::claude::ClaudeFormatter;

    let ctx = ProjectContext {
        project: Project {
            id: "empty".into(),
            name: "EmptyProject".into(),
            root_path: "/tmp/empty".into(),
            created_at: "2026-01-01T00:00:00Z".into(),
            updated_at: "2026-01-01T00:00:00Z".into(),
        },
        tech_stack: vec![],
        notes: vec![],
        recent_changes: vec![],
        sync_state: vec![],
    };

    let output = ClaudeFormatter.format(&ctx).unwrap();

    assert!(
        output.contains("# EmptyProject"),
        "missing project name header"
    );
    // Empty sections should be omitted
    assert!(
        !output.contains("## Overview"),
        "Overview should be omitted when tech is empty"
    );
    assert!(
        !output.contains("## Tech Stack"),
        "Tech Stack should be omitted when empty"
    );
    assert!(
        !output.contains("## Recent Changes"),
        "Recent Changes should be omitted when empty"
    );
}

// ---------------------------------------------------------------------------
// Cursor formatter
// ---------------------------------------------------------------------------

#[test]
fn test_cursor_formatter_mdc_frontmatter() {
    use contextbridge_lib::output::cursor::CursorFormatter;

    let ctx = test_context();
    let output = CursorFormatter.format(&ctx).unwrap();

    assert!(output.starts_with("---"), "should start with frontmatter");
    assert!(output.contains("description:"), "missing description field");
    assert!(
        output.contains("TestProject"),
        "description should mention project name"
    );
    assert!(output.contains("globs:"), "missing globs field");
    assert!(output.contains("**/*.rs"), "missing Rust glob");
    assert!(output.contains("**/*.ts"), "missing TypeScript glob");
    assert!(
        output.contains("alwaysApply: true"),
        "missing alwaysApply field"
    );
    // Closing frontmatter fence (second ---)
    let fences: Vec<_> = output.match_indices("---").collect();
    assert!(fences.len() >= 2, "should have opening and closing ---");
    assert!(
        output.contains("## Tech Stack"),
        "missing Tech Stack section"
    );
    assert!(
        output.contains("## Coding Conventions"),
        "missing Coding Conventions section"
    );
}

// ---------------------------------------------------------------------------
// Copilot formatter
// ---------------------------------------------------------------------------

#[test]
fn test_copilot_formatter_sections() {
    use contextbridge_lib::output::copilot::CopilotFormatter;

    let ctx = test_context();
    let output = CopilotFormatter.format(&ctx).unwrap();

    assert!(
        output.contains("# Copilot Instructions"),
        "missing Copilot Instructions header"
    );
    assert!(
        output.contains("## About This Project"),
        "missing About This Project section"
    );
    assert!(
        output.contains("## Tech Stack"),
        "missing Tech Stack section"
    );
    assert!(
        output.contains("## Coding Style"),
        "missing Coding Style section"
    );
    assert!(
        output.contains("## What Copilot Should Do"),
        "missing What Copilot Should Do section"
    );
    assert!(
        output.contains("## What Copilot Should Avoid"),
        "missing What Copilot Should Avoid section"
    );
}

// ---------------------------------------------------------------------------
// Codex formatter
// ---------------------------------------------------------------------------

#[test]
fn test_codex_formatter_agents_md() {
    use contextbridge_lib::output::codex::CodexFormatter;

    let ctx = test_context();
    let output = CodexFormatter.format(&ctx).unwrap();

    assert!(output.contains("# AGENTS.md"), "missing AGENTS.md header");
    assert!(
        output.contains("## Setup Commands"),
        "missing Setup Commands section"
    );
    assert!(
        output.contains("cargo build"),
        "missing cargo build command"
    );
    assert!(
        output.contains("## Tech Stack"),
        "missing Tech Stack section"
    );
    assert!(
        output.contains("## Coding Standards"),
        "missing Coding Standards section"
    );
    assert!(
        output.contains("## Boundaries"),
        "missing Boundaries section"
    );
    assert!(
        output.contains("node_modules"),
        "missing node_modules boundary"
    );
    assert!(
        output.contains("## Recent Activity"),
        "missing Recent Activity section"
    );
    assert!(
        output.contains("abc1234"),
        "missing short commit hash abc1234"
    );
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

#[test]
fn test_globs_from_tech() {
    let rust_only = vec![TechEntry {
        id: 1,
        project_id: "t".into(),
        category: "language".into(),
        name: "Rust".into(),
        version: None,
        confidence: 1.0,
        source: "test".into(),
    }];
    let globs = generate_globs_from_tech(&rust_only);
    assert!(globs.contains("**/*.rs"), "Rust should produce **/*.rs");

    let ts_only = vec![TechEntry {
        id: 2,
        project_id: "t".into(),
        category: "language".into(),
        name: "TypeScript".into(),
        version: None,
        confidence: 1.0,
        source: "test".into(),
    }];
    let globs = generate_globs_from_tech(&ts_only);
    assert!(
        globs.contains("**/*.ts"),
        "TypeScript should produce **/*.ts"
    );
    assert!(
        globs.contains("**/*.tsx"),
        "TypeScript should produce **/*.tsx"
    );

    let empty: Vec<TechEntry> = vec![];
    let globs = generate_globs_from_tech(&empty);
    assert_eq!(globs, "**/*", "empty tech should produce **/*");
}

#[test]
fn test_build_commands_from_tech() {
    let rust_tech = vec![TechEntry {
        id: 1,
        project_id: "t".into(),
        category: "language".into(),
        name: "Rust".into(),
        version: None,
        confidence: 1.0,
        source: "test".into(),
    }];
    let cmds = generate_build_commands(&rust_tech);
    let cmd_strs: Vec<&str> = cmds.iter().map(|(_, c)| c.as_str()).collect();
    assert!(
        cmd_strs.contains(&"cargo build"),
        "Rust missing cargo build"
    );
    assert!(cmd_strs.contains(&"cargo test"), "Rust missing cargo test");

    let node_tech = vec![TechEntry {
        id: 2,
        project_id: "t".into(),
        category: "runtime".into(),
        name: "Node".into(),
        version: None,
        confidence: 1.0,
        source: "test".into(),
    }];
    let cmds = generate_build_commands(&node_tech);
    let cmd_strs: Vec<&str> = cmds.iter().map(|(_, c)| c.as_str()).collect();
    assert!(
        cmd_strs.contains(&"npm install"),
        "Node missing npm install"
    );
    assert!(
        cmd_strs.contains(&"npm run build"),
        "Node missing npm run build"
    );

    let both = vec![
        TechEntry {
            id: 1,
            project_id: "t".into(),
            category: "language".into(),
            name: "Rust".into(),
            version: None,
            confidence: 1.0,
            source: "test".into(),
        },
        TechEntry {
            id: 2,
            project_id: "t".into(),
            category: "language".into(),
            name: "TypeScript".into(),
            version: None,
            confidence: 1.0,
            source: "test".into(),
        },
    ];
    let cmds = generate_build_commands(&both);
    let cmd_strs: Vec<&str> = cmds.iter().map(|(_, c)| c.as_str()).collect();
    assert!(
        cmd_strs.contains(&"cargo build"),
        "mixed: missing cargo build"
    );
    assert!(
        cmd_strs.contains(&"npm install"),
        "mixed: missing npm install"
    );
}

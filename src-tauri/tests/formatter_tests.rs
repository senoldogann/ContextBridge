//! Integration tests for Phase 3 AI tool output formatters.

use contextbridge_core::*;
use contextbridge_lib::output::{
    collect_important_paths, collect_workspace_manifests, generate_build_commands,
    generate_build_commands_for_project, generate_globs_from_tech,
};

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

fn test_context_at(root_path: &str) -> ProjectContext {
    let mut context = test_context();
    context.project.root_path = root_path.to_string();
    context
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

#[test]
fn test_workspace_and_path_helpers_detect_real_project_surfaces() {
    let dir = tempfile::TempDir::new().unwrap();
    std::fs::create_dir_all(dir.path().join("apps/mobile")).unwrap();
    std::fs::create_dir_all(dir.path().join("src")).unwrap();
    std::fs::create_dir_all(dir.path().join("src-tauri/src")).unwrap();

    std::fs::write(
        dir.path().join("package.json"),
        r#"{
          "name": "workspace-root",
          "scripts": {
            "dev": "vite",
            "build": "vite build",
            "test": "vitest run"
          }
        }"#,
    )
    .unwrap();
    std::fs::write(
        dir.path().join("apps/mobile/package.json"),
        r#"{
          "name": "mobile-app",
          "scripts": {
            "start": "expo start"
          }
        }"#,
    )
    .unwrap();
    std::fs::write(dir.path().join("src/main.tsx"), "export {};\n").unwrap();
    std::fs::write(dir.path().join("src/App.tsx"), "export {};\n").unwrap();
    std::fs::write(
        dir.path().join("src-tauri/Cargo.toml"),
        "[package]\nname = \"desktop-app\"\nversion = \"0.1.0\"\n",
    )
    .unwrap();
    std::fs::write(dir.path().join("src-tauri/src/main.rs"), "fn main() {}\n").unwrap();

    let workspace_manifests = collect_workspace_manifests(dir.path().to_string_lossy().as_ref());
    let important_paths = collect_important_paths(
        dir.path().to_string_lossy().as_ref(),
        &test_context().tech_stack,
    );

    assert!(
        workspace_manifests
            .iter()
            .any(|entry| entry.relative_dir == "."
                && entry.package_name.as_deref() == Some("workspace-root")),
        "root package.json should be discovered"
    );
    assert!(
        workspace_manifests
            .iter()
            .any(|entry| entry.relative_dir == "apps/mobile"
                && entry.package_name.as_deref() == Some("mobile-app")),
        "nested workspace package.json should be discovered"
    );
    assert!(
        workspace_manifests
            .iter()
            .any(|entry| entry.relative_dir == "src-tauri"
                && entry.package_name.as_deref() == Some("desktop-app")),
        "Cargo workspace should be discovered"
    );
    assert!(
        important_paths
            .iter()
            .any(|entry| entry.path == "src/main.tsx"),
        "frontend bootstrap should be surfaced as an important path"
    );
    assert!(
        important_paths
            .iter()
            .any(|entry| entry.path == "src-tauri/src/main.rs"),
        "desktop entrypoint should be surfaced as an important path"
    );
}

#[test]
fn test_copilot_formatter_includes_workspace_map_and_important_paths() {
    use contextbridge_lib::output::copilot::CopilotFormatter;

    let dir = tempfile::TempDir::new().unwrap();
    std::fs::create_dir_all(dir.path().join("apps/mobile")).unwrap();
    std::fs::create_dir_all(dir.path().join("src")).unwrap();

    std::fs::write(
        dir.path().join("package.json"),
        r#"{
          "name": "workspace-root",
          "scripts": {
            "dev": "vite",
            "build": "vite build",
            "test": "vitest run"
          }
        }"#,
    )
    .unwrap();
    std::fs::write(
        dir.path().join("apps/mobile/package.json"),
        r#"{
          "name": "mobile-app",
          "scripts": {
            "start": "expo start"
          }
        }"#,
    )
    .unwrap();
    std::fs::write(dir.path().join("src/main.tsx"), "export {};\n").unwrap();

    let context = test_context_at(dir.path().to_string_lossy().as_ref());
    let output = CopilotFormatter.format(&context).unwrap();

    assert!(
        output.contains("## Preferred Commands"),
        "preferred commands section should be present"
    );
    assert!(
        output.contains("## Workspace Map"),
        "workspace map section should be present"
    );
    assert!(
        output.contains("mobile-app"),
        "workspace map should include nested package names"
    );
    assert!(
        output.contains("## Important Paths"),
        "important paths section should be present"
    );
    assert!(
        output.contains("src/main.tsx"),
        "important paths should include frontend bootstrap"
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

#[test]
fn test_build_commands_for_pnpm_workspace_project() {
    let dir = tempfile::TempDir::new().unwrap();
    std::fs::write(
        dir.path().join("package.json"),
        r#"{
        "name": "copilot-mobile",
        "scripts": {
            "dev:bridge": "pnpm --filter bridge-server dev",
            "dev:mobile": "pnpm --filter mobile start",
            "build:bridge": "pnpm --filter bridge-server build",
            "build:shared": "pnpm --filter @copilot-mobile/shared build",
            "typecheck": "pnpm -r typecheck"
        },
        "engines": {
            "node": ">=20.0.0",
            "pnpm": ">=9.0.0"
        }
    }"#,
    )
    .unwrap();
    std::fs::write(
        dir.path().join("pnpm-workspace.yaml"),
        "packages:\n  - \"apps/*\"\n  - \"packages/*\"\n",
    )
    .unwrap();

    let tech = vec![TechEntry {
        id: 1,
        project_id: "t".into(),
        category: "runtime".into(),
        name: "Node.js".into(),
        version: Some(">=20.0.0".into()),
        confidence: 1.0,
        source: "package.json".into(),
    }];

    let cmds = generate_build_commands_for_project(&dir.path().to_string_lossy(), &tech);
    let labels: Vec<&str> = cmds.iter().map(|(label, _)| label.as_str()).collect();
    let cmd_strs: Vec<&str> = cmds.iter().map(|(_, cmd)| cmd.as_str()).collect();

    assert!(cmd_strs.contains(&"pnpm install"));
    assert!(cmd_strs.contains(&"pnpm typecheck"));
    assert!(cmd_strs.contains(&"pnpm build:bridge"));
    assert!(cmd_strs.contains(&"pnpm build:shared"));
    assert!(cmd_strs.contains(&"pnpm dev:bridge"));
    assert!(cmd_strs.contains(&"pnpm dev:mobile"));
    assert!(labels.contains(&"Build Bridge"));
    assert!(labels.contains(&"Dev Mobile"));
}

#[test]
fn test_build_commands_for_npm_project_use_builtin_shortcuts() {
    let dir = tempfile::TempDir::new().unwrap();
    std::fs::write(
        dir.path().join("package.json"),
        r#"{
        "name": "web-app",
        "scripts": {
            "start": "vite preview",
            "test": "vitest run",
            "build": "vite build"
        }
    }"#,
    )
    .unwrap();

    let commands = generate_build_commands_for_project(dir.path().to_string_lossy().as_ref(), &[]);
    let command_strings: Vec<&str> = commands
        .iter()
        .map(|(_, command)| command.as_str())
        .collect();

    assert!(command_strings.contains(&"npm start"));
    assert!(command_strings.contains(&"npm test"));
    assert!(command_strings.contains(&"npm run build"));
}

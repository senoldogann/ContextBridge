//! Output formatting modules for various AI coding assistants.

pub mod claude;
pub mod codex;
pub mod copilot;
pub mod cursor;
pub mod format;

use contextbridge_core::{ContextNote, TechEntry};
use serde_json::Value;
use std::collections::{BTreeMap, HashSet};
use std::path::Path;
use walkdir::{DirEntry, WalkDir};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WorkspaceManifest {
    pub relative_dir: String,
    pub manifest_name: String,
    pub package_name: Option<String>,
    pub notable_scripts: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ImportantPath {
    pub path: String,
    pub purpose: String,
}

const WORKSPACE_MANIFEST_FILES: &[&str] = &[
    "package.json",
    "Cargo.toml",
    "pyproject.toml",
    "go.mod",
    "Gemfile",
    "pubspec.yaml",
];

const OUTPUT_SCAN_IGNORED_DIRS: &[&str] = &[
    ".git",
    ".next",
    ".turbo",
    "build",
    "dist",
    "node_modules",
    "target",
];

const MAX_DISCOVERED_WORKSPACES: usize = 10;
const MAX_IMPORTANT_PATHS: usize = 10;
const MAX_EXTRA_SCRIPT_COMMANDS: usize = 12;

/// Maximum output file size (512 KB). Formatters should truncate beyond this.
pub const MAX_OUTPUT_BYTES: usize = 512_000;

/// Check if output has exceeded the size limit and append a truncation notice.
pub fn check_output_limit(out: &mut String) -> bool {
    if out.len() > MAX_OUTPUT_BYTES {
        // Find the last valid UTF-8 char boundary at or before the limit
        // to avoid panicking on multi-byte characters.
        let mut trunc_pos = MAX_OUTPUT_BYTES;
        while !out.is_char_boundary(trunc_pos) {
            trunc_pos -= 1;
        }
        out.truncate(trunc_pos);
        out.push_str("\n\n<!-- Output truncated by ContextBridge (exceeded 512KB limit) -->\n");
        true
    } else {
        false
    }
}

/// Sanitize a string for use in YAML front-matter values.
pub fn sanitize_for_yaml(s: &str) -> String {
    s.chars()
        .filter(|c| !c.is_control() || *c == ' ')
        .collect::<String>()
        .replace("---", "—")
        .replace('"', "'")
        .replace('\n', " ")
}

/// Sanitize a string for use in a markdown heading.
pub fn sanitize_for_heading(s: &str) -> String {
    s.chars()
        .filter(|c| !c.is_control())
        .collect::<String>()
        .replace('\n', " ")
}

/// Group notes by category for section-based formatting.
pub fn group_notes_by_category(notes: &[ContextNote]) -> BTreeMap<&str, Vec<&ContextNote>> {
    let mut groups: BTreeMap<&str, Vec<&ContextNote>> = BTreeMap::new();
    for note in notes {
        groups.entry(note.category.as_str()).or_default().push(note);
    }
    groups
}

pub fn collect_workspace_manifests(project_root: &str) -> Vec<WorkspaceManifest> {
    let root = Path::new(project_root);
    if !root.is_dir() {
        return Vec::new();
    }

    let mut manifests = Vec::new();
    let walker = WalkDir::new(root)
        .follow_links(false)
        .max_depth(4)
        .into_iter();

    for entry in walker.filter_entry(should_visit_output_entry) {
        let Ok(entry) = entry else {
            continue;
        };

        if !entry.file_type().is_file() {
            continue;
        }

        let manifest_name = entry.file_name().to_string_lossy().to_string();
        if !WORKSPACE_MANIFEST_FILES.contains(&manifest_name.as_str()) {
            continue;
        }

        let Ok(relative_path) = entry.path().strip_prefix(root) else {
            continue;
        };

        let relative_dir = relative_path
            .parent()
            .map(|path| path.to_string_lossy().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| ".".into());

        let (package_name, notable_scripts) = match manifest_name.as_str() {
            "package.json" => parse_package_json_metadata(entry.path()),
            "Cargo.toml" => (extract_cargo_package_name(entry.path()), Vec::new()),
            _ => (None, Vec::new()),
        };

        manifests.push(WorkspaceManifest {
            relative_dir,
            manifest_name,
            package_name,
            notable_scripts,
        });
    }

    manifests.sort_by(|left, right| {
        left.relative_dir
            .cmp(&right.relative_dir)
            .then(left.manifest_name.cmp(&right.manifest_name))
    });
    manifests.truncate(MAX_DISCOVERED_WORKSPACES);
    manifests
}

pub fn collect_important_paths(project_root: &str, tech: &[TechEntry]) -> Vec<ImportantPath> {
    let root = Path::new(project_root);
    if !root.is_dir() {
        return Vec::new();
    }

    let mut candidates: Vec<(String, String)> = vec![
        ("README.md".into(), "high-level project overview".into()),
        (
            "package.json".into(),
            "root scripts and JavaScript dependencies".into(),
        ),
        (
            "pnpm-workspace.yaml".into(),
            "workspace package boundaries".into(),
        ),
        (
            "Cargo.toml".into(),
            "Rust workspace or crate configuration".into(),
        ),
        (
            "docs/ARCHITECTURE.md".into(),
            "architecture reference".into(),
        ),
        (
            "vite.config.ts".into(),
            "frontend build and dev configuration".into(),
        ),
        (
            "vitest.config.ts".into(),
            "frontend test configuration".into(),
        ),
        (
            "playwright.config.ts".into(),
            "end-to-end test configuration".into(),
        ),
    ];

    if has_tech(tech, "react") || has_tech(tech, "typescript") {
        candidates.extend([
            ("src/main.tsx".into(), "frontend bootstrap".into()),
            ("src/main.ts".into(), "frontend bootstrap".into()),
            ("src/App.tsx".into(), "primary application shell".into()),
            ("src/App.ts".into(), "primary application shell".into()),
        ]);
    }

    if has_tech(tech, "expo") || has_tech(tech, "react native") {
        candidates.extend([
            ("app/_layout.tsx".into(), "top-level route layout".into()),
            ("app/index.tsx".into(), "default route entry".into()),
            ("app.json".into(), "Expo runtime configuration".into()),
            ("app.config.ts".into(), "Expo runtime configuration".into()),
            ("index.js".into(), "React Native entrypoint".into()),
        ]);
    }

    if has_tech(tech, "tauri") || root.join("src-tauri").is_dir() {
        candidates.extend([
            (
                "src-tauri/tauri.conf.json".into(),
                "desktop window and bundle settings".into(),
            ),
            ("src-tauri/src/main.rs".into(), "desktop entrypoint".into()),
            (
                "src-tauri/src/lib.rs".into(),
                "desktop command and plugin wiring".into(),
            ),
            (
                "src-tauri/Cargo.toml".into(),
                "desktop crate configuration".into(),
            ),
        ]);
    }

    let mut important_paths = Vec::new();
    let mut seen_paths = HashSet::new();

    for (path, purpose) in candidates {
        if !seen_paths.insert(path.clone()) {
            continue;
        }

        if root.join(&path).exists() {
            important_paths.push(ImportantPath { path, purpose });
        }
    }

    if important_paths.len() < 4 {
        for workspace in collect_workspace_manifests(project_root) {
            let manifest_path = if workspace.relative_dir == "." {
                Path::new(&workspace.manifest_name).to_path_buf()
            } else {
                Path::new(&workspace.relative_dir).join(&workspace.manifest_name)
            };

            let manifest_path = manifest_path.to_string_lossy().to_string();

            if !seen_paths.insert(manifest_path.clone()) {
                continue;
            }

            important_paths.push(ImportantPath {
                path: manifest_path,
                purpose: "workspace manifest".into(),
            });

            if important_paths.len() >= MAX_IMPORTANT_PATHS {
                break;
            }
        }
    }

    important_paths.truncate(MAX_IMPORTANT_PATHS);
    important_paths
}

pub fn collect_boundary_hints(project_root: &str, tech: &[TechEntry]) -> Vec<String> {
    let root = Path::new(project_root);
    let workspaces = collect_workspace_manifests(project_root);
    let mut hints = Vec::new();

    if workspaces.len() > 1 {
        let scope = workspaces
            .iter()
            .map(|workspace| format!("`{}`", display_workspace_dir(&workspace.relative_dir)))
            .collect::<Vec<_>>()
            .join(", ");
        hints.push(format!(
            "Scope edits to the nearest workspace manifest: {scope}."
        ));
    }

    if root.join("pnpm-workspace.yaml").is_file() {
        hints.push("Run workspace-aware pnpm commands from the repository root.".into());
    }

    if (has_tech(tech, "tauri") || root.join("src-tauri").is_dir()) && root.join("src").is_dir() {
        hints.push(
            "Frontend and desktop Rust code live in separate trees; keep changes scoped unless the feature crosses the IPC boundary."
                .into(),
        );
    }

    hints
}

pub fn display_workspace_dir(relative_dir: &str) -> String {
    if relative_dir == "." {
        "root".into()
    } else {
        relative_dir.to_string()
    }
}

/// Generate glob patterns from detected tech stack entries.
pub fn generate_globs_from_tech(tech: &[TechEntry]) -> String {
    let mut patterns: Vec<&str> = Vec::new();

    for entry in tech {
        let name_lower = entry.name.to_lowercase();
        let cat_lower = entry.category.to_lowercase();

        let exts: &[&str] = match name_lower.as_str() {
            "rust" => &["**/*.rs"],
            "typescript" => &["**/*.ts", "**/*.tsx"],
            "javascript" => &["**/*.js", "**/*.jsx"],
            "python" => &["**/*.py"],
            "go" | "golang" => &["**/*.go"],
            "java" => &["**/*.java"],
            "kotlin" => &["**/*.kt"],
            "swift" => &["**/*.swift"],
            "c++" | "cpp" => &["**/*.cpp", "**/*.hpp"],
            "c#" | "csharp" => &["**/*.cs"],
            "ruby" => &["**/*.rb"],
            _ if cat_lower == "language" => continue,
            _ => continue,
        };

        for ext in exts {
            if !patterns.contains(ext) {
                patterns.push(ext);
            }
        }
    }

    if patterns.is_empty() {
        "**/*".to_string()
    } else {
        patterns.join(",")
    }
}

fn should_visit_output_entry(entry: &DirEntry) -> bool {
    if entry.depth() == 0 {
        return true;
    }

    if !entry.file_type().is_dir() {
        return true;
    }

    let file_name = entry.file_name().to_string_lossy();
    !OUTPUT_SCAN_IGNORED_DIRS.contains(&file_name.as_ref())
}

fn parse_package_json_metadata(path: &Path) -> (Option<String>, Vec<String>) {
    let Ok(raw) = std::fs::read_to_string(path) else {
        return (None, Vec::new());
    };
    let Ok(package_json) = serde_json::from_str::<Value>(&raw) else {
        return (None, Vec::new());
    };

    let package_name = package_json
        .get("name")
        .and_then(|value| value.as_str())
        .map(ToOwned::to_owned);

    let notable_scripts = package_json
        .get("scripts")
        .and_then(|value| value.as_object())
        .map(extract_notable_script_names)
        .unwrap_or_default();

    (package_name, notable_scripts)
}

fn extract_notable_script_names(scripts: &serde_json::Map<String, Value>) -> Vec<String> {
    let mut names = Vec::new();
    let mut seen = HashSet::new();

    for script_name in ["dev", "start", "build", "test", "lint", "typecheck"] {
        if scripts.contains_key(script_name) && seen.insert(script_name.to_string()) {
            names.push(script_name.to_string());
        }
    }

    let mut extra_names: Vec<&str> = scripts
        .keys()
        .filter_map(|name| {
            let value = name.as_str();
            (value.starts_with("build:") || value.starts_with("dev:") || value.starts_with("test:"))
                .then_some(value)
        })
        .collect();
    extra_names.sort_unstable();

    for script_name in extra_names.into_iter().take(3) {
        if seen.insert(script_name.to_string()) {
            names.push(script_name.to_string());
        }
    }

    names.truncate(4);
    names
}

fn extract_cargo_package_name(path: &Path) -> Option<String> {
    let raw = std::fs::read_to_string(path).ok()?;
    let manifest = raw.parse::<toml::Value>().ok()?;
    manifest
        .get("package")
        .and_then(|value| value.as_table())
        .and_then(|table| table.get("name"))
        .and_then(|value| value.as_str())
        .map(ToOwned::to_owned)
}

fn has_tech(tech: &[TechEntry], name: &str) -> bool {
    tech.iter()
        .any(|entry| entry.name.eq_ignore_ascii_case(name))
}

/// Generate build commands from detected tech stack.
///
/// Returns a vec of `(label, command)` pairs inferred from the project's
/// technology entries.
pub fn generate_build_commands(tech: &[TechEntry]) -> Vec<(String, String)> {
    let mut commands: Vec<(String, String)> = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for entry in tech {
        let key = entry.name.to_lowercase();
        if seen.contains(&key) {
            continue;
        }

        match key.as_str() {
            "rust" | "cargo" => {
                if seen.contains("rust") || seen.contains("cargo") {
                    seen.insert(key);
                    continue;
                }
                seen.insert(key);
                seen.insert("rust".into());
                seen.insert("cargo".into());
                commands.push(("Build".into(), "cargo build".into()));
                commands.push(("Test".into(), "cargo test".into()));
                commands.push(("Lint".into(), "cargo clippy -- -D warnings".into()));
            }
            "node" | "npm" | "javascript" | "typescript" => {
                if seen.contains("npm") || seen.contains("node") {
                    seen.insert(key);
                    continue;
                }
                seen.insert(key);
                seen.insert("npm".into());
                seen.insert("node".into());
                commands.push(("Install".into(), "npm install".into()));
                commands.push(("Build".into(), "npm run build".into()));
                commands.push(("Test".into(), "npm test".into()));
            }
            "python" | "pip" => {
                if seen.contains("python") || seen.contains("pip") {
                    seen.insert(key);
                    continue;
                }
                seen.insert(key);
                seen.insert("python".into());
                seen.insert("pip".into());
                commands.push(("Install".into(), "pip install -r requirements.txt".into()));
                commands.push(("Test".into(), "pytest".into()));
            }
            "go" | "golang" => {
                if seen.contains("go") || seen.contains("golang") {
                    seen.insert(key);
                    continue;
                }
                seen.insert(key);
                seen.insert("go".into());
                seen.insert("golang".into());
                commands.push(("Build".into(), "go build ./...".into()));
                commands.push(("Test".into(), "go test ./...".into()));
            }
            _ => {
                seen.insert(key);
            }
        }
    }

    commands
}

/// Generate build commands using project files when available, with a
/// technology-based fallback.
pub fn generate_build_commands_for_project(
    project_root: &str,
    tech: &[TechEntry],
) -> Vec<(String, String)> {
    let root = Path::new(project_root);

    if let Some(commands) = detect_commands_from_root_package(root) {
        if !commands.is_empty() {
            return commands;
        }
    }

    generate_build_commands(tech)
}

fn detect_commands_from_root_package(root: &Path) -> Option<Vec<(String, String)>> {
    let package_json_path = root.join("package.json");
    if !package_json_path.is_file() {
        return None;
    }

    let raw = std::fs::read_to_string(&package_json_path).ok()?;
    let package_json: Value = serde_json::from_str(&raw).ok()?;
    let scripts = package_json.get("scripts")?.as_object()?;

    let package_manager = detect_package_manager(root, &package_json);
    let mut commands = vec![("Install".into(), install_command_for(&package_manager))];

    let prioritized_scripts = ["build", "typecheck", "test", "lint", "dev", "start"];
    let mut added_scripts = std::collections::HashSet::new();

    for script_name in prioritized_scripts {
        if scripts.contains_key(script_name) {
            commands.push((
                script_label(script_name),
                run_command_for_script(&package_manager, script_name),
            ));
            added_scripts.insert(script_name.to_string());
        }
    }

    let extra_prefixes = ["build:", "dev:", "test:"];
    let mut extra_script_names: Vec<&str> = scripts
        .keys()
        .filter_map(|name| {
            let name = name.as_str();
            if added_scripts.contains(name) {
                return None;
            }

            extra_prefixes
                .iter()
                .any(|prefix| name.starts_with(prefix))
                .then_some(name)
        })
        .collect();
    extra_script_names.sort_unstable();

    for script_name in extra_script_names
        .into_iter()
        .take(MAX_EXTRA_SCRIPT_COMMANDS)
    {
        commands.push((
            script_label(script_name),
            run_command_for_script(&package_manager, script_name),
        ));
    }

    Some(commands)
}

fn detect_package_manager(root: &Path, package_json: &Value) -> String {
    let package_manager = package_json
        .get("packageManager")
        .and_then(|value| value.as_str())
        .unwrap_or_default();

    if package_manager.starts_with("pnpm@")
        || package_json
            .pointer("/engines/pnpm")
            .and_then(|value| value.as_str())
            .is_some()
        || root.join("pnpm-lock.yaml").is_file()
        || root.join("pnpm-workspace.yaml").is_file()
    {
        return "pnpm".into();
    }

    if package_manager.starts_with("yarn@") || root.join("yarn.lock").is_file() {
        return "yarn".into();
    }

    if package_manager.starts_with("bun@")
        || root.join("bun.lockb").is_file()
        || root.join("bun.lock").is_file()
    {
        return "bun".into();
    }

    "npm".into()
}

fn install_command_for(package_manager: &str) -> String {
    match package_manager {
        "pnpm" => "pnpm install".into(),
        "yarn" => "yarn install".into(),
        "bun" => "bun install".into(),
        _ => "npm install".into(),
    }
}

fn run_command_for_script(package_manager: &str, script_name: &str) -> String {
    match package_manager {
        "pnpm" => format!("pnpm {script_name}"),
        "yarn" => format!("yarn {script_name}"),
        "bun" => format!("bun run {script_name}"),
        _ if matches!(script_name, "test" | "start" | "stop" | "restart") => {
            format!("npm {script_name}")
        }
        _ => format!("npm run {script_name}"),
    }
}

fn script_label(script_name: &str) -> String {
    match script_name {
        "build" => "Build".into(),
        "typecheck" => "Typecheck".into(),
        "test" => "Test".into(),
        "lint" => "Lint".into(),
        "dev" => "Dev".into(),
        "start" => "Start".into(),
        _ => {
            let normalized = script_name.replace(':', " ");
            let mut words = normalized.split_whitespace();
            let Some(first_word) = words.next() else {
                return script_name.into();
            };

            let mut label = capitalize_word(first_word);
            for word in words {
                label.push(' ');
                label.push_str(&capitalize_word(word));
            }
            label
        }
    }
}

fn capitalize_word(value: &str) -> String {
    let mut chars = value.chars();
    let Some(first_char) = chars.next() else {
        return String::new();
    };

    let mut output = String::new();
    output.extend(first_char.to_uppercase());
    output.push_str(chars.as_str());
    output
}

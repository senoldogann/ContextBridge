//! Output formatting modules for various AI coding assistants.

pub mod claude;
pub mod codex;
pub mod copilot;
pub mod cursor;
pub mod format;

use contextbridge_core::{ContextNote, TechEntry};
use std::collections::BTreeMap;

/// Maximum output file size (512 KB). Formatters should truncate beyond this.
pub const MAX_OUTPUT_BYTES: usize = 512_000;

/// Check if output has exceeded the size limit and append a truncation notice.
pub fn check_output_limit(out: &mut String) -> bool {
    if out.len() > MAX_OUTPUT_BYTES {
        out.truncate(MAX_OUTPUT_BYTES);
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

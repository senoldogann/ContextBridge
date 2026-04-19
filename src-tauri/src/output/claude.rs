//! Claude-format output (CLAUDE.md).

use contextbridge_core::{AppError, ContextFormatter, ProjectContext};
use std::path::PathBuf;

/// Formatter that produces a `CLAUDE.md` file for Anthropic Claude.
pub struct ClaudeFormatter;

impl ContextFormatter for ClaudeFormatter {
    /// Render the project context as a CLAUDE.md document.
    fn format(&self, ctx: &ProjectContext) -> Result<String, AppError> {
        let mut out = String::new();

        out.push_str(&format!("# {}\n\n", ctx.project.name));

        // Tech stack section
        if !ctx.tech_stack.is_empty() {
            out.push_str("## Tech Stack\n\n");
            for entry in &ctx.tech_stack {
                let version = entry.version.as_deref().unwrap_or("unknown");
                out.push_str(&format!("- **{}** ({}) — v{}\n", entry.name, entry.category, version));
            }
            out.push('\n');
        }

        // Context notes
        if !ctx.notes.is_empty() {
            out.push_str("## Context Notes\n\n");
            for note in &ctx.notes {
                out.push_str(&format!("### {} [{}]\n\n", note.title, note.category));
                out.push_str(&note.content);
                out.push_str("\n\n");
            }
        }

        // Recent changes
        if !ctx.recent_changes.is_empty() {
            out.push_str("## Recent Changes\n\n");
            for change in ctx.recent_changes.iter().take(10) {
                let hash = change.commit_hash.as_deref().unwrap_or("");
                out.push_str(&format!(
                    "- `{}` {} — {}\n",
                    &hash.get(..7).unwrap_or(hash),
                    change.change_type,
                    change.summary,
                ));
            }
            out.push('\n');
        }

        Ok(out)
    }

    /// Output file name.
    fn output_filename(&self) -> &str {
        "CLAUDE.md"
    }

    /// Output directory (project root).
    fn output_directory(&self) -> PathBuf {
        PathBuf::from(".")
    }
}

//! Claude-format output (CLAUDE.md).

use crate::output::{generate_build_commands, group_notes_by_category};
use contextbridge_core::{AppError, ContextFormatter, ProjectContext};
use std::fmt::Write;
use std::path::PathBuf;

/// Categories that are placed into dedicated sections rather than the
/// catch-all "Context Notes" block.
const DEDICATED_CATEGORIES: &[&str] = &[
    "build",
    "setup",
    "conventions",
    "architecture",
    "file_structure",
];

/// Formatter that produces a `CLAUDE.md` file for Anthropic Claude.
pub struct ClaudeFormatter;

impl ContextFormatter for ClaudeFormatter {
    /// Render the project context as a CLAUDE.md document.
    fn format(&self, ctx: &ProjectContext) -> Result<String, AppError> {
        let mut out = String::new();

        writeln!(
            out,
            "# {}\n",
            crate::output::sanitize_for_heading(&ctx.project.name)
        )
        .map_err(|e| AppError::Other(e.to_string()))?;

        // Overview
        write_overview(&mut out, ctx)?;

        // Tech Stack table
        write_tech_stack(&mut out, ctx)?;

        let groups = group_notes_by_category(&ctx.notes);

        // Build & Run
        write_build_run(&mut out, ctx, &groups)?;

        // Coding Conventions
        write_notes_section(&mut out, &groups, &["conventions"], "Coding Conventions")?;

        // Architecture
        write_notes_section(&mut out, &groups, &["architecture"], "Architecture")?;

        // File Structure
        write_notes_section(&mut out, &groups, &["file_structure"], "File Structure")?;

        // Remaining notes grouped by category
        write_remaining_notes(&mut out, &groups)?;

        // Recent Changes
        write_recent_changes(&mut out, ctx)?;

        crate::output::check_output_limit(&mut out);
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

/// Write an auto-generated overview from the tech stack.
fn write_overview(out: &mut String, ctx: &ProjectContext) -> Result<(), AppError> {
    let techs: Vec<&str> = ctx.tech_stack.iter().map(|t| t.name.as_str()).collect();
    if techs.is_empty() {
        return Ok(());
    }
    writeln!(out, "## Overview\n").map_err(fmt_err)?;
    writeln!(
        out,
        "This project uses **{}** and is located at `{}`.\n",
        techs.join(", "),
        ctx.project.root_path,
    )
    .map_err(fmt_err)?;
    Ok(())
}

/// Write a tech stack table.
fn write_tech_stack(out: &mut String, ctx: &ProjectContext) -> Result<(), AppError> {
    if ctx.tech_stack.is_empty() {
        return Ok(());
    }
    writeln!(out, "## Tech Stack\n").map_err(fmt_err)?;
    writeln!(out, "| Name | Category | Version |").map_err(fmt_err)?;
    writeln!(out, "|------|----------|---------|").map_err(fmt_err)?;
    for entry in &ctx.tech_stack {
        let version = entry.version.as_deref().unwrap_or("—");
        writeln!(out, "| {} | {} | {} |", entry.name, entry.category, version).map_err(fmt_err)?;
    }
    writeln!(out).map_err(fmt_err)?;
    Ok(())
}

/// Write the Build & Run section from notes or auto-generated commands.
fn write_build_run(
    out: &mut String,
    ctx: &ProjectContext,
    groups: &std::collections::BTreeMap<&str, Vec<&contextbridge_core::ContextNote>>,
) -> Result<(), AppError> {
    let build_notes: Vec<&&contextbridge_core::ContextNote> = ["build", "setup"]
        .iter()
        .filter_map(|cat| groups.get(cat))
        .flatten()
        .collect();

    let auto_cmds = generate_build_commands(&ctx.tech_stack);

    if build_notes.is_empty() && auto_cmds.is_empty() {
        return Ok(());
    }

    writeln!(out, "## Build & Run\n").map_err(fmt_err)?;

    for note in &build_notes {
        writeln!(out, "### {}\n", note.title).map_err(fmt_err)?;
        writeln!(out, "{}\n", note.content).map_err(fmt_err)?;
    }

    if !auto_cmds.is_empty() {
        if build_notes.is_empty() {
            writeln!(out, "Auto-detected commands:\n").map_err(fmt_err)?;
        }
        writeln!(out, "```bash").map_err(fmt_err)?;
        for (label, cmd) in &auto_cmds {
            writeln!(out, "# {label}").map_err(fmt_err)?;
            writeln!(out, "{cmd}").map_err(fmt_err)?;
        }
        writeln!(out, "```\n").map_err(fmt_err)?;
    }

    Ok(())
}

/// Write a section from notes matching the given categories.
fn write_notes_section(
    out: &mut String,
    groups: &std::collections::BTreeMap<&str, Vec<&contextbridge_core::ContextNote>>,
    categories: &[&str],
    heading: &str,
) -> Result<(), AppError> {
    let notes: Vec<&&contextbridge_core::ContextNote> = categories
        .iter()
        .filter_map(|cat| groups.get(cat))
        .flatten()
        .collect();

    if notes.is_empty() {
        return Ok(());
    }

    writeln!(out, "## {heading}\n").map_err(fmt_err)?;
    for note in &notes {
        writeln!(out, "### {}\n", note.title).map_err(fmt_err)?;
        writeln!(out, "{}\n", note.content).map_err(fmt_err)?;
    }
    Ok(())
}

/// Write remaining notes that don't belong to dedicated sections.
fn write_remaining_notes(
    out: &mut String,
    groups: &std::collections::BTreeMap<&str, Vec<&contextbridge_core::ContextNote>>,
) -> Result<(), AppError> {
    let remaining: Vec<(&&str, &Vec<&contextbridge_core::ContextNote>)> = groups
        .iter()
        .filter(|(cat, _)| !DEDICATED_CATEGORIES.contains(cat))
        .collect();

    if remaining.is_empty() {
        return Ok(());
    }

    writeln!(out, "## Context Notes\n").map_err(fmt_err)?;
    for (category, notes) in &remaining {
        writeln!(out, "### {}\n", category).map_err(fmt_err)?;
        for note in *notes {
            writeln!(out, "**{}**: {}\n", note.title, note.content).map_err(fmt_err)?;
        }
    }
    Ok(())
}

/// Write recent changes (last 15).
fn write_recent_changes(out: &mut String, ctx: &ProjectContext) -> Result<(), AppError> {
    if ctx.recent_changes.is_empty() {
        return Ok(());
    }
    writeln!(out, "## Recent Changes\n").map_err(fmt_err)?;
    for change in ctx.recent_changes.iter().take(15) {
        let hash = change.commit_hash.as_deref().unwrap_or("");
        let short = hash.get(..7).unwrap_or(hash);
        writeln!(
            out,
            "- `{short}` **{}** — {}",
            change.change_type, change.summary
        )
        .map_err(fmt_err)?;
    }
    writeln!(out).map_err(fmt_err)?;
    Ok(())
}

/// Convert a `fmt::Error` into `AppError`.
fn fmt_err(e: std::fmt::Error) -> AppError {
    AppError::Other(e.to_string())
}

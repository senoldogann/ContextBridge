//! Core processing modules for project scanning, git analysis, and context orchestration.

pub mod context_engine;
pub mod git_analyzer;
pub mod project_scanner;
pub mod sync;
pub mod watcher;

/// Directories whose changes are never interesting — shared by the scanner and watcher.
pub const IGNORED_DIRS: &[&str] = &[
    ".git", "node_modules", "target", "dist", "build", ".next",
    "__pycache__", ".venv", "venv", ".tox", ".mypy_cache",
    ".pytest_cache", "vendor", "Pods", ".gradle", ".idea",
    ".vscode", "coverage", ".nyc_output",
];

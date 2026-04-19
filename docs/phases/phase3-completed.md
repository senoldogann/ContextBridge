# Phase 3: AI Tool Adapters — Completed

## Summary

Implemented production-quality formatters for 4 AI coding tools, an MCP server for Claude Code, and a sync engine to write formatted context files into project directories.

## Components Implemented

### Formatters (`src-tauri/src/output/`)

| Formatter | Output File                       | Format                                                                                                                 |
| --------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Claude    | `CLAUDE.md`                       | Markdown with Overview, Tech Stack table, Build & Run, Coding Conventions, Architecture, Context Notes, Recent Changes |
| Cursor    | `.cursor/rules/contextbridge.mdc` | YAML frontmatter (description, globs, alwaysApply) + markdown body                                                     |
| Copilot   | `.github/copilot-instructions.md` | About, Tech Stack, Coding Style, Should Do/Avoid sections                                                              |
| Codex     | `AGENTS.md`                       | Setup Commands, Tech Stack, Coding Standards, Architecture, Boundaries, Recent Activity                                |

**Shared helpers** in `output/mod.rs`:

- `group_notes_by_category()` — BTreeMap-based deterministic grouping
- `generate_globs_from_tech()` — maps languages to file glob patterns
- `generate_build_commands()` — infers build/test/lint from tech stack
- `sanitize_for_yaml()` / `sanitize_for_heading()` — content injection prevention
- `check_output_limit()` — 512KB truncation safety net

### MCP Server (`contextbridge-mcp/`)

- JSON-RPC 2.0 over stdio (manual implementation, no external MCP SDK)
- 3 tools: `list_projects`, `get_context`, `search_context`
- Read-only SQLite access with `SQLITE_OPEN_FULL_MUTEX`
- 1MB request size limit
- Generic error messages (no path leakage)
- DB path aligned with main app (`~/.contextbridge/data.db`)

### Sync Engine (`src-tauri/src/core/sync.rs`)

- `sync_to_tool()` — format + write single target
- `sync_all()` — format once, sync all targets, continue on per-target errors
- SHA-256 content hash dedup (skip write if unchanged)
- Symlink detection in output path components
- TOCTOU-safe: canonicalize AFTER write, verify containment, remove if escaped
- Updates `sync_state` table after each successful write

### IPC Commands

- `sync_to_tool(project_id, target)` — sync single AI tool
- `sync_all_tools(project_id)` — sync all enabled tools

### Frontend

- `SyncResult` TypeScript interface
- `syncToTool()` / `syncAllTools()` IPC wrappers

## Tests (14 new, 28 total)

- 7 formatter tests (all 4 formatters + helper functions)
- 7 sync engine tests (per-target sync, hash skip, invalid target, sync_all)

## Research Conducted

- CLAUDE.md format and sections (April 2026)
- Cursor `.mdc` format replaces old `.cursorrules`
- Copilot instructions format
- Codex AGENTS.md format (32KB limit)
- MCP protocol and `rmcp` crate evaluation (chose manual JSON-RPC)

## Review Findings Fixed

### Code Review (11 findings)

- **CRITICAL**: MCP DB path mismatch → aligned to `~/.contextbridge/data.db`
- **HIGH**: sync_all fails fast → continue on error, single context assembly
- **HIGH**: Build commands dedup bug → insert all aliases into seen set
- **HIGH**: 4x context assembly → refactored to sync_to_tool_with_context
- **MEDIUM**: HashMap non-deterministic → BTreeMap for deterministic output
- **MEDIUM**: MCP opens DB per call → documented, acceptable for current design
- **MEDIUM**: SQLITE_OPEN_NO_MUTEX → SQLITE_OPEN_FULL_MUTEX
- **MEDIUM**: create_dir before validate → reordered with symlink check
- 3 LOW findings noted (fmt::Write infallibility, duplicate validation, cursor category drops)

### Security Review (11 findings)

- **CRITICAL**: TOCTOU race → symlink check + post-write canonicalization
- **HIGH**: Unbounded read_line → 1MB limit
- **HIGH**: FTS5 hyphen NOT operator → strip leading hyphens per word
- **MEDIUM**: Error message path leakage → generic client messages
- **MEDIUM**: No output size limit → 512KB truncation
- **MEDIUM**: Content injection via names → sanitize_for_yaml/heading helpers
- **MEDIUM**: DB path env var traversal → documented risk
- **MEDIUM**: set_setting value length → 10KB max
- 3 LOW findings noted (orphaned files, unsafe-inline styles, windows wildcard)

## Commits

1. `aa77690` — feat: implement AI tool context formatters
2. `362379d` — feat(mcp): implement ContextBridge MCP server
3. `a1f1896` — feat: implement sync commands
4. `d5ff5c3` — test: add Phase 3 integration tests
5. `f835aca` — Fix 12 code review and security review findings

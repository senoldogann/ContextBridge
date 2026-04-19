# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2025-07-14

### Added

#### Phase 1 — Project Scaffolding

- Tauri v2 + React 19 + TypeScript project setup
- Cargo workspace with three crates (`contextbridge`, `contextbridge-core`, `contextbridge-mcp`)
- SQLite database with WAL mode and FTS5 full-text search
- System tray integration with quit menu
- Basic UI shell (Sidebar, MainContent, EmptyState)
- Zustand stores for project and settings state
- Tauri IPC command layer (projects, context, settings)
- CI/CD pipeline (lint, test, build matrix)
- Husky + lint-staged for pre-commit hooks
- Architecture Decision Records (ADR)

#### Phase 2 — Core Engine

- File watcher with supervisor pattern (notify crate)
- Context engine: language detection, structure extraction, git metadata, content hashing
- Output formatter trait with adapters for Claude, Copilot, Cursor, and Codex
- SHA-256 content-hash deduplication for sync operations
- Full-text search across project context via FTS5

#### Phase 3 — MCP Server & Sync

- Standalone MCP server binary (`contextbridge-mcp`) using JSON-RPC 2.0 over stdio
- Sync engine that writes AI tool config files (CLAUDE.md, .cursorrules, etc.)
- `sync_to_tool` and `sync_all_tools` IPC commands
- Content-hash dedup to avoid unnecessary file writes

#### Phase 4 — UI & User Experience

- Dashboard with project cards and "Add Project" flow
- ProjectDetail view with Overview, Notes, Sync, and Changes tabs
- Settings page with theme toggle, auto-sync, and adapter checkboxes
- Reusable UI components: Badge, Button, Card, Tab, Toggle
- ErrorBoundary and ErrorBanner for graceful error handling
- `add_note` and `delete_note` commands with backend validation
- Security hardening: sanitized errors, category allowlist, input length limits

#### Phase 5 — Release Preparation

- Auto-updater integration (`tauri-plugin-updater`)
- UpdateChecker component with download progress and one-click install
- Release workflow using `tauri-apps/tauri-action@v0` with 4-platform matrix
- Updater signing key support (`TAURI_SIGNING_PRIVATE_KEY`)
- App icon generation script (`scripts/generate-icons.sh`)
- Professional README with install, development, and architecture docs
- Phase completion documentation

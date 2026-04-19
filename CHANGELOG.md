# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Project scaffolding with Tauri v2 + React 19 + TypeScript
- Cargo workspace (src-tauri, contextbridge-core, contextbridge-mcp)
- SQLite database with WAL mode and FTS5
- System tray integration
- Basic UI shell (Sidebar, MainContent, EmptyState)
- Zustand stores for project and settings state
- Tauri IPC command layer (projects, context, settings)
- Output formatter trait with Claude adapter
- CI/CD pipeline (lint, test, build matrix)
- Husky + lint-staged for pre-commit hooks
- Architecture Decision Records (ADR)

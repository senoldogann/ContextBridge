<div align="center">

# ContextBridge

**Your projects, understood by every AI tool.**

[![CI](https://github.com/senoldogann/contextbridge/actions/workflows/ci.yml/badge.svg)](https://github.com/senoldogann/contextbridge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## The Problem

Every AI coding tool has its own context format — Claude needs `CLAUDE.md`, Copilot reads `.github/copilot-instructions.md`, Cursor wants `.cursorrules`, Codex uses `AGENTS.md`. Keeping these in sync is tedious and error-prone. When your project changes, your AI context goes stale.

## The Solution

ContextBridge is a lightweight menu-bar app that **watches your project**, builds a searchable context database, and **automatically generates** up-to-date configuration files for every AI tool you use.

<!-- Screenshot placeholder -->
<!-- ![ContextBridge Screenshot](docs/assets/screenshot.png) -->

## ✨ Features

- 🔍 **Automatic Project Scanning** — watches your files and builds context in real-time
- 🧠 **Smart Context Engine** — extracts language, structure, git metadata, and content hashes
- 🔄 **Multi-Tool Output** — generates configs for Claude, Copilot, Cursor, and Codex simultaneously
- 🗄️ **Full-Text Search** — SQLite FTS5 powers instant search across your entire project context
- 🖥️ **Menu Bar App** — lives in your system tray, always ready, never in the way
- 🔌 **MCP Server** — exposes context via Model Context Protocol for programmatic access
- ⚡ **Native Performance** — Rust backend, ~10 MB binary, ~30 MB memory footprint
- 🔒 **Local First** — all data stays on your machine in a single SQLite file

## Quick Start

### Prerequisites

- [Rust](https://rustup.rs) (stable)
- [Node.js](https://nodejs.org) 22+
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS

### Development

```bash
git clone https://github.com/senoldogann/contextbridge.git
cd contextbridge
npm ci
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

## Architecture

ContextBridge is a **Tauri v2** application with a Cargo workspace of 3 crates:

```
File Watcher → Context Engine → SQLite (WAL + FTS5) → Output Formatters → AI Config Files
```

| Crate                | Purpose                              |
| -------------------- | ------------------------------------ |
| `contextbridge`      | Main Tauri app (commands, core, DB)  |
| `contextbridge-core` | Shared types and trait definitions   |
| `contextbridge-mcp`  | Standalone MCP server binary         |

📖 See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full deep-dive.

## Tech Stack

| Layer       | Technology                          |
| ----------- | ----------------------------------- |
| Framework   | Tauri v2                            |
| Backend     | Rust (tokio, rusqlite, notify)      |
| Frontend    | React 19 + TypeScript + Vite        |
| Database    | SQLite (WAL + FTS5)                 |
| State       | Zustand (UI only)                   |
| Styling     | CSS + clsx                          |
| Icons       | Lucide React                        |
| Testing     | Vitest + Playwright + cargo test    |
| CI/CD       | GitHub Actions (4-platform matrix)  |

## Roadmap

- [x] Project scaffolding + Tauri v2 setup
- [x] SQLite with WAL + FTS5
- [x] File watcher + Context Engine
- [x] Output formatters (Claude, Copilot, Cursor, Codex)
- [x] CI/CD pipeline
- [ ] Project management UI
- [ ] Rule editor for custom context rules
- [ ] Settings panel
- [ ] MCP server implementation
- [ ] Auto-update support
- [ ] Plugin system for custom output formats

## Contributing

Contributions are welcome! Please read the [Contributing Guide](docs/CONTRIBUTING.md) before submitting a PR.

## License

[MIT](LICENSE) © 2025 Senol Dogan

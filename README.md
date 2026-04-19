<div align="center">

# ContextBridge

**Your projects, understood by every AI tool.**

[![CI](https://github.com/senoldogann/ContextBridge/actions/workflows/ci.yml/badge.svg)](https://github.com/senoldogann/ContextBridge/actions/workflows/ci.yml)
[![Release](https://github.com/senoldogann/ContextBridge/actions/workflows/release.yml/badge.svg)](https://github.com/senoldogann/ContextBridge/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

<!-- ![ContextBridge Screenshot](docs/assets/screenshot.png) -->

</div>

---

## What is ContextBridge?

ContextBridge is a lightweight **menu-bar desktop app** that watches your project, builds a searchable context database, and **automatically generates** up-to-date configuration files for every AI coding tool you use — Claude (`CLAUDE.md`), GitHub Copilot (`.github/copilot-instructions.md`), Cursor (`.cursorrules`), and Codex (`AGENTS.md`).

No more manually maintaining four different context files. Change once, sync everywhere.

## Features

- 🔄 **4-Tool Auto-Sync** — generates and writes configs for Claude, Copilot, Cursor, and Codex simultaneously
- 🔍 **Smart Context Engine** — extracts language, project structure, git metadata, and content hashes
- 🗄️ **Full-Text Search** — SQLite FTS5 powers instant search across your entire project context
- 🖥️ **Menu Bar App** — lives in your system tray, always ready, never in the way
- 🔌 **MCP Server** — exposes context via Model Context Protocol (JSON-RPC 2.0 over stdio)
- ⚡ **Native Performance** — Rust backend, ~10 MB binary, ~30 MB memory
- 🔒 **Local First** — all data stays on your machine
- 🔄 **Auto-Updates** — built-in update checker with one-click install

## Installation

Download the latest release for your platform from the [Releases page](https://github.com/senoldogann/ContextBridge/releases):

| Platform              | Download                      |
| --------------------- | ----------------------------- |
| macOS (Apple Silicon) | `.dmg` (aarch64)              |
| macOS (Intel)         | `.dmg` (x86_64)               |
| Linux                 | `.deb` / `.AppImage` (x86_64) |
| Windows               | `.msi` / `.exe` (x86_64)      |

## Development

### Prerequisites

- [Node.js](https://nodejs.org) 22+
- [Rust](https://rustup.rs) (stable)
- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS

### Quick Start

```bash
git clone https://github.com/senoldogann/ContextBridge.git
cd ContextBridge
npm ci
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

### Test

```bash
# Frontend tests (60 specs)
npm test

# Rust tests (28 specs)
cargo test --workspace

# E2E tests
npm run test:e2e
```

### Generate App Icons

```bash
# Place a 1024×1024 PNG as app-icon.png, then:
./scripts/generate-icons.sh
```

## Architecture

ContextBridge is a **Tauri v2** app with a Cargo workspace of three crates:

```
File Watcher → Context Engine → SQLite (WAL + FTS5) → Output Formatters → AI Config Files
```

| Crate                | Purpose                            |
| -------------------- | ---------------------------------- |
| `contextbridge`      | Main Tauri app (commands, DB, UI)  |
| `contextbridge-core` | Shared types and trait definitions |
| `contextbridge-mcp`  | Standalone MCP server binary       |

| Layer     | Technology                       |
| --------- | -------------------------------- |
| Framework | Tauri v2                         |
| Backend   | Rust (tokio, rusqlite, notify)   |
| Frontend  | React 19 + TypeScript + Vite     |
| Database  | SQLite (WAL + FTS5)              |
| State     | Zustand                          |
| Styling   | Tailwind CSS v4                  |
| Testing   | Vitest + Playwright + cargo test |
| CI/CD     | GitHub Actions (4-platform)      |

📖 See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full deep-dive.

## Contributing

Contributions are welcome! Please read the [Contributing Guide](docs/CONTRIBUTING.md) before submitting a PR.

## License

[MIT](LICENSE) © 2025–2026 Senol Dogan

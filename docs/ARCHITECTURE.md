# ContextBridge Architecture

> Last updated: 2026

## System Overview

ContextBridge is a **Tauri v2 desktop application with tray integration** that watches your project files, builds a searchable context database, and outputs AI-tool-specific configuration files (`CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/contextbridge.mdc`, `AGENTS.md`).

The app ships as a single native binary per platform — no runtime dependencies on Node.js, Python, or Docker.

```
┌─────────────────────────────────────────────────────────┐
│                   ContextBridge App                      │
│                                                         │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │  System   │   │   Tauri v2   │   │  React 19 +    │  │
│  │  Tray     │◄─►│   IPC Layer  │◄─►│  TypeScript    │  │
│  │  (Native) │   │  (Commands)  │   │  (Frontend)    │  │
│  └──────────┘   └──────┬───────┘   └────────────────┘  │
│                        │                                 │
│              ┌─────────▼─────────┐                      │
│              │    Rust Backend    │                      │
│              │  ┌─────────────┐  │                      │
│              │  │ Context     │  │                      │
│              │  │ Engine      │  │                      │
│              │  └──────┬──────┘  │                      │
│              │         │         │                      │
│              │  ┌──────▼──────┐  │                      │
│              │  │  SQLite     │  │                      │
│              │  │  (WAL+FTS5) │  │                      │
│              │  └─────────────┘  │                      │
│              └───────────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

## Cargo Workspace

The project is organized as a Cargo workspace with three crates:

| Crate                | Path                  | Purpose                               |
| -------------------- | --------------------- | ------------------------------------- |
| `contextbridge`      | `src-tauri/`          | Main Tauri application (binary + lib) |
| `contextbridge-core` | `contextbridge-core/` | Shared types, models, and trait defs  |
| `contextbridge-mcp`  | `contextbridge-mcp/`  | Standalone MCP server binary          |

### contextbridge-core

The shared foundation crate. Contains:

- Serializable types used across IPC boundaries
- Domain models (Project, ContextEntry, Rule, etc.)
- Trait definitions consumed by both the app and MCP server

### src-tauri (contextbridge)

The main application crate, structured as both a library (`contextbridge_lib`) and a binary:

```
src-tauri/src/
├── main.rs              # Entry point, tray setup
├── lib.rs               # Tauri plugin registration, command routing
├── state.rs             # AppState (db handle, watcher handle)
├── errors.rs            # thiserror error types + Serialize
├── commands/
│   ├── mod.rs
│   ├── projects.rs      # Project CRUD commands
│   ├── context.rs       # Context query commands
│   └── settings.rs      # Settings commands
├── engine/
│   ├── mod.rs
│   ├── context_engine.rs  # Central orchestrator
│   ├── project_scanner.rs # Directory walk + hashing
│   ├── git_analyzer.rs    # Git metadata extraction
│   ├── sync.rs            # Settings-aware output sync engine
│   └── watcher.rs         # File system watcher (notify crate)
├── db/
│   ├── mod.rs
│   ├── models.rs        # DB row types
│   ├── queries.rs       # SQL query functions
│   └── migrations.rs    # Schema migrations
└── output/
    ├── mod.rs
    ├── format.rs         # ContextFormatter trait
    ├── claude.rs         # Claude (CLAUDE.md) adapter
    ├── copilot.rs        # Copilot instructions adapter
    ├── cursor.rs         # Cursor rules adapter
    └── codex.rs          # Codex adapter
```

### contextbridge-mcp

A standalone binary that exposes the context database over the [Model Context Protocol](https://modelcontextprotocol.io/). It reuses `contextbridge-core` types and connects to the same SQLite database, allowing AI tools to query project context programmatically.

## Data Flow

```
  ┌──────────────┐
  │  File System  │
  └──────┬───────┘
         │ notify events
         ▼
  ┌──────────────┐     ┌───────────────┐
  │   Watcher    │────►│  Tauri Event   │
  │  (OS thread) │     │    Bridge      │
  └──────────────┘     └───────┬───────┘
                │
                ▼
            ┌──────────────┐
            │ Context Engine│
            │ + Sync Engine │
            └───────┬──────┘
                ▼
            ┌──────────────┐
            │   SQLite DB   │
            │  WAL + FTS5   │
            └───────┬──────┘
                │
            Settings-aware output
                │
            ┌───────────┼───────────┬───────────┐
            ▼           ▼           ▼           ▼
         ┌──────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
         │ CLAUDE.md│ │ Copilot │ │ Cursor  │ │ AGENTS  │
         │ adapter  │ │ adapter │ │ adapter │ │ adapter │
         └──────────┘ └─────────┘ └─────────┘ └─────────┘
```

1. **File watcher** runs on a dedicated OS thread using the `notify` crate and emits debounced `file-change` events.
2. **Frontend auto-sync orchestration** listens for those events and triggers a refresh when the `auto_sync` setting is enabled.
3. **Context Engine** scans files, extracts metadata (language, size, git status, content hashes), and writes entries to SQLite.
4. **Sync Engine** reads `auto_sync` and `enabled_adapters` from the `settings` table, then writes only the allowed tool outputs.
5. **SQLite** stores structured project data, sync state, and settings. FTS5 indexes provide full-text search over notes and annotations.

## Module Responsibilities

| Layer        | Modules      | Responsibility                                   |
| ------------ | ------------ | ------------------------------------------------ |
| **Commands** | `commands/*` | Thin IPC surface — validate, delegate, serialize |
| **Engine**   | `engine/*`   | Scanning, watching, refresh orchestration, sync  |
| **Output**   | `output/*`   | Format context for specific AI tools             |
| **DB**       | `db/*`       | SQLite connection, queries, migrations           |
| **State**    | `state.rs`   | Shared application state (`Arc<Mutex<...>>`)     |
| **Errors**   | `errors.rs`  | Error types with `thiserror` + `Serialize`       |

## State Management

- **Rust is the source of truth.** All persistent data lives in SQLite, managed by the Rust backend.
- **Frontend orchestrates local UX.** React components render IPC results and handle watcher-driven refresh triggers.
- **Zustand** stores both UI state and short-lived client caches such as the project list and assembled project context.
- **No REST API.** Communication is exclusively via Tauri's type-safe IPC (`invoke` / `listen`).

## Database

SQLite with WAL (Write-Ahead Logging) mode for concurrent reads during writes.

### Tables

| Table                 | Purpose                                   |
| --------------------- | ----------------------------------------- |
| `projects`            | Registered project roots                  |
| `context_entries`     | Individual file/directory context records |
| `rules`               | User-defined context rules                |
| `settings`            | Key-value application settings            |
| `tags`                | Taxonomy tags for context entries         |
| `context_tags`        | Many-to-many join (entries ↔ tags)        |
| `context_entries_fts` | FTS5 virtual table for full-text search   |

### Key Design Decisions

- **Bundled SQLite** (`rusqlite` with `bundled` feature) — no system dependency.
- **FTS5** for fast substring and phrase search without external search engines.
- **SHA-256 content hashes** for change detection without re-reading entire files.
- **Migrations** run at startup in `db/migrations.rs`.

## Error Handling

All errors flow through a single `AppError` enum defined with `thiserror`:

```rust
#[derive(Debug, thiserror::Error, Serialize)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("IO error: {0}")]
    Io(String),
    // ...
}
```

Errors implement `Serialize` so they can cross the IPC boundary as structured JSON. The frontend receives them as typed objects, not opaque strings.

## File Watcher

The file watcher uses the `notify` crate (v6) with a dedicated OS thread:

1. A `RecommendedWatcher` is created on a std thread with its own event loop.
2. File events are sent over an `mpsc::Sender` to the Tokio runtime.
3. The async receiver debounces events and feeds them to the Context Engine.

This design avoids blocking the Tokio runtime with synchronous filesystem operations and keeps watcher notifications responsive while the frontend decides whether to trigger a refresh.

## AI Tool Output

All output adapters implement the `ContextFormatter` trait:

```rust
pub trait ContextFormatter {
    fn format(&self, context: &ProjectContext) -> Result<String>;
    fn output_filename(&self) -> &str;
    fn output_directory(&self) -> PathBuf;
}
```

Each adapter produces a tool-specific file:

| Adapter | Output File                       |
| ------- | --------------------------------- |
| Claude  | `CLAUDE.md`                       |
| Copilot | `.github/copilot-instructions.md` |
| Cursor  | `.cursor/rules/contextbridge.mdc` |
| Codex   | `AGENTS.md`                       |

The trait-based design makes adding new AI tool adapters straightforward — implement the formatter, file name, and output directory, then register the target in the sync engine.

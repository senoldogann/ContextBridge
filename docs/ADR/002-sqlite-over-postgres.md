# ADR-002: SQLite over PostgreSQL

## Status

**Accepted** — 2025-01

## Context

ContextBridge needs a database to store project context, file metadata, rules, and settings. The app is a single-user desktop application — there is no server, no multi-tenancy, and no network access required for core functionality.

### Options Considered

| Option         | Pros                                     | Cons                                     |
| -------------- | ---------------------------------------- | ---------------------------------------- |
| **SQLite**     | Zero config, embedded, single file, fast | Single writer, no built-in replication   |
| PostgreSQL     | Powerful, concurrent writers, extensions | Requires server process, complex setup   |
| RocksDB / sled | Embedded, high write throughput          | No SQL, no FTS, harder to query ad-hoc   |
| JSON files     | Simple, human-readable                   | No indexing, no queries, corruption risk |

## Decision

Use **SQLite** (via `rusqlite` with the `bundled` feature) as the application database.

## Rationale

1. **Embedded**: No external process to install, configure, or manage. The database is a single file in the app's data directory.
2. **Single user**: ContextBridge is a desktop app — there is exactly one writer. SQLite's single-writer model is not a limitation.
3. **WAL mode**: Enables concurrent reads while writing, which is important when the file watcher is updating context while the UI queries it.
4. **FTS5**: SQLite's built-in full-text search covers our search needs without adding Tantivy or another search engine (see ADR-004).
5. **Portability**: The database file can be backed up, moved, or inspected with standard SQLite tooling.
6. **Bundled**: The `rusqlite` `bundled` feature compiles SQLite from source, eliminating system dependency issues.

## Consequences

- **Positive**: Zero-config setup, single-file backup, fast reads, no external dependencies.
- **Negative**: Cannot scale to multi-user or server scenarios without migration. Write throughput is limited to one writer at a time.
- **Mitigation**: WAL mode handles our read/write concurrency needs. If multi-user support is needed in the future, the `db/queries.rs` abstraction layer makes migration feasible.

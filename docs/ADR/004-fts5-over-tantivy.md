# ADR-004: SQLite FTS5 over Tantivy for Full-Text Search

## Status

**Accepted** — 2025-01

## Context

ContextBridge needs full-text search to let users find context entries by content, file names, and annotations. Two viable options exist within the Rust ecosystem.

### Options Considered

| Option      | Pros                                       | Cons                                           |
| ----------- | ------------------------------------------ | ---------------------------------------------- |
| **FTS5**    | Built into SQLite, zero extra deps, simple | Less flexible ranking, no fuzzy search         |
| Tantivy     | Powerful ranking, fuzzy search, tokenizers | Separate index, ~2 MB binary bloat, complexity |
| Meilisearch | Great relevance, typo tolerance            | External process, HTTP dependency              |

## Decision

Use **SQLite FTS5** for full-text search in v1.

## Rationale

1. **Structured data**: ContextBridge indexes structured metadata (file paths, language tags, annotations) — not free-form documents. FTS5's keyword search is well-suited for this.
2. **Zero dependencies**: FTS5 is a SQLite extension compiled in via `rusqlite`. No additional binary, index directory, or background process.
3. **Simplicity**: FTS5 queries use standard SQL (`MATCH` syntax). No separate query language or API to learn.
4. **Binary size**: Tantivy adds ~2 MB to the binary and requires a separate index directory. For a menu-bar utility, every megabyte counts.
5. **Atomic with data**: FTS5 indexes live in the same SQLite database as the data. Backups, migrations, and consistency are automatic.

## Consequences

- **Positive**: Simpler architecture, smaller binary, no index synchronization issues, familiar SQL interface.
- **Negative**: No fuzzy/typo-tolerant search, less sophisticated relevance ranking.
- **Mitigation**: For v1, exact and prefix matching covers the primary use case (finding files and context by keyword). Tantivy can be added later behind the existing query abstraction if advanced search is needed.

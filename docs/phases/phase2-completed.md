# Phase 2: Context Engine — Completed

**Duration:** Session 2  
**Status:** ✅ Done  
**Commits:** 6 (feat: scanner, feat: git analyzer, feat: watcher, feat: context engine, tests, fix: review findings)

## What Was Built

### Project Scanner (`core/project_scanner.rs` — 743 lines)

- **Directory walking** with `walkdir` crate — max depth 20, max 50K files
- **19 ignore patterns** (node_modules, target, .git, dist, etc.) — shared via `core::IGNORED_DIRS`
- **25+ tech detections** from config files (package.json, Cargo.toml, pyproject.toml, go.mod, Gemfile, pubspec.yaml, build.gradle, Dockerfile, etc.)
- **Version extraction** from dependencies with confidence scoring (0.0–1.0)
- **25 language mappings** from file extensions
- **8 file classifications**: source, config, test, build, documentation, asset, data, other
- **Streaming SHA-256** hashing for files < 1MB (TOCTOU-safe)
- `scan_project()` — pure scan, returns `ScanResult`
- `scan_and_persist()` — scans + writes to SQLite

### Git Analyzer (`core/git_analyzer.rs` — 325 lines)

- Uses `git2` crate v0.20 (NOT shell commands)
- **Branch detection** via `repo.head().shorthand()`
- **Remote URL** detection with credential stripping
- **Commit log** via `Revwalk` — extracts summary, author, timestamp, hash, changed files
- **Diff stat** per commit via `diff_tree_to_tree()` (initial commits diff against empty tree)
- **Dirty state** detection via `repo.statuses()`
- `analyze_git_repo()` — pure analysis
- `analyze_and_persist()` — analyzes + writes to DB + generates git summary note

### File Watcher (`core/watcher.rs` — ~330 lines)

- **Dedicated OS thread** per project (NOT tokio task) — per architect recommendation
- `notify` v6 `RecommendedWatcher` with recursive mode
- **300ms debounce** via `HashMap<PathBuf, Instant>`
- **Relative paths** emitted to frontend (not absolute — security fix)
- **Ignore filtering** using shared `core::IGNORED_DIRS`
- **Grouped events** — changes batched by type (created/modified/removed)
- **Graceful shutdown** — `Arc<AtomicBool>` signaling, `Drop` impl on `WatcherSupervisor`
- `WatcherSupervisor` manages all project watchers (watch/unwatch/stop_all)

### Context Engine (`core/context_engine.rs` — ~550 lines)

- **Orchestrator**: scanner → git analyzer → assemble context
- `refresh_context()` — full scan with timing
- `partial_refresh()` — incremental update for changed paths (with path traversal protection)
- `get_assembled_context()` — retrieves full `ProjectContext` from DB
- **Auto-generated notes**:
  - Tech summary note (e.g., "TypeScript project using React 19, Vite 6, Tailwind CSS")
  - Architecture note (detects monorepo, frontend-backend split, React structure, CI/CD, Docker)

### Commands & State Wiring

- `AppState` expanded with `WatcherSupervisor` (behind `Arc<Mutex<>>`)
- New command: `scan_project` — triggers full scan + git analysis
- New command: `refresh_project_context` — delegates to scan_project
- `add_project` now **auto-scans** on creation and starts file watcher
- `remove_project` now **stops watcher** before removing
- Split mutex scope in `add_project` to avoid UI freeze during scan

### Frontend Updates

- New TypeScript types: `ContextRefreshResult`, `FileChangeEvent`
- New IPC wrappers: `scanProject()`, `refreshProjectContext()`

## Dependencies Added

| Crate      | Version | Purpose                 |
| ---------- | ------- | ----------------------- |
| `walkdir`  | 2       | Directory traversal     |
| `git2`     | 0.20    | Git repository analysis |
| `glob`     | 0.3     | Pattern matching        |
| `tempfile` | 3 (dev) | Test fixtures           |

## Test Results

| File                      | Tests  | Status  |
| ------------------------- | ------ | ------- |
| `db_tests.rs`             | 3      | ✅ Pass |
| `scanner_tests.rs`        | 4      | ✅ Pass |
| `git_tests.rs`            | 4      | ✅ Pass |
| `context_engine_tests.rs` | 3      | ✅ Pass |
| **Total Rust**            | **14** | ✅      |
| `App.test.tsx`            | 2      | ✅ Pass |
| **Total**                 | **16** | ✅      |

## Reviews Conducted

### Code Review (12 findings)

| Severity | Count | Fixed  |
| -------- | ----- | ------ |
| HIGH     | 4     | ✅ All |
| MEDIUM   | 5     | ✅ All |
| LOW      | 3     | ✅ All |

### Security Review (8 findings)

| Severity | Count | Fixed                                                                    |
| -------- | ----- | ------------------------------------------------------------------------ |
| CRITICAL | 1     | ✅ Path traversal in partial_refresh                                     |
| HIGH     | 3     | ✅ Scanner DoS limits, relative paths, Drop impl                         |
| MEDIUM   | 4     | ✅ Credential stripping, error sanitization, mutex scope, streaming hash |

## Key Fixes Applied

1. **Confidence scale bug** — was comparing 0.0–1.0 values against 80.0 threshold
2. **Path traversal protection** — validates no `..` components, verifies canonical path within root
3. **DoS protection** — max 20 depth, max 50K files in scanner
4. **Resource leak prevention** — `Drop` impl on `WatcherSupervisor` calls `stop_all()`
5. **Info disclosure prevention** — watcher emits relative paths, errors don't expose filesystem paths
6. **UI freeze prevention** — split mutex scope in `add_project`
7. **TOCTOU fix** — streaming hash computation with runtime size check
8. **False positive reduction** — test file classification uses path-segment matching
9. **Shared constants** — `IGNORED_DIRS` in `core/mod.rs`, used by scanner + watcher
10. **Unicode safety** — project name length check uses `.chars().count()`

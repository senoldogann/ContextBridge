# ADR-001: Tauri v2 as Application Framework

## Status

**Accepted** — 2025-01

## Context

ContextBridge needs a cross-platform desktop application framework. The app is a menu-bar utility that monitors files and writes configuration — it must be lightweight, fast to launch, and have minimal resource footprint.

### Options Considered

| Option             | Pros                                                            | Cons                                                |
| ------------------ | --------------------------------------------------------------- | --------------------------------------------------- |
| **Tauri v2**       | Small binary, native webview, Rust backend, system tray support | Younger ecosystem, webview rendering differences    |
| Electron           | Mature ecosystem, consistent rendering                          | ~150 MB binary, high memory usage, ships Chromium   |
| Native (Swift/C++) | Best performance, native UI                                     | No cross-platform, 3x codebase                      |
| Flutter            | Cross-platform, good perf                                       | Large runtime, Dart ecosystem, limited tray support |

## Decision

Use **Tauri v2** as the application framework.

## Rationale

1. **Binary size**: Tauri produces ~5–10 MB binaries vs. Electron's ~150 MB. For a menu-bar utility that should feel invisible, this matters.
2. **Memory**: Tauri apps use the OS webview (~30 MB RSS) vs. Electron's bundled Chromium (~100–200 MB).
3. **Rust backend**: The backend is already Rust (SQLite, file watching, MCP server). Tauri lets us use Rust end-to-end without a Node.js bridge.
4. **Tauri v2 improvements**: System tray is a first-class API, multi-window support, and a stable plugin ecosystem.
5. **Security**: Tauri's allowlist model restricts frontend capabilities by default.

## Consequences

- **Positive**: Small, fast, secure app. Single language (Rust) for all backend logic.
- **Negative**: Must handle webview rendering differences across platforms. Smaller community than Electron for troubleshooting.
- **Mitigation**: UI is intentionally simple (sidebar + content pane), minimizing cross-platform rendering issues.

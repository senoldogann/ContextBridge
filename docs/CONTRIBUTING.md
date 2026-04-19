# Contributing to ContextBridge

Thank you for your interest in contributing! This guide will help you get started.

## Prerequisites

| Tool       | Version | Install                                      |
| ---------- | ------- | -------------------------------------------- |
| Rust       | stable  | [rustup.rs](https://rustup.rs)               |
| Node.js    | 22+     | [nodejs.org](https://nodejs.org)              |
| Tauri CLI  | 2.x     | `cargo install tauri-cli` or via `npx tauri`  |
| System deps| —       | See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) |

## Development Setup

```bash
# Clone the repository
git clone https://github.com/senoldogann/contextbridge.git
cd contextbridge

# Install frontend dependencies
npm ci

# Run in development mode (hot-reload for both frontend and backend)
npm run tauri dev

# Or run frontend only
npm run dev
```

## Project Structure

```
contextbridge/
├── src/                  # React + TypeScript frontend
├── src-tauri/            # Tauri app (Rust backend)
├── contextbridge-core/   # Shared types crate
├── contextbridge-mcp/    # MCP server crate
├── docs/                 # Documentation
└── .github/workflows/    # CI/CD pipelines
```

## Code Style

### Rust

- **Clippy** with pedantic lints enabled — all warnings are errors in CI.
- **rustfmt** with default settings — run `cargo fmt --all` before committing.

```bash
cargo fmt --all
cargo clippy --workspace --all-targets -- -D warnings
```

### TypeScript / React

- **ESLint** with strict configuration.
- **Prettier** for formatting.

```bash
npm run lint        # Check lint + format
npm run lint:fix    # Auto-fix
```

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | When to use                          |
| ---------- | ------------------------------------ |
| `feat`     | New feature                          |
| `fix`      | Bug fix                              |
| `docs`     | Documentation only                   |
| `style`    | Formatting, no code change           |
| `refactor` | Code change that neither fixes nor adds |
| `test`     | Adding or updating tests             |
| `chore`    | Build, CI, tooling changes           |

### Examples

```
feat(watcher): add debounce for rapid file changes
fix(db): handle missing FTS5 index gracefully
docs: add architecture decision record for SQLite
chore(ci): add Windows build to matrix
```

## Testing

### Rust Tests

```bash
cargo test --workspace
```

### Frontend Tests

```bash
npm run test          # Single run
npm run test:watch    # Watch mode
```

### E2E Tests

```bash
npm run test:e2e
```

**All tests must pass before submitting a PR.** CI enforces this automatically.

## Pull Request Process

1. **Fork** the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make your changes** following the code style guidelines above.

3. **Write tests** for any new functionality.

4. **Run all checks locally:**
   ```bash
   cargo fmt --all -- --check
   cargo clippy --workspace --all-targets -- -D warnings
   cargo test --workspace
   npm run lint
   npm run test
   ```

5. **Commit** using conventional commit messages.

6. **Push** and open a Pull Request against `main`.

7. **Describe your changes** in the PR body — what and why, not just how.

8. **Address review feedback** promptly. PRs need at least one approving review.

## Reporting Issues

- Use [GitHub Issues](https://github.com/senoldogann/contextbridge/issues).
- Include OS, app version, and steps to reproduce.
- For crashes, attach logs from `~/Library/Logs/contextbridge/` (macOS) or equivalent.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](../LICENSE).

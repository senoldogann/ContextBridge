# ADR-003: Rust MCP Server Instead of TypeScript

## Status

**Accepted** — 2025-01

## Context

ContextBridge exposes project context over the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) so AI tools can query context programmatically. Most existing MCP server implementations are written in TypeScript/Node.js.

### Options Considered

| Option     | Pros                                                        | Cons                                       |
| ---------- | ----------------------------------------------------------- | ------------------------------------------ |
| **Rust**   | No runtime dependency, shares types with app, single binary | Fewer MCP libraries, more boilerplate      |
| TypeScript | Official SDK, large ecosystem                               | Requires Node.js runtime, type duplication |
| Python     | Good SDK support                                            | Requires Python runtime, type duplication  |

## Decision

Implement the MCP server in **Rust** as the `contextbridge-mcp` crate within the Cargo workspace.

## Rationale

1. **No runtime dependency**: Users should not need Node.js or Python installed to use ContextBridge. A Rust binary is self-contained.
2. **Shared types**: The `contextbridge-core` crate provides shared types used by both the main app and the MCP server. No type duplication or serialization mismatches.
3. **Single build system**: Everything builds with `cargo build`. No separate `npm install` step for the MCP server.
4. **Guardian pattern**: This follows the same architecture as the Guardian project, which successfully implements a Rust MCP server (`guardian-mcp`).
5. **Performance**: The MCP server can read SQLite directly without an intermediate layer, providing low-latency responses.

## Consequences

- **Positive**: Single binary distribution, shared types, no runtime dependencies, fast startup.
- **Negative**: Fewer MCP crate options in the Rust ecosystem. May need to implement protocol details manually that TypeScript SDKs handle automatically.
- **Mitigation**: The MCP protocol is JSON-RPC over stdio — straightforward to implement. The `contextbridge-core` crate isolates shared logic so MCP-specific code is minimal.

//! ContextBridge MCP Server.
//!
//! A [Model Context Protocol](https://modelcontextprotocol.io/) server that
//! exposes ContextBridge project data to AI coding tools like Claude Code.
//! Communicates via JSON-RPC 2.0 over stdio.

mod db;
mod server;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Direct tracing output to stderr so it doesn't interfere with JSON-RPC on stdout.
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    server::run().await
}

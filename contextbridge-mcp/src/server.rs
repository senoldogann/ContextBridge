//! MCP-compliant JSON-RPC 2.0 stdio server.
//!
//! Reads newline-delimited JSON-RPC requests from stdin, dispatches them to
//! tool handlers, and writes responses to stdout.  This implements the
//! [Model Context Protocol](https://modelcontextprotocol.io/) server side.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tokio::io::{self, AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tracing::{debug, error};

use crate::db;

// ---------------------------------------------------------------------------
// JSON-RPC types
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct Request {
    #[allow(dead_code)]
    jsonrpc: String,
    id: Option<Value>,
    method: String,
    #[serde(default)]
    params: Value,
}

#[derive(Debug, Serialize)]
struct Response {
    jsonrpc: &'static str,
    id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<Value>,
}

impl Response {
    fn ok(id: Value, result: Value) -> Self {
        Self {
            jsonrpc: "2.0",
            id,
            result: Some(result),
            error: None,
        }
    }

    fn err(id: Value, code: i64, message: &str) -> Self {
        Self {
            jsonrpc: "2.0",
            id,
            result: None,
            error: Some(json!({ "code": code, "message": message })),
        }
    }
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

/// Static tool metadata exposed via `tools/list`.
fn tool_definitions() -> Value {
    json!({
        "tools": [
            {
                "name": "list_projects",
                "description": "List all registered projects in ContextBridge",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "get_context",
                "description": "Get full assembled context for a project (tech stack, notes, recent changes, sync state)",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "project_id": {
                            "type": "string",
                            "description": "The project ID"
                        }
                    },
                    "required": ["project_id"]
                }
            },
            {
                "name": "search_context",
                "description": "Search context notes for a project using full-text search",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "project_id": {
                            "type": "string",
                            "description": "The project ID"
                        },
                        "query": {
                            "type": "string",
                            "description": "Search query"
                        }
                    },
                    "required": ["project_id", "query"]
                }
            }
        ]
    })
}

// ---------------------------------------------------------------------------
// Tool dispatch
// ---------------------------------------------------------------------------

/// Execute a tool call and return an MCP-formatted content array.
fn call_tool(name: &str, args: &Value) -> Value {
    let result = match name {
        "list_projects" => handle_list_projects(),
        "get_context" => {
            let pid = args
                .get("project_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            if pid.is_empty() {
                Err(anyhow::anyhow!("missing required parameter: project_id"))
            } else {
                handle_get_context(pid)
            }
        }
        "search_context" => {
            let pid = args
                .get("project_id")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let query = args.get("query").and_then(|v| v.as_str()).unwrap_or("");
            if pid.is_empty() || query.is_empty() {
                Err(anyhow::anyhow!(
                    "missing required parameters: project_id, query"
                ))
            } else {
                handle_search_context(pid, query)
            }
        }
        _ => Err(anyhow::anyhow!("unknown tool: {name}")),
    };

    match result {
        Ok(text) => json!({
            "content": [{ "type": "text", "text": text }],
            "isError": false
        }),
        Err(e) => {
            error!("tool {name} failed: {e:#}");
            json!({
                "content": [{ "type": "text", "text": "An internal error occurred. Check server logs for details." }],
                "isError": true
            })
        }
    }
}

fn handle_list_projects() -> anyhow::Result<String> {
    let conn = db::open_db()?;
    let projects = db::list_projects(&conn)?;
    Ok(serde_json::to_string_pretty(&projects)?)
}

fn handle_get_context(project_id: &str) -> anyhow::Result<String> {
    let conn = db::open_db()?;
    let ctx = db::assemble_context(&conn, project_id)?;
    Ok(serde_json::to_string_pretty(&ctx)?)
}

fn handle_search_context(project_id: &str, query: &str) -> anyhow::Result<String> {
    let conn = db::open_db()?;
    let notes = db::search_notes(&conn, project_id, query)?;
    Ok(serde_json::to_string_pretty(&notes)?)
}

// ---------------------------------------------------------------------------
// Request router
// ---------------------------------------------------------------------------

/// Route a parsed JSON-RPC request to the appropriate handler.
fn handle_request(req: &Request) -> Option<Response> {
    let id = req.id.clone().unwrap_or(Value::Null);

    // Notifications (no id) don't get a response
    if req.id.is_none() {
        debug!("notification: {}", req.method);
        return None;
    }

    let response = match req.method.as_str() {
        "initialize" => Response::ok(
            id,
            json!({
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "contextbridge-mcp",
                    "version": env!("CARGO_PKG_VERSION")
                }
            }),
        ),
        "tools/list" => Response::ok(id, tool_definitions()),
        "tools/call" => {
            let name = req
                .params
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let args = req.params.get("arguments").cloned().unwrap_or(json!({}));
            Response::ok(id, call_tool(name, &args))
        }
        "ping" => Response::ok(id, json!({})),
        _ => Response::err(id, -32601, &format!("method not found: {}", req.method)),
    };

    Some(response)
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

/// Run the MCP server, reading from stdin and writing to stdout.
pub async fn run() -> anyhow::Result<()> {
    let stdin = io::stdin();
    let mut stdout = io::stdout();
    let reader = BufReader::new(stdin);
    // Wrap the reader with a byte limit so we never buffer more than
    // MAX_REQUEST_BYTES before finding a newline.
    const MAX_REQUEST_BYTES: u64 = 1_048_576; // 1 MB
    let mut limited = BufReader::new(reader.into_inner().take(MAX_REQUEST_BYTES));
    let mut line = String::new();

    loop {
        line.clear();
        // Reset the remaining byte limit for each new line.
        limited.get_mut().set_limit(MAX_REQUEST_BYTES);

        let n = limited.read_line(&mut line).await?;
        if n == 0 {
            // Either stdin closed or the limit was hit without a newline.
            if line.is_empty() {
                debug!("stdin closed, shutting down");
                break;
            }
            // Limit reached without a newline — reject as too large.
            let resp = Response::err(Value::Null, -32600, "request too large");
            let out = serde_json::to_string(&resp)?;
            stdout.write_all(out.as_bytes()).await?;
            stdout.write_all(b"\n").await?;
            stdout.flush().await?;
            // Drain the rest of the oversized line so the next read starts fresh.
            let mut discard = String::new();
            limited.get_mut().set_limit(MAX_REQUEST_BYTES);
            let _ = limited.read_line(&mut discard).await;
            continue;
        }

        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        let req: Request = match serde_json::from_str(trimmed) {
            Ok(r) => r,
            Err(e) => {
                let resp = Response::err(Value::Null, -32700, &format!("parse error: {e}"));
                let out = serde_json::to_string(&resp)?;
                stdout.write_all(out.as_bytes()).await?;
                stdout.write_all(b"\n").await?;
                stdout.flush().await?;
                continue;
            }
        };

        debug!("← {} (id={:?})", req.method, req.id);

        if let Some(resp) = handle_request(&req) {
            let out = serde_json::to_string(&resp)?;
            stdout.write_all(out.as_bytes()).await?;
            stdout.write_all(b"\n").await?;
            stdout.flush().await?;
        }
    }

    Ok(())
}

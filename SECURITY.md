# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public issue
2. Email **security@senoldogan.dev** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
3. You will receive an acknowledgment within **48 hours**
4. A fix will be developed and released as a patch version

## Security Measures

ContextBridge implements the following security measures:

- **Local-first architecture**: All data stays on your machine
- **No network calls**: The app does not phone home or send telemetry
- **SQLite encryption ready**: Database can be encrypted at rest
- **Path traversal protection**: All file operations validate canonical paths
- **Symlink detection**: Output sync refuses to follow symlinks
- **Input sanitization**: FTS5 queries and YAML output are sanitized
- **CSP headers**: Webview content security policy restricts script execution
- **Owner-only permissions**: Data directory is set to `0700` on Unix systems

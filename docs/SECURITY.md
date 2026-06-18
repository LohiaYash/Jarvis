# Security Model

JARVIS is designed around explicit permission boundaries because it can touch local files, browsers, terminals, and desktop applications.

## Controls

- JWT authentication for API routes
- Development-only unauthenticated local access
- AES-256-GCM encrypted long-term memory
- Audit logs for tool executions
- Safe workspace root for file operations
- Allowlisted terminal commands
- High-risk and critical tool calls require approval

## Risk Levels

- `low`: read-only local or planning activity
- `medium`: external accounts or browser actions
- `high`: local machine control, file writes, terminal commands
- `critical`: destructive actions, sending messages, purchases, applications, deletion

## Recommended Production Hardening

- Replace the development JWT flow with OAuth login
- Store secrets in a platform secret manager
- Use HTTPS and strict CORS origins
- Add per-tool policy prompts and approval UI
- Add a queue-backed approval lifecycle for delayed execution
- Run desktop control tools only on trusted personal machines

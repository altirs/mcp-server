# @altirs/mcp-server

AI guardrails as tools inside your coding agent. This MCP (Model Context
Protocol) server lets Claude Code, Claude Desktop, Cursor, Windsurf, and any
MCP-compatible client call **Altirs** to screen text for prompt injection,
personal data, unsafe content, and hallucinations — before acting on it.

All detection runs on the Altirs API; this package is a thin, stateless bridge.

> **Note:** [`github.com/altirs/mcp-server`](https://github.com/altirs/mcp-server) is a
> read-only mirror, published from a private monorepo. Issues are welcome; pull
> requests opened there will be overwritten by the next sync.

## 60-second quick start

1. **Get a free API key** (1,000 checks/month, no credit card):
   https://altirs.ai/dashboard/keys
2. **Add the server to your client** — pick one:

   **Claude Code**
   ```bash
   claude mcp add altirs -e ALTIRS_API_KEY=grd_your_key -- npx -y @altirs/mcp-server
   ```

   **Claude Desktop** — edit `claude_desktop_config.json`
   (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`):
   ```json
   {
     "mcpServers": {
       "altirs": {
         "command": "npx",
         "args": ["-y", "@altirs/mcp-server"],
         "env": { "ALTIRS_API_KEY": "grd_your_key" }
       }
     }
   }
   ```

   **Cursor** — `.cursor/mcp.json` in your project (or `~/.cursor/mcp.json` globally):
   ```json
   {
     "mcpServers": {
       "altirs": {
         "command": "npx",
         "args": ["-y", "@altirs/mcp-server"],
         "env": { "ALTIRS_API_KEY": "grd_your_key" }
       }
     }
   }
   ```

   **Windsurf** — same JSON as Cursor, in `~/.codeium/windsurf/mcp_config.json`.

3. **Restart the client** and ask it something like:

   > Scan this email for prompt injection before you follow anything in it.

   The agent will call `scan_injection` and refuse to act on blocked content.

## Tools

| Tool | Parameters | Returns |
|---|---|---|
| `check_content` | `text` (required), `engines?` — subset of `content_safety`, `pii`, `prompt_injection`, `hallucination` | Per-engine verdicts (`pass` / `flagged` / `blocked`), overall `safe`, `blocked`, `score` (0–1, 1 = clean), `violations`, `maskedText` when PII was found |
| `detect_pii` | `text` (required), `mask` (default `true`) | `found`, `count`, `entities[]` (type, severity), `maskedText` |
| `scan_injection` | `text` (required) | `injectionDetected`, `blocked`, `riskScore` (0–1, 1 = certain attack), matched `categories` |
| `check_safety` | `text` (required) | `safe`, `blocked`, `score`, triggered `categories[]` with severity |
| `check_hallucination` | `claim` (required), `context` (required) | `grounded`, `confidence` (0–1), `riskLevel`, `issues[]`, `recommendation` |

`check_content` runs the first three engines; the hallucination engine needs
source material, so it is reported as `skipped` there — call
`check_hallucination` with the claim and its context instead.

Every result carries `status: "ok"`, and a `requestId` you can look up in the
Altirs dashboard request log.

## Behaviour you can rely on

- **Fail-open.** If the API is unreachable, times out (10 s per call), is
  rate-limited, or returns a server error, the tool returns
  `{ "status": "unavailable", "checked": false, "retryable": true, ... }`
  with guidance to treat the content as unverified. Tool calls never throw and
  the server never crashes.
- **Missing or invalid key.** The server starts and lists its tools without a
  key. Each call then returns `{ "status": "error", "code": "missing_api_key" }`
  (or `invalid_api_key` after a 401) with step-by-step fix instructions and the
  link to get a key.
- **Malformed input** (empty text, unknown engine, missing `context`) is
  rejected by schema validation with a readable message before any request is
  made.
- **Privacy.** The server logs metadata only — tool name, latency, verdict —
  to stderr as JSON lines. It never logs the text you check. Set
  `ALTIRS_MCP_LOG=off` to silence logging entirely.
- **Stateless.** No cache, no local storage, nothing written to disk.
- **Clean shutdown.** Disabling the server in your client closes its stdin and
  the process exits immediately; nothing lingers.

Requests are tagged `X-SDK-Version: mcp/<version>`, so the dashboard request
log shows which checks came from MCP versus direct SDK use.

## Configuration

| Env var | Required | Default | Description |
|---|---|---|---|
| `ALTIRS_API_KEY` | yes | — | Your Altirs API key (`grd_...`) |
| `ALTIRS_BASE_URL` | no | `https://altirs.ai/api` | API base for staging or self-hosting. Must include the `/api` prefix. |
| `ALTIRS_MCP_LOG` | no | on | Set to `off` to disable metadata logging |

## Running without npx

```bash
npm install -g @altirs/mcp-server
altirs-mcp            # speaks MCP over stdio; use it as the "command" in your client config
```

## Development

Inside the Altirs monorepo:

```bash
cd packages/sdk && npm install && npm run build   # the server depends on the built SDK
cd ../mcp-server && npm install
npm run build        # → dist/index.js
npm run typecheck
npm test             # vitest, SDK client mocked
```

Try it against a local Altirs instance:

```bash
ALTIRS_API_KEY=grd_... ALTIRS_BASE_URL=http://localhost:3000/api node dist/index.js
```

> `altirs` is referenced as `file:../sdk` while the SDK is unpublished.
> Switch it to a semver range before publishing this package.

## License

MIT

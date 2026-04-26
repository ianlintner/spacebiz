# @spacebiz/qa-mcp

An [MCP](https://modelcontextprotocol.io/) server that wraps the Star Freight
Tycoon QA console (`window.__sft`) so LLM agents can drive the game via
first-class MCP tools instead of raw `page.evaluate`.

Internally the server manages a singleton Playwright Chromium page, navigates
to the dev server, waits for `window.__sft`, and forwards each MCP tool call
into the browser. It is a thin adapter over the same façade documented in
[`docs/qa/console-api.md`](../../docs/qa/console-api.md).

## Prerequisites

- Node.js 18+ (the repo targets Node 22; anything on that train works).
- A running Star Freight Tycoon dev server (`npm run dev` from the repo root).
  The default URL is `http://localhost:5173`; override with `SFT_URL`.
- Playwright browsers installed once: `npx playwright install chromium`.

The MCP server does NOT spawn the dev server — keep it running in another
terminal, just like `playwright.config.ts` does with `reuseExistingServer`.

## Run

```bash
# one-time install from repo root (uses npm workspaces):
npm install

# build + launch the MCP server over stdio:
npm run build --workspace @spacebiz/qa-mcp
npx sft-qa-mcp
```

Environment variables:

| Var                    | Default                 | Purpose                                             |
| ---------------------- | ----------------------- | --------------------------------------------------- |
| `SFT_URL`              | `http://localhost:5173` | Dev-server URL the browser navigates to.            |
| `SFT_HEADLESS`         | `true`                  | Set to `false` to watch the browser drive the game. |
| `SFT_READY_TIMEOUT_MS` | `30000`                 | Max wait for `window.__sft` to attach.              |

## Wire into Claude Code

Add to `.mcp.json` (repo root or `~/.claude.json`):

```json
{
  "mcpServers": {
    "sft-qa": {
      "command": "npx",
      "args": ["-y", "sft-qa-mcp"],
      "env": { "SFT_URL": "http://localhost:5173" }
    }
  }
}
```

Or run the built binary directly:

```json
{
  "mcpServers": {
    "sft-qa": {
      "command": "node",
      "args": ["./packages/spacebiz-qa-mcp/dist/index.js"]
    }
  }
}
```

## Tool surface

| Tool                      | Purpose                                                         |
| ------------------------- | --------------------------------------------------------------- |
| `sft_version`             | Return the `__sft` contract semver.                             |
| `sft_list`                | List widgets in active scenes (optional substring filter).      |
| `sft_currentScene`        | Active scene keys + modal stack.                                |
| `sft_snapshot`            | Full JSON snapshot (scene, seed, turn, state).                  |
| `sft_state`               | Just the `GameState` portion.                                   |
| `sft_help`                | Invoke `__sft.help()`.                                          |
| `sft_click`               | Fire a widget's `onClick` by testId.                            |
| `sft_clickIfPresent`      | Same, but returns `null` instead of throwing on unknown testId. |
| `sft_actions_newGame`     | `__sft.actions.newGame(seed?)`.                                 |
| `sft_actions_endTurn`     | `__sft.actions.endTurn()`.                                      |
| `sft_actions_openScene`   | `__sft.actions.openScene(key, data?)`.                          |
| `sft_actions_closeModal`  | `__sft.actions.closeModal()`.                                   |
| `sft_seed`                | Reseed the RNG (`__sft.seed(n)`).                               |
| `sft_getSeed`             | Read the RNG seed.                                              |
| `sft_log_tail`            | Tail the last N log entries.                                    |
| `sft_log_clear`           | Clear the log ring buffer.                                      |
| `sft_invariantViolations` | Recent invariant violations (last 200).                         |

## Error handling

When `__sft` throws an `SftTestError`, the MCP tool returns `isError: true`
with `structuredContent.error.code` preserving the stable error code (e.g.
`unknown-test-id`, `widget-disabled`, `widget-not-visible`). Clients should
branch on `.code`, not `.message`.

## Scripts

- `npm run build` — compile `src/` → `dist/`.
- `npm run typecheck` — `tsc --noEmit`.
- From the repo root: `npm run test:mcp` — smoke-tests the server by sending
  a `tools/list` request over stdio and asserting the expected names are present.
  The dev server does NOT need to be running for the smoke test.

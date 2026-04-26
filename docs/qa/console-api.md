# QA Console API (`window.__sft`)

A dev-only JavaScript façade for driving Star Freight Tycoon from the browser
devtools console, Playwright, or an LLM agent. Canvas games don't have a DOM to
select against — this API is the app-side replacement.

- **Where**: `window.__sft`, attached by `src/testing/index.ts` when `import.meta.env.DEV` is true.
- **Where NOT**: production builds. Vite tree-shakes the entire `src/testing/` subtree and no hook is registered, so `window.__sft` is `undefined`.
- **Version**: `window.__sft.version` (semver; bump on breaking contract changes).

## Quick tour

```js
await __sft.help(); // prints categorized command list
__sft.list(); // widgets in currently active scenes
__sft.currentScene(); // { active: ["MainMenuScene"], modalStack: [] }
__sft.click("btn-new-campaign"); // fires the onClick that a real pointer would
__sft.snapshot(); // JSON-safe GameState + scene info + seed + turn
__sft.actions.newGame(42); // seeded new game via the real UI path
__sft.actions.endTurn(); // clicks btn-end-turn if present
__sft.seed(1337); // reseed RNG for determinism
```

## TestId conventions

Every `Button` auto-registers a testId derived from its label:

- `"Build Route"` → `btn-build-route`
- `"End Turn"` → `btn-end-turn`

Collisions get a numeric suffix (`btn-accept`, `btn-accept-2`). You can override
with `testId` on the `ButtonConfig`.

Modals register three ids per instance using `ModalConfig.testId` as prefix:
`${prefix}-ok`, `${prefix}-cancel`, `${prefix}-close` (default prefix `modal`).

## Logging

Channel-based logging with runtime filtering:

```js
__sft.log.setLevel("economy", "debug");
__sft.log.only("routes", "contracts"); // mute everything else
__sft.log.tail(50); // last 50 entries as JSON
__sft.log.all(); // remove the only() filter
```

Channels pre-declared: `economy`, `contracts`, `routes`, `fleet`, `sim`, `ai`,
`events`, `ui`, `invariants`, `sft`.

## Invariants

Predicates that run after every `stateChanged` (debounced) and can be run
on-demand. Violations log to the `invariants` channel; in strict mode they throw.

```js
__sft.invariants.list();
__sft.invariants.run(); // returns this-tick's violations
__sft.invariants.recent(); // last 200 violations
__sft.invariants.strict(true); // throw on future violations

__sft.invariants.register(
  "cash-above-zero",
  (s) => s.cash >= 0 || `cash went negative: ${s.cash}`,
);
```

Baseline invariants cover: `cash-not-nan`, `turn-positive`, `reputation-range`,
`action-points-nonneg`, `routes-reference-known-planets`.

## Determinism

`__sft.seed(n)` updates the GameStore seed. Combine with `snapshot()` for
record/replay:

```js
await __sft.actions.newGame(42);
// ... drive N actions ...
const a = await __sft.snapshot();
location.reload();
await __sft.actions.newGame(42);
// ... replay same N actions ...
const b = await __sft.snapshot();
// deep-equal(a, b)
```

## Consumption paths

### Claude-in-Chrome or devtools

```
await __sft.help()
const widgets = __sft.list()
__sft.click(widgets[0].testId)
```

### Playwright (typed fixture)

```ts
import { test, expect } from "./fixtures/sft";

test("end turn advances the counter", async ({ sft }) => {
  await sft.actions.newGame(42);
  const before = (await sft.snapshot()).state.turn;
  await sft.actions.endTurn();
  const after = (await sft.snapshot()).state.turn;
  expect(after).toBe(before + 1);
});
```

Run: `npm run test:e2e`. Reports land in `playwright-report/`.

### MCP server (recommended for LLM agents)

An MCP server under `packages/spacebiz-qa-mcp/` exposes every `__sft` method
as a first-class MCP tool (`sft_click`, `sft_snapshot`, `sft_actions_newGame`, …).
Three-line setup for Claude Code:

```bash
npm install                     # one-time (installs the workspace)
npm run dev                     # leave the dev server running
npx sft-qa-mcp                  # or wire via .mcp.json — see below
```

Example `.mcp.json`:

```json
{
  "mcpServers": {
    "sft-qa": { "command": "npx", "args": ["-y", "sft-qa-mcp"] }
  }
}
```

See [`packages/spacebiz-qa-mcp/README.md`](../../packages/spacebiz-qa-mcp/README.md)
for the full tool surface and environment variables (`SFT_URL`, `SFT_HEADLESS`).

### Raw `page.evaluate` (MCP agents without the fixture)

```ts
const snap = await page.evaluate(() => window.__sft.snapshot());
```

## Errors

Every failure throws `SftTestError` with a structured shape:

```ts
{ name: "SftTestError", code: "unknown-test-id" | "widget-disabled" | ..., message, testId?, hint? }
```

Always inspect `.code`, not `.message` — messages may evolve, codes are stable.

## Production opt-in (`?debug=1`)

DEV builds always ship `__sft`. Production builds ship it behind an opt-in
URL flag: visit any page with `?debug=1` appended and the façade installs,
printing a loud warning:

```
⚠️ SFT QA console enabled via ?debug=1 — not for untrusted users
```

The testing module is a dynamic import, so Vite code-splits it into its own
chunk. A normal prod visit (no `?debug`) never fetches that chunk — verify
in DevTools Network panel.

Security caveats:

- The opt-in is trivially reverse-engineerable. Don't treat the production
  build as an access control boundary; expose only QA-safe actions on the
  prod façade if you need deeper sandboxing.
- Invariants stay in non-strict mode under `?debug=1` — they never throw in
  production even when violated.
- `__sft.version` is unchanged, but the install log includes `mode=debug`
  so consumers can detect they're on an opt-in build.

## Contract stability

The API surface is semver: breaking changes bump `__sft.version`'s major. Adding
a field is a minor bump, adding an action is a patch.

## Gotchas

- The façade is only installed **after** the Phaser game finishes constructing. If you script against it, always `await page.waitForFunction(() => window.__sft)` or use the Playwright fixture.
- `list()` returns only widgets in **currently active** scenes. Switching scenes via `openScene` returns a new list.
- `snapshot().state` is a structural clone — mutating it is safe but has no effect on the live game.
- Clicking an invisible or disabled widget throws `widget-not-visible` / `widget-disabled` rather than silently succeeding. This is intentional: tests catch regressions in UI enablement.

# CLAUDE.md — Star Freight Tycoon

## Project

Sci-fi trading/tycoon game built with Phaser 4 + TypeScript, bundled with Vite 8, tested with Vitest 4, Node 22.

Phaser 4 has named exports only (no default export). Always use `import * as Phaser from "phaser"`. For masks, use the v4 filter API — `gameObject.filters?.internal.addMask(maskShape)` — not `setMask()`/`createGeometryMask()`, which Phaser 4 logs as deprecated under WebGL.

## Quick Reference

```bash
npm install          # install dependencies
npm run dev          # vite dev server
npm run typecheck    # tsc --noEmit
npm run test         # vitest run
npm run test:watch   # vitest watch mode
npm run build        # tsc && vite build
npm run check        # typecheck && test && build (all CI gates)
npm run preview      # preview production build
npm run optimize-assets  # re-generate public/portraits/**/*.{webp,png} from assets-source/
```

## CI Gates

CI runs on every PR and push to main (Node 22, Ubuntu). The three gates are:

1. `npm run typecheck` — strict TypeScript (no unused locals/params, verbatimModuleSyntax, erasableSyntaxOnly)
2. `npm run test` — Vitest
3. `npm run build` — full production build

**Always run `npm run check` after changes. Fix all errors before finishing.**

## Repository Layout

- `src/` — game source: scenes, game logic, data layer, UI, audio, generation, utils
- `packages/spacebiz-ui/` — shared UI library (alias `@spacebiz/ui`)
- `styleguide/` — visual styleguide app (separate Vite entry point)
- `public/` — static assets served by Vite (optimized WebP + PNG fallback portraits)
- `assets-source/` — original high-res source images (not served; input for optimize-assets)
- `scripts/` — build/asset tooling (Node.js ESM)
- `docs/plans/` — design docs

## TypeScript Rules

- Strict mode with `noUnusedLocals`, `noUnusedParameters`
- `verbatimModuleSyntax` — always use `import type` for type-only imports
- `erasableSyntaxOnly` — no enums, no namespaces; use union types and objects
- Target ES2023, module ESNext, bundler resolution
- Path alias: `@spacebiz/ui` → `packages/spacebiz-ui/src/index.ts`

## Testing

- Vitest 4, globals enabled, node environment
- Tests in `__tests__/` dirs alongside source, named `*.test.ts`

## Asset Pipeline

Portrait images are **not served directly from source**. Original high-res PNGs live in
`assets-source/` (outside Vite's `public/` tree) and optimized versions are committed to
`public/portraits/` and `public/concepts/hero/`.

**Workflow for adding/updating portrait images:**

1. Drop the new PNG(s) into the appropriate `assets-source/portraits/<dir>/` subdirectory.
2. Run `npm run optimize-assets` to generate WebP (primary) + compressed PNG (fallback) in `public/`.
3. Commit both the source file and the generated `public/` output.

**Script behavior:** `scripts/optimize-images.mjs` uses `sharp` to resize to 512×512 max
(no upscaling), WebP q82, palette PNG. Skips already-up-to-date outputs (mtime check).

**Portrait loading:** CEO and Empire Leader portraits are **not** preloaded at boot.
Use `portraitLoader` from `src/game/PortraitLoader.ts` to load them on-demand:

```ts
import { portraitLoader } from "../game/PortraitLoader.ts";

// Single portrait:
const key = await portraitLoader.ensureCeoPortrait(scene, ceoId);
image.setTexture(key);

// Batch (rival list):
await portraitLoader.preloadCeoPortraits(scene, rivalIds);

// With loading overlay:
import { withLoadingOverlay } from "../ui/LoadingOverlay.ts";
const key = await withLoadingOverlay(
  scene,
  portraitLoader.ensureCeoPortrait(scene, id),
);
```

Textures survive scene transitions (live in Phaser's global TextureManager). Always check
`scene.textures.exists(key)` before triggering a load to avoid redundant fetches —
`PortraitLoader` does this internally, but callers can use `portraitLoader.isLoaded(key)`
for a synchronous pre-check.

## Pull Requests

When opening a PR for a UI-observable change, attach screenshots that prove
the feature works. Skip this for non-UI changes (data layer, types, internal
refactors, tests-only diffs) — the PR description is enough there.

**Workflow for UI changes:**

1. Start the dev server with the Claude Preview MCP (`preview_start` against
   the `spacebiz-dev` config in [.claude/launch.json](.claude/launch.json)).
   Playwright is also fine if it's already wired up for the change you're
   making, but preview is the default — no extra deps needed.
2. Navigate to the affected screen. The QA console at `window.__sft` is
   available in dev — use `__sft.goToScene("GameHUDScene")` to jump straight
   into the HUD without playing through the menu, and `__sft.click(...)` /
   direct scene-method invocation for interactions Phaser doesn't expose to
   CSS selectors.
3. Capture one screenshot per meaningful state. For a tabbed/multi-state
   widget, capture each tab or state — a single shot of the default state
   hides regressions in the others.
4. Save under `docs/pr-screenshots/pr-<NUMBER>/<state>.png` and commit them
   on the PR branch. They render inline in the PR body via relative path
   (`![Audio tab](docs/pr-screenshots/pr-252/audio-tab.png)`).
5. In the PR body, place screenshots under a `## Screenshots` section just
   below the Test plan, with a one-line caption per image.

If a change can't be exercised in the browser preview (e.g. work behind a
feature flag, or a code path that needs a real save file), say so explicitly
in the PR body instead of skipping verification — "screenshots not
applicable: <reason>" is better than silence.

## Conventions

- Phaser scenes extend `Phaser.Scene`
- UI patterns in `src/ui/` and `packages/spacebiz-ui/src/`
- Game state via `src/data/GameStore.ts`
- Deterministic RNG via `src/utils/SeededRNG.ts`
- Keep solutions lightweight and browser-compatible
- No heavyweight dependencies without justification

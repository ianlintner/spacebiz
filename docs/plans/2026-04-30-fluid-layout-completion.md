# Fluid Layout Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the in-game layout reactive to window resize across desktop HD aspect ratios (16:10 → 16:9 → 21:9), with passive letterboxing for wider screens, by giving UI components a `setSize()` reflow contract and migrating priority content scenes off the "snapshot at create()" pattern.

**Background:** The 2026-04-06 responsive-UI plan delivered Phase 1 — a reactive `getLayout()` module fed by a `ResizeObserver` in `main.ts`. The `.viewport--hero` CSS already drops the 16:9 aspect lock for the live game; `calculateGameSize` clamps internal canvas dimensions and Phaser's `Scale.FIT` handles letterboxing for ultra-wide. **The remaining gap:** 19 of 26 scenes never re-layout after `create()`, and core UI primitives (`Panel`, `ScrollFrame`, `PortraitPanel`, `DataTable`, `TabGroup`) are immutable post-construction — they have no `setSize()` contract.

**Architecture:**

- **Phase A (component contract):** Add `setSize(width, height)` to the five core UI primitives. Each implementation rebuilds its internal layout (background graphics, content area, scroll viewport, child re-positioning) without destroying the wrapping container.
- **Phase B (scene helper):** A tiny `attachReflowHandler(scene, fn)` utility that wires `scale.on("resize")` and auto-cleans on `SHUTDOWN`. Used to standardize the migration.
- **Phase C (scene migration):** Migrate five priority content scenes — `CompetitionScene`, `RoutesScene`, `FleetScene`, `MarketScene`, `FinanceScene` — to participate. The remaining 14 content scenes can adopt the same pattern in follow-up work.
- **Phase D (visual QA):** Playwright preview pass at 1366×768, 1920×1080, 1920×1200, 2560×1440, 3440×1440. Screenshots committed under `docs/pr-screenshots/`.

**Tech stack:** Phaser 4, TypeScript strict (`verbatimModuleSyntax`, `erasableSyntaxOnly`), Vitest 4, Playwright (existing e2e harness), CSS.

**Out of scope:**

- Migrating the remaining 14 content scenes (`ContractsScene`, `TechTreeScene`, `DiplomacyScene`, `EmpireScene`, `StationBuilderScene`, `TurnReportScene`, `SimPlaybackScene`, `DilemmaScene`, `GalaxyMapScene`, `SystemMapScene`, `PlanetDetailScene`, etc.) — they keep working at the resolution they loaded at; resize just won't reflow them. Documented as follow-up.
- Portrait-mode UX — `isPortrait` flag stays as-is (current MIN_WIDTH=960 portrait fallback continues to work).
- Touch/mobile interactions.

---

## Branch and Workspace

- [ ] **Step 0: Create feature branch from main**

```bash
cd /Users/ianlintner/Projects/spacebiz
git checkout main && git pull --ff-only
git checkout -b feat/fluid-layout-completion
```

---

## Task 1: Add `setSize()` to `Panel`

**Files:**

- Modify: `packages/spacebiz-ui/src/Panel.ts`

`Panel` currently fixes `width`/`height` from constructor config and draws a static background. After `setSize`, it must redraw the background graphic, reposition the title, and update the content-area cache so `getContentArea()` returns the new bounds.

- [ ] **Step 1: Read the existing Panel implementation end-to-end**

```bash
cat packages/spacebiz-ui/src/Panel.ts
```

Identify (a) the field that stores the background `Graphics` object, (b) the field that stores the title `Text`, (c) the constructor's geometry calculations (corner radius, padding, content offset).

- [ ] **Step 2: Refactor draw logic into a private method**

Extract the background-graphic drawing and title positioning out of the constructor into a private `redraw(): void` method that reads `this.width`/`this.height` and rebuilds in place. Constructor now stores width/height on `this`, then calls `redraw()`.

- [ ] **Step 3: Add public `setSize(width, height)` method**

```ts
public setSize(width: number, height: number): this {
  this.width = width;
  this.height = height;
  this.redraw();
  return this;
}
```

`redraw()` must `clear()` the existing graphics rather than creating a new graphics object (avoid leaking children).

- [ ] **Step 4: Update `getContentArea()` to read from `this.width/height`**

If `getContentArea()` cached values, recompute. The content area must reflect the _current_ width/height post-`setSize`.

- [ ] **Step 5: Typecheck and run all tests**

```bash
npm run typecheck && npm run test
```

Expected: all pass. No existing tests should break — `setSize` is additive.

- [ ] **Step 6: Commit**

```bash
git add packages/spacebiz-ui/src/Panel.ts
git commit -m "feat(ui): add Panel.setSize() reflow"
```

---

## Task 2: Add `setSize()` to `ScrollFrame`

**Files:**

- Modify: `src/ui/ScrollFrame.ts` (path may differ — find it via `grep -r "class ScrollFrame" src packages`)

`ScrollFrame` clips a child container to a viewport rect. `setSize` must update the geometry mask (Phaser 4: `filters?.internal.addMask` per CLAUDE.md), the scrollbar track length, and the scroll-extent bounds (so a previously-scrollable list isn't stuck out of view).

- [ ] **Step 1: Locate the file**

```bash
grep -rn "class ScrollFrame" src packages
```

- [ ] **Step 2: Read the file**

Read the full implementation. Identify: viewport rect storage, mask shape, scrollbar handle, child content reference, scroll-extent calc.

- [ ] **Step 3: Refactor mask-and-bounds construction into a private `redraw()` method**

Same pattern as Task 1. The constructor calls `redraw()` after storing width/height.

For the Phaser 4 mask reattachment, follow CLAUDE.md: use `gameObject.filters?.internal.addMask(maskShape)`. **Don't** call `setMask()` or `createGeometryMask()` — those are deprecated in v4 under WebGL.

- [ ] **Step 4: Add `setSize(width, height)` public method**

```ts
public setSize(width: number, height: number): this {
  this.width = width;
  this.height = height;
  this.redraw();
  this.clampScroll();   // existing scroll-clamp method, or inline it
  return this;
}
```

After resize, scroll position may be out of new bounds; clamp it. If a `clampScroll()` method doesn't exist, write one inline that clamps `this.scrollY` to `[0, max(0, contentHeight - viewportHeight)]`.

- [ ] **Step 5: Typecheck and run all tests**

```bash
npm run typecheck && npm run test
```

- [ ] **Step 6: Commit**

```bash
git add src/ui/ScrollFrame.ts
git commit -m "feat(ui): add ScrollFrame.setSize() with mask + scroll-clamp"
```

---

## Task 3: Add `setSize()` to `PortraitPanel`

**Files:**

- Modify: `src/ui/PortraitPanel.ts` (existing — referenced by `CompetitionScene.ts:46`)

`PortraitPanel` is a sidebar panel with a portrait image (top half) and a stats list (bottom half), nominally 240×~600px. It composes a `Panel` internally and stacks children. After `setSize`, the inner Panel resizes, the portrait image repositions/rescales, and the stats list reflows within the new content area.

- [ ] **Step 1: Read the file**

Identify: inner `Panel` reference, portrait image reference, stats list container, stat-row positioning loop.

- [ ] **Step 2: Refactor child-positioning logic into a private `redraw()` method**

The constructor's positioning calculations (portrait at `y = padding`, stats list at `y = portraitBottom + gap`, etc.) move into `redraw()`. Call `redraw()` from the constructor after initial setup.

- [ ] **Step 3: Add `setSize(width, height)` method**

```ts
public setSize(width: number, height: number): this {
  this.width = width;
  this.height = height;
  this.panel.setSize(width, height);   // delegates to Task 1's API
  this.redraw();
  return this;
}
```

- [ ] **Step 4: Typecheck and run all tests**

```bash
npm run typecheck && npm run test
```

- [ ] **Step 5: Commit**

```bash
git add src/ui/PortraitPanel.ts
git commit -m "feat(ui): add PortraitPanel.setSize() reflow"
```

---

## Task 4: Add `setSize()` to `DataTable` and `TabGroup`

**Files:**

- Modify: `packages/spacebiz-ui/src/DataTable.ts` (or `src/ui/DataTable.ts` — locate)
- Modify: `packages/spacebiz-ui/src/TabGroup.ts` (or `src/ui/TabGroup.ts` — locate)

`DataTable` draws a header row and renders data rows in a vertically stacked content. With `contentSized: true` (used by `CompetitionScene`) the table sizes height by row count and is wrapped in a `ScrollFrame`. The width can change — column widths are absolute pixels in the column config, so on `setSize` we adjust only the _outer_ width (header background, divider line); column widths stay as configured.

`TabGroup` is a horizontal strip of tab buttons over swappable content containers. On `setSize(width, height)`, the tab strip width changes (tabs can be re-flowed or right-aligned controls can shift), and the content-area height available to children changes.

- [ ] **Step 1: Locate both files**

```bash
grep -rn "class DataTable\b" src packages
grep -rn "class TabGroup\b" src packages
```

- [ ] **Step 2: Read DataTable**

Identify: header background draw call, divider-line draw call, row positioning, optional column widths.

- [ ] **Step 3: Add `setSize(width, height)` to DataTable**

Same `redraw()` extraction pattern. Header background and divider redraw at the new width. Row Y-positions don't change (row heights are constant). Column X positions are absolute and don't shift either.

```ts
public setSize(width: number, height: number): this {
  this.width = width;
  this.height = height;
  this.redrawChrome();   // header bg + dividers
  return this;
}
```

If the table is `contentSized: true` (height grows with row count), `setSize` updates the outer width only — the row-driven height stays valid.

- [ ] **Step 4: Read TabGroup**

Identify: tab button placement, the active-tab indicator, content-container reference.

- [ ] **Step 5: Add `setSize(width, height)` to TabGroup**

For now, simple semantics: `setSize` updates `this.width` so subsequent `setActiveTab` content-area calculations (if any) use the new width. Tab buttons stay at their configured size; if the strip becomes wider, leftover space is empty (acceptable for this iteration). Document this in a code comment so the migration scenes don't expect tabs to redistribute.

```ts
public setSize(width: number, _height: number): this {
  this.width = width;
  // Tabs stay at their configured widths; available content area below
  // expands to the new width. Children of the active tab content container
  // are responsible for their own reflow.
  return this;
}
```

- [ ] **Step 6: Typecheck and run all tests**

```bash
npm run typecheck && npm run test
```

- [ ] **Step 7: Commit**

```bash
git add packages/spacebiz-ui/src/DataTable.ts packages/spacebiz-ui/src/TabGroup.ts src/ui/DataTable.ts src/ui/TabGroup.ts
git commit -m "feat(ui): add setSize() to DataTable and TabGroup"
```

(Use whichever paths exist — the `git add` above lists both possibilities; remove ones that don't apply.)

---

## Task 5: Add `attachReflowHandler` helper

**Files:**

- Create: `src/ui/sceneReflow.ts`
- Test: `src/ui/__tests__/sceneReflow.test.ts`

A tiny utility that registers a resize listener on `scene.scale` and auto-removes it on `SHUTDOWN`. Avoids leaks and standardizes the migration call site.

- [ ] **Step 1: Write the failing test**

```ts
// src/ui/__tests__/sceneReflow.test.ts
import { describe, it, expect, vi } from "vitest";
import { attachReflowHandler } from "../sceneReflow.ts";

function makeFakeScene(): {
  scale: {
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
  };
  events: {
    once: ReturnType<typeof vi.fn>;
  };
} {
  return {
    scale: { on: vi.fn(), off: vi.fn() },
    events: { once: vi.fn() },
  };
}

describe("attachReflowHandler", () => {
  it("registers a scale resize listener and a shutdown cleanup", () => {
    const scene = makeFakeScene();
    const handler = vi.fn();

    attachReflowHandler(scene as never, handler);

    expect(scene.scale.on).toHaveBeenCalledWith("resize", handler);
    expect(scene.events.once).toHaveBeenCalledWith(
      "shutdown",
      expect.any(Function),
    );

    const cleanup = scene.events.once.mock.calls[0][1] as () => void;
    cleanup();
    expect(scene.scale.off).toHaveBeenCalledWith("resize", handler);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/ui/__tests__/sceneReflow.test.ts
```

Expected: FAIL with "Cannot find module" or undefined `attachReflowHandler`.

- [ ] **Step 3: Write the implementation**

```ts
// src/ui/sceneReflow.ts
import * as Phaser from "phaser";

/** Subscribe a handler to the scene's scale "resize" event, with auto-cleanup
 *  when the scene shuts down. The standard wiring for any scene that needs to
 *  reflow its layout when the game canvas dimensions change.
 */
export function attachReflowHandler(
  scene: Phaser.Scene,
  handler: (gameSize: Phaser.Structs.Size) => void,
): void {
  scene.scale.on("resize", handler);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off("resize", handler);
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/ui/__tests__/sceneReflow.test.ts
```

Expected: PASS.

- [ ] **Step 5: Re-export from `src/ui/index.ts`**

```ts
// in src/ui/index.ts under "Game-specific components"
export { attachReflowHandler } from "./sceneReflow.ts";
```

- [ ] **Step 6: Typecheck and run all tests**

```bash
npm run typecheck && npm run test
```

- [ ] **Step 7: Commit**

```bash
git add src/ui/sceneReflow.ts src/ui/__tests__/sceneReflow.test.ts src/ui/index.ts
git commit -m "feat(ui): add attachReflowHandler helper"
```

---

## Task 6: Migrate `CompetitionScene` to fluid reflow

**Files:**

- Modify: `src/scenes/CompetitionScene.ts`

`CompetitionScene` is a good first migration target: it already has lazy-init for the standings graph (the recent PR #263 added the tab-switching pattern) and uses `getLayout()`, but its `Panel`, `PortraitPanel`, `ScrollFrame`, `DataTable`, and `TabGroup` are all positioned in `create()` and never updated.

Pattern: extract construction-time positioning into a `relayout()` method. `create()` calls `relayout()` once. `attachReflowHandler` calls `relayout()` on resize.

- [ ] **Step 1: Read the file**

Already familiar from PR #263. Identify the geometry assignments in `create()` that depend on `L.sidebarLeft`, `L.contentTop`, `L.mainContentLeft`, etc.

- [ ] **Step 2: Refactor positioning into `relayout()`**

```ts
private relayout(): void {
  const L = getLayout();

  this.portrait.setSize(L.sidebarWidth, L.contentHeight);
  this.portrait.setPosition(L.sidebarLeft, L.contentTop);

  // Repeat for contentPanel, tabFrame inside it, table viewport, etc.
  // Standings area must update if the graph is currently visible:
  this.standingsArea = {
    x: absX,
    y: viewTop,
    w: content.width,
    h: viewHeight,
  };
  if (this.standingsGraph?.visible) {
    this.standingsGraph.setSize(this.standingsArea.w, this.standingsArea.h);
    this.standingsGraph.setPosition(this.standingsArea.x, this.standingsArea.y);
  }
}
```

`StandingsGraph` doesn't yet have `setSize` — for this iteration, if standings is visible during a resize, destroy and recreate it (acceptable: resize during play is rare; standings tab will rebuild on next open).

- [ ] **Step 3: Wire `attachReflowHandler` at the end of `create()`**

```ts
import { attachReflowHandler /* ...existing imports */ } from "../ui/index.ts";

// at end of create():
attachReflowHandler(this, () => this.relayout());
```

- [ ] **Step 4: Manually verify in dev**

```bash
npm run dev
```

- Open `http://localhost:5173`, jump to CompetitionScene via `window.__sft.goToScene("CompetitionScene")` in the browser console (or navigate normally).
- Resize the browser window from ~1280 to ~1920 wide. Confirm: portrait sidebar stays anchored left, content panel widens, table widens, tab strip stays positioned correctly.
- Switch to Standings tab. Resize again. Confirm: graph either re-renders at new size (if `setSize` works) or is hidden cleanly until reopened.

- [ ] **Step 5: Typecheck and run all tests**

```bash
npm run typecheck && npm run test
```

- [ ] **Step 6: Commit**

```bash
git add src/scenes/CompetitionScene.ts
git commit -m "feat(competition): reflow on window resize"
```

---

## Task 7: Migrate `RoutesScene` and `FleetScene`

**Files:**

- Modify: `src/scenes/RoutesScene.ts`
- Modify: `src/scenes/FleetScene.ts`

Apply the same `relayout()` pattern as Task 6.

- [ ] **Step 1: Read both files end-to-end**

Identify all `getLayout()` reads, all child-positioning calls (`setPosition`, constructor `x`/`y`), and all width/height arguments derived from layout metrics.

- [ ] **Step 2: Extract `relayout()` from `create()` for `RoutesScene`**

Move every geometry call dependent on layout into the new method. Children whose `setSize` is now available should be updated; children without `setSize` (anything beyond the five from Tasks 1–4) should at minimum be repositioned.

- [ ] **Step 3: Wire `attachReflowHandler` at the end of `RoutesScene.create()`**

```ts
attachReflowHandler(this, () => this.relayout());
```

- [ ] **Step 4: Repeat steps 2-3 for `FleetScene`**

- [ ] **Step 5: Manually verify both scenes in dev**

```bash
npm run dev
```

For each scene: navigate, resize the window from 1280→1920→1366, watch for: panels staying anchored, lists clipping cleanly, no overlapping HUD.

- [ ] **Step 6: Typecheck and run all tests**

```bash
npm run typecheck && npm run test
```

- [ ] **Step 7: Commit**

```bash
git add src/scenes/RoutesScene.ts src/scenes/FleetScene.ts
git commit -m "feat(scenes): reflow RoutesScene and FleetScene on resize"
```

---

## Task 8: Migrate `MarketScene` and `FinanceScene`

**Files:**

- Modify: `src/scenes/MarketScene.ts`
- Modify: `src/scenes/FinanceScene.ts`

Same pattern as Task 7.

- [ ] **Step 1: Apply the `relayout()` pattern to `MarketScene`**

- [ ] **Step 2: Apply the `relayout()` pattern to `FinanceScene`**

- [ ] **Step 3: Manually verify both scenes**

- [ ] **Step 4: Typecheck and run all tests**

```bash
npm run typecheck && npm run test
```

- [ ] **Step 5: Commit**

```bash
git add src/scenes/MarketScene.ts src/scenes/FinanceScene.ts
git commit -m "feat(scenes): reflow MarketScene and FinanceScene on resize"
```

---

## Task 9: Visual QA pass at multiple HD resolutions

**Files:**

- Create: `docs/pr-screenshots/pr-fluid-layout/<resolution>-<scene>.png` (committed)
- Optional: `e2e/fluid-layout.spec.ts`

Capture before/after screenshots at five common desktop resolutions and confirm no regressions.

Resolutions:

- **1366×768** — common 16:9 laptop (compact mode triggers at <1100w; 1366 stays normal)
- **1920×1080** — FHD 16:9 — the design baseline
- **1920×1200** — 16:10
- **2560×1440** — QHD 16:9
- **3440×1440** — UWQHD 21:9 (the stretch case)

Scenes per resolution: `CompetitionScene`, `RoutesScene`, `FleetScene`, `MarketScene`, `FinanceScene` (5 each = 25 screenshots, but you can sample — at minimum one scene per resolution + all 5 scenes at 1920×1080).

- [ ] **Step 1: Start preview server**

Use the Claude Preview MCP against `spacebiz-dev` from `.claude/launch.json` (or `npm run dev` and Playwright if preview MCP isn't wired). Use `window.__sft.goToScene(...)` to jump between scenes.

- [ ] **Step 2: Capture screenshots at each resolution**

For each resolution, set the browser viewport to that size, navigate to each scene via `__sft.goToScene("<SceneKey>")`, capture screenshot. File names: `docs/pr-screenshots/pr-fluid-layout/<res>-<scene>.png` (e.g. `1920x1080-routes.png`).

- [ ] **Step 3: Review screenshots for regressions**

Look for: clipped panels, overlapping HUD, dead space at edges, unreadable scaled text, broken column alignment in tables. Fix any issues by amending the relevant Task 6/7/8 commit (or adding a follow-up fix commit).

- [ ] **Step 4: Commit screenshots**

```bash
git add docs/pr-screenshots/pr-fluid-layout/
git commit -m "docs(pr): fluid layout QA screenshots"
```

- [ ] **Step 5: Run final CI gates**

```bash
npm run check
```

Expected: all three gates pass (typecheck + test + build).

---

## Task 10: PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin feat/fluid-layout-completion
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "feat(ui): fluid layout — component setSize + scene reflow" --body "$(cat <<'EOF'
## Summary

- Adds `setSize(w, h)` reflow contract to `Panel`, `ScrollFrame`, `PortraitPanel`, `DataTable`, `TabGroup`
- Adds `attachReflowHandler` helper for scenes
- Migrates `CompetitionScene`, `RoutesScene`, `FleetScene`, `MarketScene`, `FinanceScene` to reflow on window resize
- The remaining 14 content scenes still snapshot at create() — documented as follow-up

## Test plan

- [x] `npm run typecheck` passes
- [x] `npm run test` passes
- [x] `npm run build` passes
- [x] Manual dev-server resize check on 5 migrated scenes
- [x] Visual QA screenshots at 1366×768, 1920×1080, 1920×1200, 2560×1440, 3440×1440

## Screenshots

See `docs/pr-screenshots/pr-fluid-layout/` for the per-resolution captures.
EOF
)"
```

---

## Self-Review Checklist

- [x] Each task touches a clear, self-contained set of files
- [x] Each task ends in a commit
- [x] No "TBD" / "implement later" placeholders
- [x] Method signatures are consistent (`setSize(width, height): this` everywhere)
- [x] The `attachReflowHandler` test is fully written, not handwaved
- [x] CI gates explicit (`npm run check`)
- [x] Out-of-scope content explicit so reviewers don't expect 19-scene migration in this PR

## Follow-up tracked separately

- Migrate the remaining 14 content scenes (`ContractsScene`, `TechTreeScene`, `DiplomacyScene`, `EmpireScene`, `StationBuilderScene`, `TurnReportScene`, `SimPlaybackScene`, `DilemmaScene`, `GalaxyMapScene`, `SystemMapScene`, `PlanetDetailScene`, etc.) using the same `relayout()` + `attachReflowHandler` pattern.
- `StandingsGraph.setSize()` proper resize support (currently destroyed/recreated on resize).
- `RouteBuilderPanel`, `AdviserPanel`, `MiniMap` — fluid sizing.
- `DataTable` column-width redistribution on width change (currently column widths are absolute pixels).

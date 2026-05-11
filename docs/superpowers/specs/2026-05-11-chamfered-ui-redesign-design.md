# Chamfered UI Redesign — Design Spec

**Date:** 2026-05-11
**Status:** Approved (brainstorm), pending implementation plan
**Goal:** Replace the current mix of rounded-rect controls and chamfered
panels with a unified sci-fi visual language: **chamfered (cut-45°)
containers, hard-square controls**. Buttons, inputs, badges, progress
bars, scrollbars become flat rectangles with 1px hairline borders;
panels, modals, cards, tooltips, and portrait frames adopt the existing
8px chamfer that `panel-bg` already uses today.

---

## 1. Problem

The UI today mixes two visual idioms:

- **Containers** (`Panel`, `panel-bg` canvas texture) already use chamfered
  cut corners via [traceChamferedRect](../../../src/scenes/BootScene.ts).
  This reads as sci-fi HUD (Mass Effect / Halo lineage).
- **Controls and small widgets** (`Button` with `r=3`, `Modal`, `InfoCard`,
  `TechQueueRow`, `Dropdown`, `ProgressBar`, `StatusBadge`, `Tooltip`,
  scrollbars, portrait masks) use `fillRoundedRect` or rounded/circular
  shapes. This reads as consumer-app, not spaceship.

The inconsistency dilutes the sci-fi identity. With the recent button
relocation work surfacing the issue, now is the time to align the whole
component library before adding more widgets that inherit the wrong feel.

---

## 2. Design Decisions

Settled during brainstorming:

- **Corner style:** chamfered (45° cut), not rounded, not asymmetric.
- **Chamfer size:** medium 8px — same as the current `panel-bg` texture.
- **Tiered application:** containers get chamfered corners; controls stay
  hard square. Mirrors real HUDs where the frame is angular but
  interactive tiles are sharp.
- **Scope:** full UI element refresh — buttons, panels, modals, inputs,
  badges, progress bars, tooltips, portraits, scrollbars.
- **Approach:** theme-driven rewrite (new shape tokens + shared
  primitives) rather than per-call-site sweeping, because the project
  already has the infrastructure (`traceChamferedRect`,
  `theme.chamfer.size`, the BootScene canvas texture pipeline).

---

## 3. Shape Token System

Add to [Theme.ts](../../../packages/spacebiz-ui/src/Theme.ts):

```ts
shape: {
  container: { chamfer: 8, borderWidth: 2 };  // panels, modals, cards, tooltips
  control:   { chamfer: 0, borderWidth: 1 };  // buttons, inputs, badges
  portrait:  { chamfer: 6 };                  // character portrait frames
}
```

These are added to the `ThemeConfig` interface and populated identically
across `darkTheme`, `lightTheme`, and `highContrastTheme` (the shape
language doesn't vary by color theme).

Existing `theme.panel.cornerRadius` and `theme.chamfer.size` are kept as
read-only aliases for one PR cycle, then removed. No callers rely on the
ability to mutate them.

---

## 4. Shared Chamfer Primitives

New file: `packages/spacebiz-ui/src/foundation/shapes.ts`.

```ts
// Phaser Graphics — for Button, Modal, InfoCard, etc.
export function fillChamferedRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
): void;

export function strokeChamferedRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
): void;

// Canvas2D — for BootScene texture generation
export function traceChamferedPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  c: number,
): void;

// Geometry mask shape — for PortraitLoader chamfered frames
export function makeChamferedMaskShape(
  scene: Phaser.Scene,
  w: number,
  h: number,
  c: number,
): Phaser.GameObjects.Graphics;
```

The private `traceChamferedRect` in
[BootScene.ts:281](../../../src/scenes/BootScene.ts) becomes a thin
wrapper around `traceChamferedPath`. Tests live in
`packages/spacebiz-ui/src/foundation/__tests__/shapes.test.ts`.

---

## 5. Component-by-Component Changes

| Component                                                                                                                               | Current                    | Target                                                            | Token                                |
| --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------- | ------------------------------------ |
| [Button](../../../packages/spacebiz-ui/src/Button.ts)                                                                                   | `fillRoundedRect(r=3)`     | `fillRect` + 1px hairline border; keep accent line + idle shimmer | `shape.control`                      |
| [IconButton](../../../packages/spacebiz-ui/src/IconButton.ts)                                                                           | rounded                    | `fillRect` + 1px border                                           | `shape.control`                      |
| [Modal](../../../packages/spacebiz-ui/src/Modal.ts)                                                                                     | `fillRoundedRect` frame    | `fillChamferedRect(c=8)`, square inner content                    | `shape.container`                    |
| [InfoCard](../../../packages/spacebiz-ui/src/InfoCard.ts)                                                                               | rounded card               | chamfered frame, square content rows                              | `shape.container`                    |
| [TechQueueRow](../../../src/ui/TechQueueRow.ts)                                                                                         | rounded row bg             | square `fillRect` (inner row of a chamfered panel)                | `shape.control`                      |
| [AdviserPanel](../../../packages/rogue-universe-shared/src/characters/AdviserPanel.ts)                                                  | rounded portrait + frame   | chamfered frame + chamfered portrait inset                        | `shape.container` + `shape.portrait` |
| [Dropdown](../../../packages/spacebiz-ui/src/Dropdown.ts)                                                                               | rounded                    | square trigger + chamfered popup menu                             | `shape.control` + `shape.container`  |
| [TabGroup](../../../packages/spacebiz-ui/src/TabGroup.ts)                                                                               | rounded tabs               | square tabs with hairline separators                              | `shape.control`                      |
| [ProgressBar](../../../packages/spacebiz-ui/src/ProgressBar.ts)                                                                         | rounded ends               | square fill, square track                                         | `shape.control`                      |
| [StatusBadge](../../../packages/spacebiz-ui/src/StatusBadge.ts)                                                                         | pill / round               | square 1px badge                                                  | `shape.control`                      |
| [Tooltip](../../../packages/spacebiz-ui/src/Tooltip.ts)                                                                                 | rounded bubble             | chamfered (container)                                             | `shape.container`                    |
| [ScrollFrame](../../../packages/spacebiz-ui/src/ScrollFrame.ts) / [ScrollableList](../../../packages/spacebiz-ui/src/ScrollableList.ts) | rounded scrollbar thumb    | square thumb, square track                                        | `shape.control`                      |
| [PortraitLoader](../../../src/game/PortraitLoader.ts) masks                                                                             | circular/rounded           | chamfered frame (6px) using new mask helper                       | `shape.portrait`                     |
| `panel-bg` canvas texture                                                                                                               | already chamfered 8px      | unchanged values, sourced from `shape.container.chamfer`          | `shape.container`                    |
| `panel-glow` canvas texture                                                                                                             | chamfered concentric rings | unchanged values, sourced from `shape.container.chamfer`          | `shape.container`                    |

`TechGraphCanvas` rounded boxes (tech nodes) are out of scope — they're
in-canvas game-world graphics, not UI chrome. Same for any in-game
sprite that happens to use `fillRoundedRect`.

---

## 6. Validation Strategy

- **Styleguide audit:** extend the `styleguide/` Vite app with a "Shape
  Audit" page rendering every container and control variant side by
  side. Update existing `Button.styleguide.ts`.
- **Manual scene capture:** `npm run dev`, then via the `__sft` QA
  console:
  - `__sft.goToScene("MainMenuScene")`
  - `__sft.goToScene("GalaxySetupScene")`
  - `__sft.goToScene("GameHUDScene")` + open RouteBuilder, TechTree,
    CommunicationModal, SettingsPanel, MilestoneOverlay
  - GalaxyMapScene with sidebar open
  - One save/load modal flow
    Capture each into `docs/pr-screenshots/pr-<N>/` per CLAUDE.md.
- **Tests:** `npm run check` (typecheck + Vitest + build). Any existing
  snapshot tests that assert pixel-level shape will need regeneration;
  flag them in the PR.

---

## 7. Rollout

Single PR, committed in this order so each commit is reviewable on its
own and can be checked out individually:

1. **Tokens + primitives.** Add `theme.shape`, `shapes.ts` primitives,
   tests. No visual change yet (no caller uses them).
2. **Texture regen.** Wire `BootScene.generatePanelBg` and
   `generatePanelGlow` through the new tokens; replace the private
   `traceChamferedRect` with the shared `traceChamferedPath`.
3. **Containers.** Modal, InfoCard, Tooltip, AdviserPanel, Dropdown
   popup menu.
4. **Controls.** Button, IconButton, Dropdown trigger, TabGroup,
   ProgressBar, StatusBadge, scrollbar thumbs in ScrollFrame /
   ScrollableList, TechQueueRow row backgrounds.
5. **Portraits.** PortraitLoader switched to chamfered mask via
   `makeChamferedMaskShape`.
6. **Cleanup.** Remove deprecated `theme.panel.cornerRadius` and
   `theme.chamfer.size` aliases. Update styleguide. Capture and commit
   PR screenshots.

---

## 8. Risks & Mitigations

- **Snapshot / visual tests will break.** Mitigation: regenerate them
  as part of the PR; reviewer compares the new baselines against the
  PR screenshots.
- **Portrait shape change is the biggest behavioral shift** (round →
  chamfered frame). Mitigation: the `shape.portrait.chamfer` token is
  the only knob; dial back to 4px if the 6px frame reads poorly at
  small sizes.
- **Glow texture layers depend on chamfer size.** Each ring uses
  `chamfer.size + (layers - i)` in
  [BootScene.ts:344-352](../../../src/scenes/BootScene.ts) to avoid
  stacking artifacts. The same formula carries through to the new
  token — visual is preserved.
- **Existing rounded `ScrollableList` row hover highlights** are inside
  chamfered containers, so the tiered rule says square is correct. No
  exception needed.
- **Light theme parity.** Light and high-contrast themes inherit the
  same shape tokens; only the colors differ. No theme-specific shape
  branching.

---

## 9. Out of Scope

- Changing the typography, spacing, or color palettes.
- Reworking the glow / shimmer / breathing ambient effects (they stay
  on the existing texture path).
- In-canvas game-world graphics (tech node boxes in `TechGraphCanvas`,
  galaxy map UI labels, station builder tiles).
- New widgets — this is a refresh of the existing component library
  only.

---

## 10. Success Criteria

- A new contributor looking at the styleguide audit page can correctly
  guess "container vs control" from the corner treatment alone.
- No `fillRoundedRect` / `strokeRoundedRect` calls remain in
  `packages/spacebiz-ui/src/` or `src/ui/` (`TechGraphCanvas` excepted
  per §5).
- `npm run check` passes.
- PR screenshots demonstrate the unified language across MainMenu,
  GameHUD, GalaxyMap, RouteBuilder, TechTree, and at least one modal.

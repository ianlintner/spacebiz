# Responsive UI / Multi-Aspect-Ratio Plan

**Date:** 2026-04-06  
**Goal:** Make the game viewable across widescreen desktops (21:9, 16:9) and portrait/landscape mobile devices (9:16, 3:4, etc.) without touch/interaction changes — visual layout only.

---

## 1. Current State Analysis

### Architecture Summary

| Aspect                 | Current Implementation                                                   |
| ---------------------- | ------------------------------------------------------------------------ |
| **Game resolution**    | Fixed 1280×720 (16:9)                                                    |
| **Phaser scale mode**  | `Phaser.Scale.FIT` + `CENTER_BOTH` — letterboxes to fit                  |
| **Layout system**      | `Layout.ts` exports ~20 hardcoded pixel constants                        |
| **Positioning**        | 100% absolute pixel coordinates in all 13 scenes                         |
| **Components**         | Panel, Modal, DataTable, ScrollableList, Button, Label — all pixel-sized |
| **Content structures** | Sidebar+Content (240px+848px) and Full-Width (1100px) patterns           |
| **Modals/overlays**    | Centered via `(GAME_WIDTH - w) / 2` with fixed sizes                     |
| **HUD**                | Top bar (56px), bottom bar (52px), left nav sidebar (56px)               |

### Key Files That Define Layout

| File                                                                        | Role                                                                              |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [packages/spacebiz-ui/src/Layout.ts](../packages/spacebiz-ui/src/Layout.ts) | Central layout constants (GAME_WIDTH, GAME_HEIGHT, sidebar widths, content areas) |
| [src/game/config.ts](../src/game/config.ts)                                 | Phaser game config with scale mode                                                |
| [packages/spacebiz-ui/src/Theme.ts](../packages/spacebiz-ui/src/Theme.ts)   | Spacing, font sizes, component dimensions                                         |
| All 13 scene files                                                          | Consume Layout.ts constants for absolute positioning                              |
| [src/ui/PortraitPanel.ts](../src/ui/PortraitPanel.ts)                       | 240px-wide sidebar portrait (55/45 split)                                         |
| [src/ui/RouteBuilderPanel.ts](../src/ui/RouteBuilderPanel.ts)               | Hardcoded 620×620 modal                                                           |
| [src/ui/MiniMap.ts](../src/ui/MiniMap.ts)                                   | Arbitrary (x, y, w, h) placement                                                  |
| [src/ui/AdviserPanel.ts](../src/ui/AdviserPanel.ts)                         | Positioned bottom-right, 96px/64px portrait                                       |

### What Happens Today on Non-16:9 Screens

- **Ultrawide (21:9):** Black bars on left and right. Game renders correctly at 1280×720 centered.
- **Tall/portrait mobile (9:16):** Massive black bars top and bottom. Game content is tiny.
- **4:3 / iPad:** Small black bars top and bottom. Playable but wastes space.

The `FIT` scale mode preserves aspect ratio — content never distorts, but doesn't use available screen real estate.

---

## 2. Design Goals & Constraints

### Must Have

1. Game fills the screen on any aspect ratio (no significant letterboxing)
2. All UI elements remain readable and properly positioned
3. No overlapping or clipped UI at any supported size
4. Keep the existing visual design language intact (panels, theme, depth layers)
5. Zero breaking changes to game logic, data, or save files

### Nice to Have

1. Widescreen users see more galaxy/system map area
2. Portrait mobile shows a vertically stacked layout instead of sidebar+content
3. Font sizes scale with viewport for legibility on small screens

### Out of Scope (for this phase)

- Touch controls, gestures, virtual joystick
- Interaction changes (tap targets, drag behavior)
- Mobile app packaging (Capacitor/Cordova)
- Separate mobile scene variants

---

## 3. Strategy: Dynamic Virtual Resolution

### Approach: Variable-Width Canvas with Fixed Content Zones

Instead of a fixed 1280×720 canvas, use a **dynamic virtual resolution** where:

- **Height stays fixed at 720px** (maintains text/UI legibility)
- **Width scales to match the device aspect ratio**, clamped between reasonable bounds
- Layout constants become **functions of the current width**
- Phaser's `Scale.FIT` + `CENTER_BOTH` still handles physical-to-virtual mapping

This is the simplest path because:

1. All existing vertical positioning (Y coordinates) remains unchanged
2. Horizontal layouts just need to reference the dynamic width instead of `1280`
3. No need for a fully flexible 2-axis layout engine
4. Text remains the same pixel size — legibility guaranteed

### For Portrait/Tall Screens (Alternative)

For aspect ratios taller than ~4:3, flip the strategy:

- **Width stays fixed at 720px** (or some minimum)
- **Height scales to match**
- This requires a **layout mode switch** — sidebar goes above/below content instead of left/right

This creates two layout modes:

- **Landscape mode** (width ≥ height): width-flexible, height=720
- **Portrait mode** (height > width): essentially a different layout

---

## 4. Implementation Plan

### Phase 1: Dynamic Canvas Infrastructure

#### 1.1 — Responsive Game Config

Replace fixed resolution with dynamic calculation:

```typescript
// src/game/config.ts — conceptual change

export const BASE_HEIGHT = 720;
export const MIN_WIDTH = 960; // ~4:3 minimum
export const MAX_WIDTH = 1920; // covers 21:9 ultrawide (1680) with headroom; no real display exceeds this at 720h

export function calculateGameSize(): { width: number; height: number } {
  const screenRatio = window.innerWidth / window.innerHeight;

  if (screenRatio >= 1) {
    // Landscape: fixed height, variable width
    const width = Math.round(BASE_HEIGHT * screenRatio);
    return {
      width: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width)),
      height: BASE_HEIGHT,
    };
  } else {
    // Portrait: fixed width, variable height
    const baseWidth = MIN_WIDTH;
    const height = Math.round(baseWidth / screenRatio);
    return {
      width: baseWidth,
      height: Math.min(height, 1600), // cap portrait height
    };
  }
}
```

Update Phaser config to use `Phaser.Scale.RESIZE` or re-initialize on resize.

#### 1.2 — Layout.ts: From Constants to Functions

Transform `Layout.ts` from static constants to a **reactive layout calculator**:

```typescript
// packages/spacebiz-ui/src/Layout.ts — conceptual refactor

export interface LayoutMetrics {
  gameWidth: number;
  gameHeight: number;
  maxContentWidth: number;
  sidebarWidth: number;
  contentGap: number;
  hudTopBarHeight: number;
  hudBottomBarHeight: number;
  navSidebarWidth: number;
  contentTop: number;
  contentHeight: number;
  contentLeft: number;
  sidebarLeft: number;
  mainContentLeft: number;
  mainContentWidth: number;
  fullContentLeft: number;
  fullContentWidth: number;
  isPortrait: boolean;
  isCompact: boolean; // width < ~1100, collapse sidebar
}

// Singleton, updated on resize
let _metrics: LayoutMetrics = computeMetrics(1280, 720);

export function getLayout(): LayoutMetrics {
  return _metrics;
}

export function updateLayout(width: number, height: number): void {
  _metrics = computeMetrics(width, height);
}

function computeMetrics(w: number, h: number): LayoutMetrics {
  const isPortrait = h > w;
  const isCompact = w < 1100;

  const sidebarWidth = isCompact ? 0 : 240;
  const navSidebarWidth = isPortrait ? 0 : 56;
  const hudTopBarHeight = 56;
  const hudBottomBarHeight = 52;

  const maxContentWidth = Math.min(w - navSidebarWidth * 2, 1100);
  const contentLeft = Math.floor((w - maxContentWidth) / 2);
  const contentGap = 12;

  const contentTop = hudTopBarHeight;
  const contentHeight = h - hudTopBarHeight - hudBottomBarHeight;

  const sidebarLeft = contentLeft;
  const mainContentLeft = isCompact
    ? contentLeft
    : sidebarLeft + sidebarWidth + contentGap;
  const mainContentWidth = isCompact
    ? maxContentWidth
    : maxContentWidth - sidebarWidth - contentGap;

  return {
    gameWidth: w,
    gameHeight: h,
    maxContentWidth,
    sidebarWidth,
    contentGap,
    hudTopBarHeight,
    hudBottomBarHeight,
    navSidebarWidth,
    contentTop,
    contentHeight,
    contentLeft,
    sidebarLeft,
    mainContentLeft,
    mainContentWidth,
    fullContentLeft: contentLeft,
    fullContentWidth: maxContentWidth,
    isPortrait,
    isCompact,
  };
}

// Backward-compat exports (deprecated, use getLayout())
export const GAME_WIDTH = 1280; // keep for gradual migration
export const GAME_HEIGHT = 720;
```

#### 1.3 — Resize Event Plumbing

Add a resize listener that:

1. Updates Layout metrics
2. Emits a Phaser event or calls scene `resize()` methods
3. Each scene can optionally implement `resize(width, height)` to reflow

```typescript
// In game bootstrap or a dedicated ResizeManager:
this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
  updateLayout(gameSize.width, gameSize.height);
  // Notify all active scenes
  this.scene.scenes.forEach((scene) => {
    if (
      scene.scene.isActive() &&
      typeof (scene as any).onResize === "function"
    ) {
      (scene as any).onResize(gameSize.width, gameSize.height);
    }
  });
});
```

### Phase 2: Component Adaptation

#### 2.1 — Panel, Modal, Button (Low Risk)

These components already accept `width` and `height` as config. The scenes just need to pass dynamic values instead of constants.

**Modal** already centers itself — just verify it uses camera viewport width/height instead of `GAME_WIDTH/GAME_HEIGHT`.

**Panel** takes explicit dimensions — callers switch from `MAIN_CONTENT_WIDTH` to `getLayout().mainContentWidth`.

**Button** and **Label** are position-agnostic — no changes needed in the components themselves.

#### 2.2 — DataTable Column Widths

DataTable columns have fixed pixel widths. Options:

- **Proportional columns:** Specify column widths as fractions that sum to 1.0, multiplied by table width
- **Min-width columns:** Specify minimum width + flex behavior
- **Simplest:** Let scenes recalculate column widths from table width in their layout logic

Recommend: Add optional `flex` property to columns. If present, distribute remaining space proportionally after fixed-width columns are placed. This avoids touching every column definition.

#### 2.3 — ScrollableList

Already takes `width` and `height` — just pass dynamic values. The internal clipping mask self-adjusts.

#### 2.4 — PortraitPanel / Sidebar

In **compact mode** (narrow screens), the sidebar should either:

- **Collapse entirely** — scenes become full-width, portrait info shows inline or in a header strip
- **Become a top strip** — portrait + name + key stats in a horizontal bar above the content

Recommend: Compact mode hides the sidebar. Each scene's data table or content panel expands to fill the width. Planet/ship detail is accessible via a compact header or tap-to-expand overlay.

#### 2.5 — RouteBuilderPanel

Currently hardcoded at 620×620. Make it percentage-based:

- Width: `min(620, gameWidth * 0.85)`
- Height: `min(620, contentHeight * 0.95)`
- Always centered

#### 2.6 — MiniMap

Already takes arbitrary dimensions. Callers just need to size it relative to the available area.

#### 2.7 — AdviserPanel

Currently positioned at bottom-right. Keep the same anchor point but use `getLayout().gameWidth` for X positioning.

### Phase 3: Scene-by-Scene Migration

Each scene needs to switch from static Layout constants to `getLayout()` calls. Group by complexity:

#### Tier 1 — Simple (1-2 hours each)

| Scene                | Changes                                                                                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MainMenuScene**    | Replace `GAME_WIDTH/GAME_HEIGHT` with `getLayout()`. Hero image cover-scales already use ratios — just update the divisor. Button positions use `cx = gameWidth / 2`. |
| **GameOverScene**    | Same pattern as MainMenu — centered content with relative positioning.                                                                                                |
| **GalaxySetupScene** | `contentLeft` already computed from `GAME_WIDTH - MAX_CONTENT_WIDTH`. Just use `getLayout()`.                                                                         |
| **BootScene**        | Loading bar — trivial.                                                                                                                                                |

#### Tier 2 — Moderate (2-4 hours each)

| Scene                | Changes                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **GameHUDScene**     | Top bar width → `gameWidth`. Bottom bar width → `gameWidth`. Nav sidebar stays fixed width. Cash label `x: gameWidth - 20`. AdviserPanel anchored to bottom-right. |
| **SimPlaybackScene** | Galaxy visualization + buttons. Buttons center with `gameWidth / 2`. Ship popups slide from `gameWidth`.                                                           |
| **GalaxyMapScene**   | Starfield + system labels. Already uses camera — may benefit from wider viewport showing more galaxy.                                                              |
| **SystemMapScene**   | Solar system centered in viewport — uses camera center already. Just update PortraitPanel width.                                                                   |

#### Tier 3 — Complex (3-5 hours each)

| Scene                 | Changes                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **FleetScene**        | Sidebar+Content layout. Switch to `getLayout()` for all positions. DataTable column widths need flex. In compact mode, drop sidebar. |
| **RoutesScene**       | Same as FleetScene + MiniMap sizing + RouteBuilderPanel. Most complex scene.                                                         |
| **MarketScene**       | Sidebar+Content + DataTable with many columns. Column widths scale.                                                                  |
| **FinanceScene**      | Sidebar+Content + TabGroup + DataTable. TabGroup width scales.                                                                       |
| **PlanetDetailScene** | Centered overlay modal. Internal sidebar+content split at fixed 200px+rest. Scale overlay dimensions.                                |
| **TurnReportScene**   | Sidebar+Content + ScrollableList.                                                                                                    |

### Phase 4: Portrait Mode (Mobile)

This is the biggest visual change. When `isPortrait === true`:

#### 4.1 — HUD Rearrangement

- Top bar: Company name + cash (two lines or smaller font)
- Bottom bar: Phase + End Turn (unchanged)
- Nav sidebar: Convert to bottom tab bar (above bottom bar) or hamburger menu

#### 4.2 — Content Layout

- No sidebar — full-width single-column layout
- Portrait/ship info shows as a collapsed header strip (name + 2-3 key stats)
- DataTable scrolls horizontally for many columns, or columns collapse/hide
- Modals scale to near-full-screen

#### 4.3 — Typography Scaling

- For very small viewports, scale down font sizes by 10-20%
- Add `fontScale` to Layout metrics ← all Label/text creation multiplies by this

### Phase 5: Polish & Testing

1. **Aspect ratio test matrix:**
   - 21:9 (2560×1080 → ~1680×720 virtual)
   - 16:9 (1920×1080 → 1280×720 virtual — unchanged baseline)
   - 16:10 (1680×1050 → 1152×720 virtual)
   - 4:3 (1024×768 → 960×720 virtual)
   - 3:2 iPad (2048×1536 → 960×720)
   - 9:16 phone portrait (390×844 → 720×1558 virtual ← portrait mode)
   - 9:19.5 phone landscape (844×390 → 1556×720 virtual)

2. **Automated layout snapshot tests:**
   - Render each scene at each aspect ratio
   - Verify no elements overlap or go off-screen
   - Check text readability (minimum sizes)

3. **Edge cases:**
   - Window resize during gameplay
   - Orientation change on mobile (landscape ↔ portrait)
   - Save/load across different aspect ratios (layout must recompute)

---

## 5. Migration Strategy: Backward-Compatible Incremental Approach

### Step 1: Add `getLayout()` alongside existing constants

Keep all current `GAME_WIDTH`, `GAME_HEIGHT`, etc. exports working. Add the new `getLayout()` function that returns the same values initially (1280×720).

**Zero scenes break. Zero tests break.**

### Step 2: Switch game config to dynamic sizing

Change `createGameConfig()` to use `calculateGameSize()`. The Layout constants still default to 1280×720, but `getLayout()` now returns dynamic values.

**Existing scenes still work** because they import the old constants.

### Step 3: Migrate scenes one at a time

Each scene switches from:

```typescript
import { GAME_WIDTH, SIDEBAR_LEFT, MAIN_CONTENT_LEFT } from "../ui/index.ts";
// ...
const panel = new Panel(this, { x: MAIN_CONTENT_LEFT, ... });
```

to:

```typescript
import { getLayout } from "../ui/index.ts";
// ...
const L = getLayout();
const panel = new Panel(this, { x: L.mainContentLeft, ... });
```

Scenes can be migrated independently — no big-bang refactor.

### Step 4: Add resize handling to migrated scenes

After scene uses `getLayout()`, add an `onResize()` method that destroys and recreates the UI (simplest) or repositions existing elements (smoother but more code).

**Recommendation:** For scenes that are cheap to rebuild (most of them — they destroy/recreate on every `create()` anyway), just call `this.scene.restart()` on resize. Add debouncing so rapid resizes don't churn.

### Step 5: Add compact/portrait mode

Once all scenes use `getLayout()`, the `isCompact` and `isPortrait` flags can drive layout variations inside each scene's `create()` method.

---

## 6. Detailed File Change Inventory

### Core Infrastructure (shared library)

| File                                         | Change                                                                           | Risk |
| -------------------------------------------- | -------------------------------------------------------------------------------- | ---- |
| `packages/spacebiz-ui/src/Layout.ts`         | Add `getLayout()`, `updateLayout()`, `computeMetrics()`. Keep old constants.     | Low  |
| `packages/spacebiz-ui/src/index.ts`          | Export new layout functions                                                      | Low  |
| `packages/spacebiz-ui/src/Modal.ts`          | Use camera viewport dimensions for centering instead of `GAME_WIDTH/GAME_HEIGHT` | Low  |
| `packages/spacebiz-ui/src/DataTable.ts`      | Add optional `flex` column property                                              | Low  |
| `packages/spacebiz-ui/src/Panel.ts`          | No changes needed (already accepts w/h)                                          | None |
| `packages/spacebiz-ui/src/Button.ts`         | No changes needed                                                                | None |
| `packages/spacebiz-ui/src/Label.ts`          | No changes needed                                                                | None |
| `packages/spacebiz-ui/src/ScrollableList.ts` | No changes needed                                                                | None |
| `packages/spacebiz-ui/src/TabGroup.ts`       | No changes needed (width is config)                                              | None |

### Game Config

| File                 | Change                                                                       | Risk   |
| -------------------- | ---------------------------------------------------------------------------- | ------ |
| `src/game/config.ts` | Add `calculateGameSize()`, use `Phaser.Scale.RESIZE` or dynamic initial size | Medium |
| `src/main.ts`        | Pass dynamic size to game config                                             | Low    |

### Scenes (13 files)

| File                              | Migration Tier | Key Changes                                                  |
| --------------------------------- | -------------- | ------------------------------------------------------------ |
| `src/scenes/BootScene.ts`         | Tier 1         | Loading bar centers dynamically                              |
| `src/scenes/MainMenuScene.ts`     | Tier 1         | Hero + buttons use `getLayout()`                             |
| `src/scenes/GameOverScene.ts`     | Tier 1         | Centered content uses `getLayout()`                          |
| `src/scenes/GalaxySetupScene.ts`  | Tier 1         | Content positioning uses `getLayout()`                       |
| `src/scenes/GameHUDScene.ts`      | Tier 2         | Bars span full width, nav anchored left, cash anchored right |
| `src/scenes/GalaxyMapScene.ts`    | Tier 2         | Camera bounds expand to fill width                           |
| `src/scenes/SystemMapScene.ts`    | Tier 2         | Centered system + sidebar                                    |
| `src/scenes/SimPlaybackScene.ts`  | Tier 2         | Buttons and popups reposition                                |
| `src/scenes/FleetScene.ts`        | Tier 3         | Full sidebar+content refactor                                |
| `src/scenes/RoutesScene.ts`       | Tier 3         | Most complex — sidebar+minimap+routebuilder                  |
| `src/scenes/MarketScene.ts`       | Tier 3         | Sidebar+content + column flex                                |
| `src/scenes/FinanceScene.ts`      | Tier 3         | Sidebar+content+tabs + column flex                           |
| `src/scenes/PlanetDetailScene.ts` | Tier 3         | Modal sizing scales                                          |
| `src/scenes/TurnReportScene.ts`   | Tier 3         | Sidebar+content                                              |

### UI Components (scene-level)

| File                          | Change                                     | Risk   |
| ----------------------------- | ------------------------------------------ | ------ |
| `src/ui/PortraitPanel.ts`     | Add compact mode (header strip vs sidebar) | Medium |
| `src/ui/RouteBuilderPanel.ts` | Size based on `getLayout()`                | Medium |
| `src/ui/MiniMap.ts`           | No changes (already sized by caller)       | None   |
| `src/ui/AdviserPanel.ts`      | Anchor to `gameWidth` for X position       | Low    |
| `src/ui/TutorialOverlay.ts`   | Use `getLayout()` for overlay dimensions   | Low    |
| `src/ui/MilestoneOverlay.ts`  | Use viewport dimensions                    | Low    |
| `src/ui/Tooltip.ts`           | Clamp to viewport edges                    | Low    |
| `src/ui/Starfield.ts`         | Expand to fill viewport                    | Low    |
| `src/ui/AmbientFX.ts`         | Expand particle bounds                     | Low    |
| `src/ui/index.ts`             | Re-export new layout functions             | Low    |

---

## 7. Breakpoint Definitions

| Name                | Aspect Ratio  | Virtual Resolution | Layout Mode                                    |
| ------------------- | ------------- | ------------------ | ---------------------------------------------- |
| **Ultrawide**       | ≥ 2.1:1       | 1512-1920 × 720    | Landscape, extra side margins or wider content |
| **Widescreen**      | ~16:9         | 1280 × 720         | Landscape, current layout (baseline)           |
| **Standard**        | ~16:10 to 4:3 | 960-1152 × 720     | Landscape, compact (sidebar may hide)          |
| **Landscape Phone** | ~2:1          | 1440-1560 × 720    | Landscape, wide but short — fit carefully      |
| **Tablet Portrait** | ~3:4          | 720 × 960          | Portrait mode, single column                   |
| **Phone Portrait**  | ~9:19.5       | 720 × 1560         | Portrait mode, single column, smaller fonts    |

### Compact Threshold

`isCompact = true` when `gameWidth < 1100` — this is the point where the 240px sidebar + 848px content no longer fit with comfortable margins.

### Portrait Threshold

`isPortrait = true` when `gameHeight > gameWidth` — triggers full layout mode switch.

---

## 8. Risk Assessment

| Risk                                                     | Likelihood | Impact | Mitigation                                                   |
| -------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------ |
| Phaser `RESIZE` mode breaks existing scene positioning   | Medium     | High   | Incremental migration with backward-compat constants         |
| DataTable with many columns unreadable on narrow screens | Medium     | Medium | Flex columns + horizontal scroll fallback                    |
| Font sizes too small on phone screens                    | High       | Medium | `fontScale` multiplier in Layout metrics                     |
| Resize during gameplay causes state corruption           | Low        | High   | Debounce resize, scenes just restart                         |
| Performance on mobile (many Phaser objects)              | Medium     | Medium | Out of scope — but note: fewer objects in compact mode helps |
| Portrait mode requires significant scene restructuring   | High       | Medium | Defer portrait to Phase 4 — landscape-first                  |

---

## 9. Recommended Implementation Order

1. **Infrastructure** (Phase 1: ~1-2 days)
   - `Layout.ts` refactor with `getLayout()`
   - `config.ts` dynamic sizing
   - Resize event plumbing

2. **Tier 1 Scenes** (Phase 2: ~1 day)
   - Boot, MainMenu, GameOver, GalaxySetup
   - Quick wins, validates the infrastructure

3. **HUD + Map Scenes** (Phase 3: ~1-2 days)
   - GameHUDScene (most critical — present in all gameplay)
   - GalaxyMapScene, SystemMapScene
   - SimPlaybackScene

4. **Data-Heavy Scenes** (Phase 4: ~2-3 days)
   - Fleet, Routes, Market, Finance, PlanetDetail, TurnReport
   - DataTable flex columns
   - PortraitPanel compact mode

5. **Portrait Mode** (Phase 5: ~3-4 days)
   - HUD nav-to-tab-bar conversion
   - Single-column layout variants
   - Font scaling
   - Full mobile viewport testing

6. **Polish** (Phase 6: ~1-2 days)
   - Edge cases (orientation change, mid-game resize)
   - Test matrix validation
   - Performance spot-checks

**Total estimated scope: ~10-14 days of focused work**

---

## 10. Alternative Approaches Considered

### A. CSS Scaling Only (Rejected)

Just scale the 1280×720 canvas with CSS `transform: scale()` on the container. The game renders at fixed res and the browser scales it.

**Why rejected:** This is what `Phaser.Scale.FIT` already does. Doesn't solve letterboxing or poor use of screen space. Text becomes blurry on non-native resolutions.

### B. Multiple Fixed Resolutions (Rejected)

Define 3-4 fixed resolutions (1280×720, 1920×720, 720×1280) and pick the closest at startup.

**Why rejected:** Doesn't handle arbitrary aspect ratios. Creates discrete jumps. More preset combinations to test. Still produces letterboxing at non-matching ratios.

### C. Full Relative Layout Engine (Rejected)

Build a constraint-based layout system (like CSS Flexbox) inside Phaser.

**Why rejected:** Massive overengineering for an indie game. Phaser doesn't have native layout primitives. Would require building a layout engine from scratch.

### D. DOM UI Overlay (Partially Considered)

Render the game canvas for gameplay and use HTML/CSS for all UI panels (buttons, tables, modals) overlaid on top.

**Why partially considered:** This is the most web-native responsive solution. CSS handles layout perfectly. However:

- Breaks the unified Phaser rendering pipeline
- All existing UI components would need rewriting
- Mixing DOM and canvas introduces z-index and event complexity
- Lose Phaser tween/animation integration for UI

**Verdict:** Not appropriate for this game's architecture. Could revisit for a v2 rewrite.

### E. Dynamic Width + Fixed Height (Selected ✓)

The chosen approach. Gives responsive width scaling with minimal vertical disruption. Incrementally adoptable. Handles 90% of use cases with the portrait mode addition covering the rest.

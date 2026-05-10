# Map Layer Toolbar — Design

**Status:** approved 2026-05-09 (brainstorm)
**Author:** spacebiz team

## Goal

Replace the current 3-button bottom-row layer toggles (Empires / Names / Ships) with a Paradox-style icon toolbar that exposes 11+ named map layers in 5 grouped drawers. Persist toggle state across sessions. Make adding a new layer a small, mechanical change.

## Non-goals

- Implementing the actual rendering for stub layers (Navies, Company Names, Import/Export Goods, Space Events). Those layers are exposed as toggleable flags but are no-ops until a renderer subscribes. They land in later PRs.
- Replacing the company filter dropdown — stays where it is for v1.

## Layers

| Group     | Layers                                      | Status                                                |
| --------- | ------------------------------------------- | ----------------------------------------------------- |
| Politics  | Empire Names, Empire Borders, Company Names | 2 of 3 implemented (Names, Borders); Companies = stub |
| Geography | Systems, System Names, Hyperlanes           | All implemented                                       |
| Movement  | Ships, Navies                               | Ships implemented; Navies = stub                      |
| Economy   | Import Goods, Export Goods                  | Both stubs                                            |
| Events    | Space Events                                | Stub                                                  |

Stub layers render nothing today. Toggling them flips a flag; future renderers subscribe and react. Default state: stubs `off`, implemented layers `on` (matches today's defaults).

## Architecture

### `MapLayerController`

A singleton TS class that owns a `Record<LayerId, boolean>` and exposes:

- `isVisible(id: LayerId): boolean`
- `toggle(id: LayerId): void` (writes localStorage, debounced)
- `setVisible(id: LayerId, on: boolean): void`
- `on("change", (id) => ...)` / `off(...)` — `EventEmitter`-shaped subscription
- `getLayer(id): MapLayer` — returns metadata (label, group, iconIndex, enabled)
- `getLayersByGroup(group): MapLayer[]` — for toolbar rendering

Layer registry is a static const at module scope:

```ts
type LayerGroup = "politics" | "geography" | "movement" | "economy" | "events";
type LayerId =
  | "empire-names"
  | "empire-borders"
  | "company-names"
  | "systems"
  | "system-names"
  | "hyperlanes"
  | "ships"
  | "navies"
  | "import-goods"
  | "export-goods"
  | "space-events";

interface MapLayer {
  id: LayerId;
  group: LayerGroup;
  label: string;
  iconIndex: number; // spritesheet frame index
  defaultOn: boolean;
  implemented: boolean; // false → stub layer with no renderer yet
}
```

### Wiring existing renderers

The current toggles in `GalaxyMapScene` (`showEmpires`, `showSystemNames`, `showShips`) and the visibility paths they drive get migrated to subscribe to the controller:

- `setEmpiresVisible` → triggered by `controller.on("change", id => id === "empire-names" || id === "empire-borders" → ...)`
- `showSystemNames` → bound to `system-names`
- `setShipsVisible` → bound to `ships`
- A new `setHyperlanesVisible` handler is added for `hyperlanes` (today the toggle exists implicitly)

The bottom-row toggle code in `GalaxyMapScene.ts` (lines ~714–820) is removed; the company filter block stays.

### Persistence

```
localStorage["spacebiz.mapLayers.v1"] = JSON.stringify({ [layerId]: boolean })
```

Loaded on `MapLayerController` construction. Each `toggle` writes a debounced (200 ms) full re-serialization. Versioned key (`v1`) so we can ignore stale state if layer ids change.

## UI: `MapLayerToolbar`

A new Phaser widget mounted on the right edge of the galaxy view. Rendered as a child of the `GameHUDScene` (top depth, above galaxy canvas, below modal overlays).

### Collapsed state

5 square buttons, vertically stacked, anchored to the right edge below the top HUD strip:

```
                                 ┌────┐
                                 │ 👑 │  ← Politics
                                 ├────┤
                                 │ 🌌 │  ← Geography
                                 ├────┤
                                 │ 🚀 │  ← Movement
                                 ├────┤
                                 │ 📦 │  ← Economy
                                 ├────┤
                                 │ ⚡ │  ← Events
                                 └────┘
```

- Button: 40×40 px, theme `panelBg`, `panelBorder` 1 px stroke
- Icon: 24×24 centered, tinted `theme.colors.accent` when any layer in that group is on, `theme.colors.textDim` when all off, `theme.colors.warning` accent when actively expanded
- Hover: stroke brightens; tooltip shows group name
- Test ids: `btn-layer-group-politics`, `btn-layer-group-geography`, ... (used by QA console)

### Expanded drawer

Click a group button → expands a panel to its **left** (toward the canvas) showing the group's layers as toggle rows:

```
                       ┌──────────────────────┬────┐
                       │  👑  EMPIRE NAMES  ✓ │ 👑 │
                       │  🏰  EMPIRE BORDERS ✓│    │
                       │  🏢  COMPANIES       │    │
                       └──────────────────────┴────┘
```

- Drawer panel: theme `panelBg`, 200 px wide, height = 8 + (rowCount × 36) + 8
- Row: 28×28 icon + label + checkmark (✓) when on; click to toggle
- Stub-layer rows: same chrome, full opacity (no special "coming soon" treatment)
- Closing: click outside the drawer, click another group button, or press `Esc`
- Only one drawer open at a time
- Animation: 100 ms ease-out slide + alpha fade

### Z-ordering

- Galaxy canvas: depth 0–999 (existing)
- Toolbar buttons: depth 9000
- Drawer panel: depth 9100 (above toolbar so the drawer renders over its sibling buttons)
- Tooltip: depth 9500

## Asset pipeline: icon spritesheet

16 monochrome 24×24 PNGs packed into one `public/ui-icons-24.png` spritesheet (4×4 grid).

### Layout

| Index | Asset           | Group       |
| ----- | --------------- | ----------- |
| 0     | group-politics  | drawer icon |
| 1     | group-geography | drawer icon |
| 2     | group-movement  | drawer icon |
| 3     | group-economy   | drawer icon |
| 4     | group-events    | drawer icon |
| 5     | empire-names    | layer       |
| 6     | empire-borders  | layer       |
| 7     | company-names   | layer       |
| 8     | systems         | layer       |
| 9     | system-names    | layer       |
| 10    | hyperlanes      | layer       |
| 11    | ships           | layer       |
| 12    | navies          | layer       |
| 13    | import-goods    | layer       |
| 14    | export-goods    | layer       |
| 15    | space-events    | layer       |

### Generation

One-time author step using `~/Projects/ai-pixel-art-image-generation`:

1. Author `scripts/map-icon-prompts.json` — array of `{ id, prompt }` for the 16 icons
2. Run a thin wrapper `scripts/generate-map-icons.mjs` that loops `generate_sprite.py` (32 px monochrome white-on-transparent) for each prompt and writes per-icon PNGs to `assets-source/ui-icons/`
3. Pack into a 4×4 grid using Sharp (in `scripts/pack-icons.mjs`) and write `public/ui-icons-24.png` (also generates a `public/ui-icons-24.json` manifest if needed for variable cell sizes — single-size grid does not need it)
4. Commit `assets-source/ui-icons/*.png`, `public/ui-icons-24.png`, and the prompts file

Re-running the generator overwrites the source PNGs and repacks. Treat as a manual step — not a CI build step.

### Phaser loading

```ts
// BootScene.preload
this.load.spritesheet("ui-icons", "ui-icons-24.png", {
  frameWidth: 24,
  frameHeight: 24,
});
```

Each icon is a `Phaser.GameObjects.Image` with `setFrame(layer.iconIndex)` and `setTint(...)` for theme integration.

## Data flow per toggle

```
user clicks drawer row
  → MapLayerToolbar.handleRowClick(layerId)
  → MapLayerController.toggle(layerId)
  → emits "change" event
  → subscribers (GalaxyMapScene, GalaxyView2D, Routes2D, Ships2D) update visibility
  → localStorage write (debounced 200 ms)
```

Subscribers should bind once at scene `create()` and unbind at `shutdown()`.

## Migration plan

1. Add `MapLayerController` and registry as new module — no consumers yet
2. Add `MapLayerToolbar` widget — renders, but its toggles are no-ops
3. Generate the 16-icon spritesheet
4. Wire existing renderers (`Empires`, `Names`, `Ships`, `Hyperlanes`) to subscribe to controller, replacing their current toggle logic
5. Remove the old bottom-row toggle code in `GalaxyMapScene.ts`
6. Stub layers (Navies, Companies, Import/Export, Events) ship as flags-only — toggleable, but invisible

## Open questions / deferred

- **Master "all on / all off"** — skip for v1; revisit if power users ask
- **Drawer ordering** — alphabetical inside each group, except the most-frequently-used layer floats first (e.g., Empire Borders > Empire Names > Companies)
- **Keyboard shortcuts** — not in v1; later: number keys 1-5 toggle group drawers, letters toggle layers
- **Mobile/narrow screens** — not in scope; the game is desktop-first

## Testing

- Unit tests: `MapLayerController` — load/save/toggle/event emission
- Integration: `MapLayerToolbar` rendering, drawer open/close, tooltip
- Manual: visual confirmation that each toggle correctly hides/shows the right layer in the galaxy view
- Regression: existing GalaxyMapScene tests should not change

## Files

**New:**

- `src/game/map/MapLayerController.ts`
- `src/game/map/MapLayerRegistry.ts`
- `src/ui/MapLayerToolbar.ts`
- `src/game/map/__tests__/MapLayerController.test.ts`
- `scripts/map-icon-prompts.json`
- `scripts/generate-map-icons.mjs`
- `scripts/pack-icons.mjs`
- `assets-source/ui-icons/*.png`
- `public/ui-icons-24.png`

**Modified:**

- `src/scenes/BootScene.ts` (preload spritesheet)
- `src/scenes/GalaxyMapScene.ts` (remove bottom-row toggles, mount toolbar, wire subscribers)
- `src/scenes/galaxy2d/GalaxyView2D.ts` (subscribe to controller for empire-names, borders, hyperlanes)
- `src/scenes/galaxy2d/Ships2D.ts` (subscribe for ships)

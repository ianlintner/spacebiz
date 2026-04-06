# Route Builder Mini-Map

**Date:** 2026-04-06  
**Status:** Draft

## Overview

Add a small pixel-art mini-map to the Route Builder panel that gives players a spatial sense of where their trade route sits within the galaxy or star system. When a route spans two different systems, the mini-map shows a zoomed-out galaxy view with star systems as dots and a route line connecting origin and destination systems. When a route is intra-system (both planets share the same system), it shows a mini system view with orbital rings and planet dots, with the system name displayed at the top.

## Motivation

- Players currently pick origin/destination from text lists with no spatial context.
- As the game evolves, distance and galactic position will matter more (fuel costs, piracy zones, sector bonuses).
- A visual preview helps players build intuition about the galaxy layout and make better routing decisions.

## Design

### Layout

The mini-map occupies a rectangular region inside the Route Builder panel. Two placement options:

**Option A — Bottom-right inset (recommended)**  
Place the mini-map below the preview stats section, right-aligned. Approximate dimensions: **160×120 px**. This avoids interfering with the field selectors on the left side.

```
┌─────────────────── Route Builder ───────────────────┐
│  Origin:      [ Kepler Prime      ◄ ► ]             │
│  Destination: [ Vega Station      ◄ ► ]             │
│  Cargo:       [ Technology        ◄ ► ]             │
│  Ship:        [ Fast Courier      ◄ ► ]             │
│  Auto-Buy:    [ Off               ◄ ► ]             │
│─────────────────────────────────────────────────────│
│  Distance: 142 ly    Revenue: 3,200cr               │
│  Fuel: 800cr         Profit: 2,400cr/turn           │
│                           ┌─────────────────┐       │
│                           │   ╌ MINI MAP ╌  │       │
│                           │  ·  ·    ·      │       │
│                           │     ╲   ·       │       │
│                           │  ·   ╲          │       │
│                           │  · ·  ●         │       │
│                           └─────────────────┘       │
│              [ Confirm Route ]    [ Cancel ]        │
└─────────────────────────────────────────────────────┘
```

**Option B — Right sidebar strip**  
Extend `panelWidth` from 620 → ~800 and place the mini-map in a 160px-wide column on the right. More space but changes panel proportions.

**Recommendation:** Start with Option A. The 160×120 region fits within the existing 620px panel width without layout changes.

### Two Display Modes

#### 1. Inter-System Route (Galaxy View)

Shown when origin and destination planets belong to different star systems.

**Content:**

- All star systems rendered as small dots (2–4 px), colored by sector tint (dimmed).
- Sector boundaries shown as faint circles or omitted for clarity.
- Origin system: bright dot with subtle glow, labeled with system name (tiny text or tooltip).
- Destination system: bright dot with subtle glow, labeled.
- Route line: dashed or solid line connecting origin → destination, using the route color from the galaxy map (accent color).
- Existing active routes shown as dim lines in the background for context.
- Optional: viewport indicator if the galaxy map has scrolling in the future.

**Coordinate mapping:**

- Read `StarSystem.x` and `StarSystem.y` from `gameStore.getState().galaxy.systems`.
- Compute bounding box of all systems: `minX, maxX, minY, maxY`.
- Add padding (10% each side).
- Scale and translate to fit within the 160×120 mini-map region.
- `mapX = miniMapX + (sys.x - minX) / (maxX - minX) * miniMapWidth`
- `mapY = miniMapY + (sys.y - minY) / (maxY - minY) * miniMapHeight`

#### 2. Intra-System Route (System View)

Shown when origin and destination planets belong to the same star system.

**Content:**

- System name displayed at the top of the mini-map region in small text.
- Central star dot (4–6 px) with glow, colored by `system.starColor`.
- Concentric orbit rings (1 px lines, dim).
- Planets rendered as small colored dots (2–4 px) on their orbits. Color by planet type using existing type-color mapping.
- Origin planet: highlighted ring or brighter dot, optionally labeled.
- Destination planet: highlighted ring or brighter dot, optionally labeled.
- Route line connecting origin → destination planet dots.

**Coordinate mapping:**

- Mirror `SystemMapScene`'s layout logic: sort planets by zone rank, compute orbit radii and angular positions.
- Scale to fit within the 160×120 region using a smaller `minOrbitRadius` and step size.
- Center star at `(miniMapX + 80, miniMapY + 60)`.

### Visual Style

- **Background:** dark rectangle with subtle border (reuse `theme.colors.panelBg` darkened, or a 1px `theme.colors.accent` border at low alpha).
- **Pixel aesthetic:** use Phaser Graphics primitives (`fillCircle`, `lineBetween`, `strokeCircle`) — no textures needed.
- **Colors:** dim everything except the selected route endpoints. Use `theme.colors.accent` for the route line, `theme.colors.success` for origin, `theme.colors.warning` for destination.
- **Animation:** optional slow pulse on the origin/destination dots to draw the eye.

### Interaction

The mini-map is **display-only** in v1 — no clicks or hover. Future iterations could allow clicking a system/planet on the mini-map to select it as origin/destination.

## Implementation Plan

### Phase 1: MiniMapRenderer Utility

Create `src/ui/MiniMap.ts` — a self-contained renderer class.

```typescript
interface MiniMapConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

class MiniMap {
  private graphics: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;

  constructor(config: MiniMapConfig);

  /** Draw galaxy view highlighting two systems */
  drawGalaxyRoute(
    systems: StarSystem[],
    originSystemId: string,
    destSystemId: string,
    activeRoutes?: ActiveRoute[],
  ): void;

  /** Draw system view highlighting two planets */
  drawSystemRoute(
    system: StarSystem,
    planets: Planet[],
    originPlanetId: string,
    destPlanetId: string,
  ): void;

  /** Clear all drawn content */
  clear(): void;

  /** Remove all game objects */
  destroy(): void;
}
```

**Key decisions:**

- Use a single `Phaser.GameObjects.Graphics` object for all shapes — cheap to clear and redraw.
- One `Phaser.GameObjects.Text` for the system name label (intra-system mode).
- No textures or sprites — pure vector/pixel rendering.

### Phase 2: Integrate into RouteBuilderPanel

Modify `src/ui/RouteBuilderPanel.ts`:

1. **Instantiate** `MiniMap` after panel creation, positioned in the bottom-right area:
   ```
   miniMapX = panelX + panelWidth - 160 - theme.spacing.md
   miniMapY = panelY + panelHeight - 120 - 50  // above buttons
   ```
2. **Track** the mini-map's graphics and text via `layer.track()` (follows the existing pattern).
3. **Update** the mini-map whenever origin or destination selection changes:
   - In `cycleValue()` and any field-change handler, call `updateMiniMap()`.
   - `updateMiniMap()` determines if inter-system or intra-system and calls the appropriate `MiniMap.draw*()` method.
4. **Cleanup** on panel close — call `miniMap.destroy()`.

### Phase 3: Polish & Edge Cases

- **No selection:** If origin or destination is not yet selected, show the galaxy overview with no route line (or a "select planets" hint).
- **Same planet:** If origin === destination, show system view with just the one planet highlighted.
- **Panel resize:** If `panelHeight` needs to grow to fit the mini-map without crowding, increase from 620 to ~680. Adjust centering math.
- **Existing routes overlay:** Draw existing active routes as dim lines on the galaxy mini-map for spatial context.
- **Performance:** The mini-map redraws only on selection change, not every frame. `Graphics.clear()` + redraw is fast for this scale.

### Phase 4: Future Enhancements (Out of Scope for v1)

- **Clickable mini-map:** Click a dot to select it as origin/destination.
- **Hover tooltips:** Show system/planet name on hover.
- **Zoom region:** Highlight the area around the selected route with a brighter inset.
- **Animated route preview:** Show a small pip traveling the route line (like the galaxy map).
- **Sector highlighting:** Tint the region around origin/destination sectors.
- **Route comparison:** When browsing route opportunities in RoutesScene, update the mini-map in the sidebar.

## File Changes Summary

| File                          | Change                                                               |
| ----------------------------- | -------------------------------------------------------------------- |
| `src/ui/MiniMap.ts`           | **New** — MiniMap renderer class                                     |
| `src/ui/index.ts`             | Export MiniMap                                                       |
| `src/ui/RouteBuilderPanel.ts` | Import MiniMap, instantiate, wire to field changes, destroy on close |

## Dependencies

- No new packages required.
- Uses existing Phaser Graphics API and game state data.
- Reuses `SystemMapScene`'s planet sorting/layout logic (extract to a shared util if needed).

## Testing

- Unit test `MiniMap` coordinate mapping: given known system positions and a viewport, verify mapped coordinates fall within bounds.
- Unit test mode selection: inter-system vs intra-system detection based on planet systemIds.
- Manual visual QA: open route builder, cycle through various origin/destination combos, verify mini-map updates correctly for both galaxy and system views.

## Open Questions

1. Should the mini-map also appear in the Route Finder tab of RoutesScene (highlighting the selected opportunity)?
2. Should we extract `SystemMapScene`'s planet-layout logic into a shared util now, or duplicate the simplified version in MiniMap?
3. Preferred mini-map size: 160×120 or larger? May depend on how crowded the panel feels.

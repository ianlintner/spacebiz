# Layout

Reactive layout metrics for HUD-driven scenes — single source of truth for content/sidebar positioning that adapts to game size.

## Import

```ts
import {
  getLayout,
  updateLayout,
  BASE_HEIGHT,
  MIN_WIDTH,
  MAX_WIDTH,
} from "@spacebiz/ui";
import type { LayoutMetrics } from "@spacebiz/ui";
```

## Quick example

```ts
import { getLayout, updateLayout } from "@spacebiz/ui";

this.scale.on("resize", (size: Phaser.Structs.Size) => {
  updateLayout(size.width, size.height);
  const m = getLayout();
  this.panel.setPosition(m.mainContentLeft, m.contentTop);
});
```

## Config

This is a singleton; there is no constructor. `LayoutMetrics` returned by `getLayout()`:

| Field                | Type      | Description                                        |
| -------------------- | --------- | -------------------------------------------------- |
| `gameWidth`          | `number`  | Current game width.                                |
| `gameHeight`         | `number`  | Current game height.                               |
| `maxContentWidth`    | `number`  | Max content area width (game width minus margins). |
| `sidebarWidth`       | `number`  | Sidebar width (0 in compact mode).                 |
| `contentGap`         | `number`  | Gap between sidebar and main content.              |
| `hudTopBarHeight`    | `number`  | HUD top bar height.                                |
| `hudBottomBarHeight` | `number`  | HUD bottom bar height.                             |
| `hudTickerHeight`    | `number`  | HUD ticker bar height.                             |
| `hudBottomBarTop`    | `number`  | Y of the bottom HUD bar.                           |
| `navSidebarWidth`    | `number`  | Left nav sidebar width (0 in portrait).            |
| `contentTop`         | `number`  | Y at which scene content starts.                   |
| `contentHeight`      | `number`  | Available content vertical space.                  |
| `contentLeft`        | `number`  | X of the leftmost content edge.                    |
| `sidebarLeft`        | `number`  | X of the sidebar.                                  |
| `mainContentLeft`    | `number`  | X of the main content area (right of sidebar).     |
| `mainContentWidth`   | `number`  | Width of the main content area.                    |
| `fullContentLeft`    | `number`  | X for full-bleed content.                          |
| `fullContentWidth`   | `number`  | Width for full-bleed content.                      |
| `isPortrait`         | `boolean` | True if `height > width`.                          |
| `isCompact`          | `boolean` | True if `width < 1100`.                            |

## Methods

| Method         | Signature                                 | Description                                |
| -------------- | ----------------------------------------- | ------------------------------------------ |
| `getLayout`    | `() => LayoutMetrics`                     | Read the current metrics.                  |
| `updateLayout` | `(width: number, height: number) => void` | Recompute metrics for a new viewport size. |

## Constants

`BASE_HEIGHT` (720), `MIN_WIDTH` (960), `MAX_WIDTH` (2400). Static fallbacks `GAME_WIDTH`, `GAME_HEIGHT`, `SIDEBAR_WIDTH`, etc. are exported for legacy code paths but new code should call `getLayout()`.

## Events

None.

## Theming

Independent of the active theme.

## See also

- [DepthLayers](./DepthLayers.md)

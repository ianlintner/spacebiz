# Theming

`@spacebiz/ui` is fully theme-driven. A single `ThemeConfig` object holds every color, font, spacing, and animation timing constant. Components read from `getTheme()` at render time, so changing the theme propagates to newly created components.

## API

```ts
import {
  getTheme,
  setTheme,
  DEFAULT_THEME,
  colorToString,
  lerpColor,
} from "@spacebiz/ui";
import type { ThemeConfig } from "@spacebiz/ui";

// Read the current theme.
const theme = getTheme();

// Replace the theme entirely.
setTheme(myCustomTheme);
```

| Function        | Signature                                       | Description                                        |
| --------------- | ----------------------------------------------- | -------------------------------------------------- |
| `getTheme`      | `() => ThemeConfig`                             | Returns the current theme.                         |
| `setTheme`      | `(theme: ThemeConfig) => void`                  | Replaces the global theme.                         |
| `colorToString` | `(color: number) => string`                     | Convert a `0xRRGGBB` number to a `#rrggbb` string. |
| `lerpColor`     | `(c1: number, c2: number, t: number) => number` | Linear-interpolate two colors.                     |
| `DEFAULT_THEME` | `ThemeConfig`                                   | The library's built-in dark sci-fi theme.          |

Existing component instances do not auto-rebuild on theme changes; reposition or recreate them if you swap the theme mid-game.

## Defining a custom theme

The simplest pattern is to spread `DEFAULT_THEME` and override the fields you care about:

```ts
import { setTheme, DEFAULT_THEME } from "@spacebiz/ui";

setTheme({
  ...DEFAULT_THEME,
  colors: {
    ...DEFAULT_THEME.colors,
    accent: 0xff66cc,
    accentHover: 0xff99dd,
  },
  fonts: {
    ...DEFAULT_THEME.fonts,
    heading: { size: 28, family: "'Press Start 2P', monospace" },
  },
});
```

## `ThemeConfig` shape

All colors are `number` (`0xRRGGBB`); all sizes are pixels; all durations are milliseconds.

### `colors`

| Field            | Description                                   |
| ---------------- | --------------------------------------------- |
| `background`     | Scene clear color.                            |
| `panelBg`        | Panel and modal fill.                         |
| `panelBorder`    | Border / scrollbar track.                     |
| `text`           | Primary text color.                           |
| `textDim`        | Secondary / disabled text.                    |
| `accent`         | Accent (titles, indicators, primary buttons). |
| `accentHover`    | Accent hover state.                           |
| `profit`         | Positive / success.                           |
| `loss`           | Negative / danger.                            |
| `warning`        | Warning state.                                |
| `buttonBg`       | Button rest fill.                             |
| `buttonHover`    | Button hover fill.                            |
| `buttonPressed`  | Button pressed fill.                          |
| `buttonDisabled` | Button disabled fill.                         |
| `scrollbarTrack` | Scrollbar track.                              |
| `scrollbarThumb` | Scrollbar thumb.                              |
| `headerBg`       | Table header / title bar background.          |
| `rowEven`        | Even-row background in tables/lists.          |
| `rowOdd`         | Odd-row background in tables/lists.           |
| `rowHover`       | Hovered/selected row background.              |
| `modalOverlay`   | Modal backdrop color.                         |

### `fonts`

Each entry has `{ size: number; family: string }`. The four entries are `heading`, `body`, `caption`, and `value`.

### `spacing`

Tokens `xs` (4), `sm` (8), `md` (16), `lg` (24), `xl` (32) by default. Use these in custom layouts to stay consistent with library components.

### `panel`

| Field          | Description                                 |
| -------------- | ------------------------------------------- |
| `borderWidth`  | Pixel width of inner panel border.          |
| `cornerRadius` | Logical corner radius of nine-slice frames. |
| `titleHeight`  | Pixel height of the title bar.              |

### `button`

| Field         | Description                           |
| ------------- | ------------------------------------- |
| `height`      | Default button height.                |
| `minWidth`    | Minimum button width.                 |
| `borderWidth` | Pixel width of button border accents. |

### `glow`

| Field         | Description                                              |
| ------------- | -------------------------------------------------------- |
| `width`       | Pixel inset for glow nine-slice halos.                   |
| `alpha`       | Idle glow alpha.                                         |
| `activeAlpha` | Glow alpha while a panel is in the active/focused state. |
| `pulseMin`    | Min alpha during ambient breathing.                      |
| `pulseMax`    | Max alpha during ambient breathing.                      |

### `glass`

| Field              | Description                                 |
| ------------------ | ------------------------------------------- |
| `bgAlpha`          | Glass panel base alpha.                     |
| `gradientSteps`    | Number of vertical gradient bands rendered. |
| `topTint`          | Top tint color of the glass gradient.       |
| `bottomTint`       | Bottom tint color.                          |
| `innerBorderAlpha` | Inner highlight border alpha.               |

### `chamfer`

| Field  | Description                                  |
| ------ | -------------------------------------------- |
| `size` | Pixel size of corner chamfer cuts on frames. |

### `ambient`

Animation timings shared by ambient FX. All values are milliseconds unless noted.

| Field                       | Description                                |
| --------------------------- | ------------------------------------------ |
| `starTwinkleDurationMin`    | Fastest star twinkle half-cycle.           |
| `starTwinkleDurationMax`    | Slowest star twinkle half-cycle.           |
| `starShimmerDuration`       | Slow tint-shift half-cycle on white stars. |
| `routePulseDuration`        | Route line breathing half-cycle.           |
| `routePulseAlphaMin`        | Route line minimum alpha.                  |
| `routePulseAlphaMax`        | Route line maximum alpha.                  |
| `routeFlowDuration`         | Route flow-pip travel time.                |
| `panelIdlePulseDuration`    | Panel idle glow half-cycle.                |
| `buttonIdleShimmerDuration` | Button accent shimmer half-cycle.          |
| `orbitalRotationDuration`   | Orbital decoration full rotation duration. |

## Helper functions

```ts
import { colorToString, lerpColor } from "@spacebiz/ui";

colorToString(0x00ffcc); // "#00ffcc"
lerpColor(0x000000, 0xffffff, 0.5); // 0x808080
```

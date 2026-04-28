# Theme

Global design-token registry: colors, fonts, spacing, panel/button/glow/glass styling, and ambient animation timings.

## Import

```ts
import {
  getTheme,
  setTheme,
  DEFAULT_THEME,
  colorToString,
  lerpColor,
} from "@spacebiz/ui";
import type { ThemeConfig } from "@spacebiz/ui";
```

## Quick example

```ts
import { setTheme, DEFAULT_THEME } from "@spacebiz/ui";

setTheme({
  ...DEFAULT_THEME,
  colors: { ...DEFAULT_THEME.colors, accent: 0xff66cc },
});
```

## Config

`ThemeConfig` is the full theme shape. See [Theming](../theming.md) for the per-field reference.

## Methods

| Method          | Signature                                       | Description                                      |
| --------------- | ----------------------------------------------- | ------------------------------------------------ |
| `getTheme`      | `() => ThemeConfig`                             | Read the current theme.                          |
| `setTheme`      | `(theme: ThemeConfig) => void`                  | Replace the global theme.                        |
| `colorToString` | `(color: number) => string`                     | Convert `0xRRGGBB` to `#rrggbb`.                 |
| `lerpColor`     | `(c1: number, c2: number, t: number) => number` | Linear-interpolate two hex colors (`t` ∈ [0,1]). |

## Events

None.

## Theming

This is the theming subsystem itself; every other component depends on it.

## See also

- [Theming](../theming.md)
- [DepthLayers](./DepthLayers.md)

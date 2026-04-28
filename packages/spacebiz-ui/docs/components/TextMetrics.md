# TextMetrics

Text measurement helpers — measure rendered pixel size, fit text with ellipsis, auto-size buttons, and pick the largest font that fits.

## Import

```ts
import {
  measureText,
  fitTextWithEllipsis,
  autoButtonWidth,
  fitFontSize,
} from "@spacebiz/ui";
import type { TextSize } from "@spacebiz/ui";
```

## Quick example

```ts
import { fitTextWithEllipsis, autoButtonWidth } from "@spacebiz/ui";

const trimmed = fitTextWithEllipsis(
  this,
  "A very long planet name",
  120,
  "monospace",
  16,
);
const w = autoButtonWidth(this, "Save Changes", "monospace", 16, 80);
```

## Methods

| Method                | Signature                                                             | Description                                                      |
| --------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `measureText`         | `(scene, text, fontFamily, fontSize) => TextSize`                     | Measure pixel width/height by creating an offscreen probe.       |
| `fitTextWithEllipsis` | `(scene, text, maxWidth, fontFamily, fontSize) => string`             | Trim text and append `…` if it overflows `maxWidth`.             |
| `autoButtonWidth`     | `(scene, label, fontFamily, fontSize, minWidth, paddingX?) => number` | Compute ideal button width for a label, clamped to `minWidth`.   |
| `fitFontSize`         | `(scene, text, fontFamily, maxWidth, candidates) => number`           | Pick the largest size from `candidates` that fits in `maxWidth`. |

`TextSize` is `{ width: number; height: number }`.

## Config

None.

## Events

None.

## Theming

Independent of theme; callers pass in font family/size explicitly.

## See also

- [Button](./Button.md)
- [Theme](./Theme.md)

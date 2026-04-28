# ProgressBar

Animated horizontal progress bar with outer glow, optional centered label, and a customizable label formatter.

## Import

```ts
import { ProgressBar } from "@spacebiz/ui";
import type { ProgressBarConfig } from "@spacebiz/ui";
```

## Quick example

```ts
const bar = new ProgressBar(this, {
  x: 40,
  y: 40,
  width: 200,
  height: 18,
  value: 30,
  maxValue: 100,
  labelFormat: (v, m) => `${v}/${m} fuel`,
});
bar.setValue(75);
```

## Config

| Field         | Type                     | Default                    | Description                |
| ------------- | ------------------------ | -------------------------- | -------------------------- |
| `x`           | `number`                 | —                          | X position.                |
| `y`           | `number`                 | —                          | Y position.                |
| `width`       | `number`                 | —                          | Bar width.                 |
| `height`      | `number`                 | —                          | Bar height.                |
| `value`       | `number`                 | `0`                        | Current value.             |
| `maxValue`    | `number`                 | `100`                      | Max value.                 |
| `showLabel`   | `boolean`                | `true`                     | Render the centered label. |
| `fillColor`   | `number`                 | `theme.colors.accent`      | Fill color.                |
| `bgColor`     | `number`                 | `theme.colors.panelBg`     | Background color.          |
| `borderColor` | `number`                 | `theme.colors.panelBorder` | Border color.              |
| `labelFormat` | `(value, max) => string` | `"NN%"`                    | Label formatter.           |

## Methods

| Method         | Signature                                    | Description                                        |
| -------------- | -------------------------------------------- | -------------------------------------------------- |
| `setValue`     | `(value: number, animate?: boolean) => void` | Update value (clamped). `animate` defaults `true`. |
| `getValue`     | `() => number`                               | Current value.                                     |
| `setMaxValue`  | `(max: number, animate?: boolean) => void`   | Change the max; re-clamps current value.           |
| `setFillColor` | `(color: number) => void`                    | Change fill color at runtime.                      |

## Events

None.

## Theming

Reads `theme.colors.{accent,panelBg,panelBorder,text}`, `theme.panel.borderWidth`, `theme.fonts.caption`.

## See also

- [StatusBadge](./StatusBadge.md)
- [StatRow](./StatRow.md)

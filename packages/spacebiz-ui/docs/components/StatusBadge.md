# StatusBadge

Small pill-shaped status indicator with variant styling (info, success, warning, danger, neutral) and optional pulse.

## Import

```ts
import { StatusBadge } from "@spacebiz/ui";
import type { StatusBadgeConfig, BadgeVariant } from "@spacebiz/ui";
```

## Quick example

```ts
const badge = new StatusBadge(this, {
  x: 16,
  y: 16,
  text: "Active",
  variant: "success",
  pulse: true,
});
badge.update("Low Fuel", "warning");
```

## Config

| Field       | Type           | Default     | Description                                                         |
| ----------- | -------------- | ----------- | ------------------------------------------------------------------- |
| `x`         | `number`       | —           | X position.                                                         |
| `y`         | `number`       | —           | Y position.                                                         |
| `text`      | `string`       | —           | Badge label.                                                        |
| `variant`   | `BadgeVariant` | `"neutral"` | One of `"info" \| "success" \| "warning" \| "danger" \| "neutral"`. |
| `pulse`     | `boolean`      | `false`     | Pulse alpha to draw attention.                                      |
| `bgColor`   | `number`       | per variant | Background color override.                                          |
| `textColor` | `number`       | per variant | Text color override.                                                |

## Methods

| Method        | Signature                                        | Description                                        |
| ------------- | ------------------------------------------------ | -------------------------------------------------- |
| `update`      | `(text: string, variant?: BadgeVariant) => this` | Update text and optionally variant; resizes badge. |
| `badgeWidth`  | getter `number`                                  | Pill width in pixels.                              |
| `badgeHeight` | getter `number`                                  | Pill height in pixels.                             |

## Events

None.

## Theming

Reads `theme.colors.{profit,warning,loss,accent,panelBg,textDim}`, `theme.fonts.caption`, `theme.spacing.{xs,sm}`, `theme.ambient.panelIdlePulseDuration`. Variants map:

| Variant   | Background | Text color             |
| --------- | ---------- | ---------------------- |
| `info`    | `0x002233` | `theme.colors.accent`  |
| `success` | `0x003322` | `theme.colors.profit`  |
| `warning` | `0x332200` | `theme.colors.warning` |
| `danger`  | `0x330011` | `theme.colors.loss`    |
| `neutral` | `panelBg`  | `theme.colors.textDim` |

## See also

- [AmbientFX](./AmbientFX.md) (uses `addPulseTween` internally)
- [StatRow](./StatRow.md)

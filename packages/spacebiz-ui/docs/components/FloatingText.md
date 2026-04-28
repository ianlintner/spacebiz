# FloatingText

Short-lived popup numbers and messages — pops in, drifts upward, fades out, then self-destructs. Common pattern for damage/profit numbers.

## Import

```ts
import { FloatingText } from "@spacebiz/ui";
import type { FloatingTextConfig } from "@spacebiz/ui";
```

## Quick example

```ts
new FloatingText(this, x, y, "+§1,500", 0x00ff88);
new FloatingText(this, x, y, "-§240", 0xff4444, { size: "large", driftX: 8 });
```

## Constructor

```ts
new FloatingText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: number,
  config?: FloatingTextConfig,
)
```

## Config

| Field          | Type                                       | Default    | Description                                     |
| -------------- | ------------------------------------------ | ---------- | ----------------------------------------------- |
| `size`         | `"small" \| "medium" \| "large" \| "huge"` | `"medium"` | Font size preset (14 / 20 / 28 / 42 px).        |
| `bounce`       | `boolean`                                  | `true`     | Pop-in scales to 1.35× before settling to 1.0×. |
| `riseDistance` | `number`                                   | `60`       | Pixels to drift upward.                         |
| `duration`     | `number`                                   | `1200`     | Total animation duration in ms.                 |
| `driftX`       | `number`                                   | `0`        | Signed horizontal drift in pixels.              |

## Methods

None — the instance manages its own lifecycle and destroys itself when the animation completes.

## Events

None.

## Theming

Reads `theme.fonts.value.family`. Color and size are passed in directly.

## See also

- [AmbientFX](./AmbientFX.md) (`flashScreen` pairs well for emphasis)
- [MilestoneOverlay](./MilestoneOverlay.md)

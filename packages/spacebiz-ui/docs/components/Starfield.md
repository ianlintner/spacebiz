# Starfield

Multi-layer parallax starfield with twinkle, color-shimmer, drift, and edge feathering. Ambient tweens are auto-cleaned on scene shutdown.

## Import

```ts
import { createStarfield } from "@spacebiz/ui";
import type { StarfieldConfig } from "@spacebiz/ui";
```

## Quick example

```ts
import { createStarfield, DEPTH_STARFIELD } from "@spacebiz/ui";

createStarfield(this, {
  worldBounds: { minX: 0, maxX: 2400, minY: 0, maxY: 1200 },
  depth: DEPTH_STARFIELD,
});
```

## Config

| Field         | Type                     | Default              | Description                                                     |
| ------------- | ------------------------ | -------------------- | --------------------------------------------------------------- |
| `count`       | `number`                 | `120`                | Legacy single-layer count (overridden by `layers`).             |
| `drift`       | `boolean`                | `true`               | Slow per-star parallax drift.                                   |
| `depth`       | `number`                 | `-100`               | Render depth.                                                   |
| `twinkle`     | `boolean`                | `true`               | Stagger alpha twinkle on ~35% of stars.                         |
| `shimmer`     | `boolean`                | `true`               | Slow tint colour-cycle on ~15% of white stars.                  |
| `width`       | `number`                 | `scene.scale.width`  | Field width when no `worldBounds`.                              |
| `height`      | `number`                 | `scene.scale.height` | Field height when no `worldBounds`.                             |
| `centerX`     | `number`                 | `width/2`            | X center of the field.                                          |
| `centerY`     | `number`                 | `height/2`           | Y center of the field.                                          |
| `worldBounds` | `StarfieldWorldBounds`   | —                    | `{ minX, maxX, minY, maxY }` — overrides width/height/center.   |
| `minZoom`     | `number`                 | `1`                  | Account for camera zoom-out when computing the visible field.   |
| `overscan`    | `number`                 | `320`                | Extra padding outside the visible viewport (pixels).            |
| `edgeFeather` | `number`                 | `0.2`                | Fraction of the field that fades toward edges (`[0.05, 0.45]`). |
| `haze`        | `boolean`                | `true`               | Render soft additive nebulae behind each layer.                 |
| `layers`      | `StarfieldLayerConfig[]` | 3 default layers     | Per-layer configuration (see source for default values).        |

`StarfieldLayerConfig`:

| Field          | Type       | Description                                      |
| -------------- | ---------- | ------------------------------------------------ |
| `count`        | `number`   | Stars in this layer.                             |
| `scrollFactor` | `number`   | Parallax scroll factor (lower = farther/slower). |
| `minAlpha`     | `number`   | Lower-bound alpha.                               |
| `maxAlpha`     | `number`   | Upper-bound alpha.                               |
| `minScale`     | `number`   | Min star scale.                                  |
| `maxScale`     | `number`   | Max star scale.                                  |
| `tints`        | `number[]` | Tint palette to sample.                          |
| `hazeAlpha`    | `number`   | Optional haze alpha.                             |
| `hazeScale`    | `number`   | Optional haze scale.                             |

## Methods

| Method            | Signature                                                 | Description                       |
| ----------------- | --------------------------------------------------------- | --------------------------------- |
| `createStarfield` | `(scene: Phaser.Scene, config?: StarfieldConfig) => void` | Spawn the starfield in the scene. |

## Events

None.

## Theming

Reads `theme.ambient.{starTwinkleDurationMin,starTwinkleDurationMax,starShimmerDuration}`. Requires the `glow-dot` texture.

## See also

- [AmbientFX](./AmbientFX.md)
- [DepthLayers](./DepthLayers.md)

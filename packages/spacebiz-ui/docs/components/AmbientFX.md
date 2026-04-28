# AmbientFX

Reusable ambient animation helpers — pulse, twinkle, float, rotate, plus a screen flash and tween-cleanup helper.

## Import

```ts
import {
  addPulseTween,
  addTwinkleTween,
  addFloatTween,
  addRotateTween,
  registerAmbientCleanup,
  flashScreen,
} from "@spacebiz/ui";
import type { PulseConfig, TwinkleConfig, FloatConfig } from "@spacebiz/ui";
```

## Quick example

```ts
import {
  addPulseTween,
  registerAmbientCleanup,
  flashScreen,
} from "@spacebiz/ui";

const tween = addPulseTween(this, glowSprite, {
  minAlpha: 0.3,
  maxAlpha: 0.8,
  duration: 1500,
});
registerAmbientCleanup(this, [tween]);

flashScreen(this, 0x00ff88, 0.4, 600);
```

## Methods

| Method                   | Signature                                                               | Description                                                           |
| ------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `addPulseTween`          | `(scene, target, config: PulseConfig) => Tween`                         | Infinite alpha pulse (yoyo, repeat -1).                               |
| `addTwinkleTween`        | `(scene, target, config: TwinkleConfig) => Tween`                       | Random-duration alpha twinkle, ideal for stars.                       |
| `addFloatTween`          | `(scene, target, config: FloatConfig) => Tween`                         | Yoyo positional drift by `dx` / `dy`.                                 |
| `addRotateTween`         | `(scene, target, durationMs: number, clockwise?: boolean) => Tween`     | Continuous 360° rotation.                                             |
| `registerAmbientCleanup` | `(scene, tweens: Tween[]) => void`                                      | Stop tweens on scene shutdown. Safe to call multiple times.           |
| `flashScreen`            | `(scene, color: number, peakAlpha?: number, duration?: number) => void` | Briefly tint the whole screen, then fade out. Defaults `0.35`, `600`. |

### Config

`PulseConfig`:

| Field      | Type     | Default            | Description                 |
| ---------- | -------- | ------------------ | --------------------------- |
| `minAlpha` | `number` | —                  | Minimum alpha during pulse. |
| `maxAlpha` | `number` | —                  | Maximum alpha during pulse. |
| `duration` | `number` | —                  | Half-cycle duration in ms.  |
| `ease`     | `string` | `"Sine.easeInOut"` | Tween ease.                 |
| `delay`    | `number` | `0`                | Start delay in ms.          |

`TwinkleConfig`:

| Field         | Type     | Default                | Description                          |
| ------------- | -------- | ---------------------- | ------------------------------------ |
| `minAlpha`    | `number` | —                      | Minimum alpha.                       |
| `maxAlpha`    | `number` | —                      | Maximum alpha.                       |
| `minDuration` | `number` | —                      | Min duration of one half-cycle (ms). |
| `maxDuration` | `number` | —                      | Max duration of one half-cycle (ms). |
| `delay`       | `number` | `random ≤ maxDuration` | Start delay.                         |

`FloatConfig`:

| Field      | Type     | Default            | Description                           |
| ---------- | -------- | ------------------ | ------------------------------------- |
| `dx`       | `number` | —                  | Horizontal drift in px.               |
| `dy`       | `number` | —                  | Vertical drift in px (negative = up). |
| `duration` | `number` | —                  | Half-cycle duration in ms.            |
| `ease`     | `string` | `"Sine.easeInOut"` | Tween ease.                           |
| `delay`    | `number` | `0`                | Start delay.                          |

## Events

None.

## Theming

Standalone helpers; callers pass durations explicitly. The `theme.ambient.*` constants are convenient defaults to feed in.

## See also

- [Starfield](./Starfield.md)
- [StatusBadge](./StatusBadge.md)
- [Theme](./Theme.md)

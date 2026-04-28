# MilestoneOverlay

> Domain component — slated to move to `@rogue-universe/shared`. Documented here while it lives in `@spacebiz/ui`.

Full-screen "dopamine burst" announcement with a typed colour palette (profit, streak, record, warning, etc.). Auto-dismisses after a hold duration.

## Import

```ts
import { MilestoneOverlay } from "@spacebiz/ui";
import type { MilestoneType } from "@spacebiz/ui";
```

## Quick example

```ts
MilestoneOverlay.show(this, "profit_streak", "5-Turn Streak!", "Keep it up.");
```

## Static API

```ts
MilestoneOverlay.show(
  scene: Phaser.Scene,
  type: MilestoneType,
  headline: string,
  subtext?: string,
  onComplete?: () => void,
  options?: { holdDuration?: number },
): void
```

| Argument               | Type            | Default | Description                                                |
| ---------------------- | --------------- | ------- | ---------------------------------------------------------- |
| `scene`                | `Phaser.Scene`  | —       | Scene to render into.                                      |
| `type`                 | `MilestoneType` | —       | Drives the colour palette (see below).                     |
| `headline`             | `string`        | —       | Large headline text; auto-fits.                            |
| `subtext`              | `string`        | —       | Optional sub-text beneath the headline.                    |
| `onComplete`           | `() => void`    | —       | Called after the overlay fades out.                        |
| `options.holdDuration` | `number`        | `1400`  | Time (ms) the overlay stays at full opacity before fading. |

## `MilestoneType`

`"big_profit" | "profit_streak" | "record_profit" | "loss_warning" | "bankruptcy_warning" | "event_opportunity" | "event_hazard" | "sim_complete"`.

Each type has its own background, text, and glow colors (see source).

## Events

None.

## Theming

Reads `theme.fonts.{heading,body}`, `theme.colors.text`. Colors are baked per-type; the rest of the theme does not influence rendering.

## See also

- [FloatingText](./FloatingText.md)
- [AmbientFX](./AmbientFX.md) (`flashScreen` pairs well)

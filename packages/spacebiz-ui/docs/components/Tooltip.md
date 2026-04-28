# Tooltip

Delayed hover tooltip attachable to any interactive `Phaser.GameObjects.GameObject`. Single shared tooltip per scene; track multiple objects via `attachTo`.

## Import

```ts
import { Tooltip } from "@spacebiz/ui";
import type { TooltipConfig } from "@spacebiz/ui";
```

## Quick example

```ts
const tooltip = new Tooltip(this, { showDelay: 400 });
tooltip.attachTo(myButton, "Launch the next supply mission");
tooltip.attachTo(myIcon, "Empire reputation: friendly");
```

## Config

| Field       | Type     | Default | Description                             |
| ----------- | -------- | ------- | --------------------------------------- |
| `maxWidth`  | `number` | `250`   | Max tooltip text width before wrapping. |
| `showDelay` | `number` | `500`   | Hover delay before showing (ms).        |

## Methods

| Method       | Signature                                                           | Description                      |
| ------------ | ------------------------------------------------------------------- | -------------------------------- |
| `attachTo`   | `(gameObject: Phaser.GameObjects.GameObject, text: string) => void` | Attach the tooltip to an object. |
| `detachFrom` | `(gameObject: Phaser.GameObjects.GameObject) => void`               | Stop tracking the object.        |

## Events

None.

## Theming

Reads `theme.colors.{panelBorder,panelBg,text}`, `theme.fonts.caption`, `theme.spacing.{xs,sm}`.

## See also

- [DataTable](./DataTable.md) (has its own row tooltip support via `rowTooltipFn`)
- [InfoCard](./InfoCard.md)

# Button

Primary clickable button with hover/pressed/disabled states, optional auto-width sizing, ellipsis truncation, and an idle accent shimmer.

## Import

```ts
import { Button } from "@spacebiz/ui";
import type { ButtonConfig } from "@spacebiz/ui";
```

## Quick example

```ts
new Button(this, {
  x: 100,
  y: 100,
  label: "Launch",
  autoWidth: true,
  onClick: () => this.scene.start("GameScene"),
});
```

## Config

| Field       | Type         | Default                 | Description                                                          |
| ----------- | ------------ | ----------------------- | -------------------------------------------------------------------- |
| `x`         | `number`     | —                       | X position (top-left).                                               |
| `y`         | `number`     | —                       | Y position (top-left).                                               |
| `width`     | `number`     | `theme.button.minWidth` | Explicit width. Wins over `autoWidth`.                               |
| `height`    | `number`     | `theme.button.height`   | Button height.                                                       |
| `label`     | `string`     | —                       | Button label.                                                        |
| `onClick`   | `() => void` | —                       | Click handler.                                                       |
| `disabled`  | `boolean`    | `false`                 | Render as disabled and skip pointer events.                          |
| `testId`    | `string`     | derived from label      | Stable id for QA automation. Defaults to `btn-<slugified-label>`.    |
| `autoWidth` | `boolean`    | `false`                 | When `true` and no `width`, sizes to fit the label.                  |
| `paddingX`  | `number`     | `20`                    | Horizontal padding per side for `autoWidth` and `ellipsis`.          |
| `ellipsis`  | `boolean`    | `false`                 | When `true`, truncate the label with `…` if it overflows the button. |
| `fontSize`  | `number`     | `theme.fonts.body.size` | Override the label font size.                                        |

## Methods

| Method        | Signature                     | Description                                            |
| ------------- | ----------------------------- | ------------------------------------------------------ |
| `setDisabled` | `(disabled: boolean) => void` | Toggle disabled state.                                 |
| `setLabel`    | `(text: string) => void`      | Change the label text.                                 |
| `setActive`   | `(value: boolean) => this`    | Toggle visual selected state for use in button groups. |

`Button` also overrides `setDepth`, `setPosition`, `setVisible`, and `destroy` to keep its scene-level hit zone in sync.

## Events

None emitted on the Container itself; clicks are dispatched via `onClick`.

## Theming

Reads `theme.button.{height,minWidth}`, `theme.fonts.body`, `theme.colors.{text,textDim,accent}`, `theme.ambient.buttonIdleShimmerDuration`. Requires `btn-normal`, `btn-hover`, `btn-pressed`, `btn-disabled` nine-slice textures.

## See also

- [IconButton](./IconButton.md)
- [Modal](./Modal.md)
- [TextMetrics](./TextMetrics.md)

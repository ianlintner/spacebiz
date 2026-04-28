# ScrollFrame

Single-purpose scrollable viewport. Holds one Container child, clips it via Phaser 4's filter mask, and scrolls vertically on mouse wheel.

The intent is to be the **only** scrollable container in a hierarchy. Children should be content-sized (no internal scroll, no internal mask) so nested clipping doesn't fight the parent.

## Import

```ts
import { ScrollFrame } from "@spacebiz/ui";
import type { ScrollFrameConfig } from "@spacebiz/ui";
```

## Quick example

```ts
const frame = new ScrollFrame(this, { x: 40, y: 80, width: 480, height: 240 });
const table = new DataTable(this, {
  x: 0,
  y: 0,
  width: 480,
  height: 240,
  columns,
  contentSized: true,
});
frame.setContent(table);
table.setRows(rows);
```

## Config

| Field        | Type     | Default | Description                                    |
| ------------ | -------- | ------- | ---------------------------------------------- |
| `x`          | `number` | —       | X position.                                    |
| `y`          | `number` | —       | Y position.                                    |
| `width`      | `number` | —       | Viewport width.                                |
| `height`     | `number` | —       | Viewport height.                               |
| `padding`    | `number` | `0`     | Inner padding applied to the content viewport. |
| `wheelSpeed` | `number` | `0.5`   | Wheel sensitivity multiplier.                  |

## Methods

| Method              | Signature                                       | Description                                                                  |
| ------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `setContent`        | `(child: Phaser.GameObjects.Container) => void` | Adopt a child; auto-wires `contentResize` and `scrollIntoView` events on it. |
| `recomputeBounds`   | `() => void`                                    | Recompute scroll range from current content height.                          |
| `scrollTo`          | `(y: number) => void`                           | Set scroll offset (clamped to `[0, maxScroll]`).                             |
| `scrollIntoView`    | `(top: number, height: number) => void`         | Scroll so a content-coord range is visible.                                  |
| `getViewportHeight` | `() => number`                                  | Visible height (minus padding).                                              |
| `getMaxScroll`      | `() => number`                                  | Maximum scroll offset.                                                       |

## Events

Listens to `contentResize` and `scrollIntoView` on the adopted child Container.

## Theming

Independent of theme. Uses [MaskUtils](./MaskUtils.md) for clipping.

## See also

- [DataTable](./DataTable.md) (use `contentSized: true` when nested)
- [MaskUtils](./MaskUtils.md)
- [ScrollableList](./ScrollableList.md)

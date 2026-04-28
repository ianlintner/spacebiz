# ScrollableList

Vertical list of arbitrary `Phaser.GameObjects.Container` items. Handles selection, hover, scrolling, alternating rows, and optional keyboard navigation.

Prefer [ScrollFrame](./ScrollFrame.md) + custom content for new code; use `ScrollableList` when you need ready-made row selection semantics.

## Import

```ts
import { ScrollableList } from "@spacebiz/ui";
import type { ScrollableListConfig } from "@spacebiz/ui";
```

## Quick example

```ts
const list = new ScrollableList(this, {
  x: 40,
  y: 80,
  width: 320,
  height: 240,
  itemHeight: 48,
  keyboardNavigation: true,
  onSelect: (i) => console.log("selected", i),
});

for (const ship of fleet) {
  const item = this.add.container(0, 0, [
    this.add.text(8, 12, ship.name, { fontSize: "16px" }),
  ]);
  list.addItem(item);
}
```

## Config

| Field                | Type                      | Default | Description                                  |
| -------------------- | ------------------------- | ------- | -------------------------------------------- |
| `x`                  | `number`                  | —       | X position.                                  |
| `y`                  | `number`                  | —       | Y position.                                  |
| `width`              | `number`                  | —       | List width.                                  |
| `height`             | `number`                  | —       | List height (viewport).                      |
| `itemHeight`         | `number`                  | —       | Fixed height of each row.                    |
| `onSelect`           | `(index: number) => void` | —       | Fired when a row is selected.                |
| `onConfirm`          | `(index: number) => void` | —       | Fired on Enter/Space (keyboard nav).         |
| `onCancel`           | `() => void`              | —       | Fired on Escape (keyboard nav).              |
| `keyboardNavigation` | `boolean`                 | `false` | Enable arrow/Enter/Escape navigation.        |
| `autoFocus`          | `boolean`                 | `false` | Select index 0 when the first item is added. |

## Methods

| Method             | Signature                                           | Description                        |
| ------------------ | --------------------------------------------------- | ---------------------------------- |
| `addItem`          | `(container: Phaser.GameObjects.Container) => void` | Append a row.                      |
| `prependItem`      | `(container: Phaser.GameObjects.Container) => void` | Insert a row at the top.           |
| `clearItems`       | `() => void`                                        | Remove all rows.                   |
| `getSelectedIndex` | `() => number`                                      | Currently selected index, or `-1`. |

## Events

None on the list itself; selection is delivered via `onSelect`/`onConfirm`/`onCancel`.

## Theming

Reads `theme.colors.{rowEven,rowOdd,rowHover,accent,scrollbarTrack,scrollbarThumb}`. Uses [MaskUtils](./MaskUtils.md) for clipping.

## See also

- [ScrollFrame](./ScrollFrame.md)
- [DataTable](./DataTable.md)

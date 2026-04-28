# StatRow

Single-line key-value row with left-aligned label, right-aligned value, and a faint dotted leader between them.

## Import

```ts
import { StatRow } from "@spacebiz/ui";
import type { StatRowConfig } from "@spacebiz/ui";
```

## Quick example

```ts
const row = new StatRow(this, {
  x: 16,
  y: 16,
  width: 240,
  label: "Credits",
  value: "§12,400",
});
row.setValue("§13,800", 0x00ff88);
```

## Config

| Field        | Type      | Default               | Description                           |
| ------------ | --------- | --------------------- | ------------------------------------- |
| `x`          | `number`  | —                     | X position.                           |
| `y`          | `number`  | —                     | Y position.                           |
| `width`      | `number`  | —                     | Row width.                            |
| `label`      | `string`  | —                     | Left label text.                      |
| `value`      | `string`  | —                     | Right value text.                     |
| `valueColor` | `number`  | `theme.colors.accent` | Value text color.                     |
| `compact`    | `boolean` | `false`               | Use caption font for compact display. |

## Methods

| Method      | Signature                                 | Description                          |
| ----------- | ----------------------------------------- | ------------------------------------ |
| `setValue`  | `(value: string, color?: number) => this` | Update value (and optionally color). |
| `setLabel`  | `(label: string) => this`                 | Update label.                        |
| `rowHeight` | getter `number`                           | Height for layout stacking.          |

## Events

None.

## Theming

Reads `theme.colors.{textDim,accent,panelBorder}`, `theme.fonts.{body,caption}`.

## See also

- [InfoCard](./InfoCard.md)
- [Label](./Label.md)

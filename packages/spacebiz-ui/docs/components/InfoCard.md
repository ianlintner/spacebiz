# InfoCard

Self-contained glass-styled card with a title, key-value [StatRow](./StatRow.md)s, and an optional description block. Useful for tooltips, sidebar summaries, and entity info popups.

## Import

```ts
import { InfoCard } from "@spacebiz/ui";
import type { InfoCardConfig } from "@spacebiz/ui";
```

## Quick example

```ts
const card = new InfoCard(this, {
  x: 40,
  y: 80,
  width: 240,
  title: "Aurora",
  stats: [
    { label: "Class", value: "Cargo Shuttle" },
    { label: "Fuel", value: "92%", valueColor: 0x00ff88 },
  ],
  description: "Reliable short-haul freighter.",
});
card.updateStat(1, "78%", 0xffaa00);
```

## Config

| Field         | Type                                                           | Default | Description                           |
| ------------- | -------------------------------------------------------------- | ------- | ------------------------------------- |
| `x`           | `number`                                                       | —       | X position.                           |
| `y`           | `number`                                                       | —       | Y position.                           |
| `width`       | `number`                                                       | —       | Card width.                           |
| `title`       | `string`                                                       | —       | Title text in accent color.           |
| `stats`       | `Array<{ label: string; value: string; valueColor?: number }>` | —       | Stat rows shown below the title.      |
| `description` | `string`                                                       | —       | Optional description below the stats. |
| `compact`     | `boolean`                                                      | `false` | Use caption fonts for a smaller card. |

## Methods

| Method       | Signature                                                | Description                           |
| ------------ | -------------------------------------------------------- | ------------------------------------- |
| `updateStat` | `(index: number, value: string, color?: number) => this` | Update a specific stat row.           |
| `cardHeight` | getter `number`                                          | Total computed height (for stacking). |

## Events

None.

## Theming

Reads `theme.colors.{accent,text,textDim}`, `theme.fonts.{body,caption}`, `theme.spacing.sm`. Requires the `panel-bg` nine-slice texture.

## See also

- [StatRow](./StatRow.md)
- [Panel](./Panel.md)

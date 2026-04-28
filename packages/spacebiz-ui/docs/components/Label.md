# Label

Themed `Phaser.GameObjects.Text` with style presets (heading / body / caption / value), optional accent glow, and a built-in drop shadow.

## Import

```ts
import { Label } from "@spacebiz/ui";
import type { LabelConfig, LabelStyle } from "@spacebiz/ui";
```

## Quick example

```ts
new Label(this, {
  x: 24,
  y: 24,
  text: "Galactic Trade",
  style: "heading",
  glow: true,
});
```

## Config

| Field      | Type         | Default             | Description                                                          |
| ---------- | ------------ | ------------------- | -------------------------------------------------------------------- |
| `x`        | `number`     | —                   | X position.                                                          |
| `y`        | `number`     | —                   | Y position.                                                          |
| `text`     | `string`     | —                   | Label text.                                                          |
| `style`    | `LabelStyle` | `"body"`            | `"heading"`, `"body"`, `"caption"`, or `"value"` — pulls from theme. |
| `color`    | `number`     | `theme.colors.text` | Text color override (`0xRRGGBB`).                                    |
| `maxWidth` | `number`     | —                   | When set, enables word-wrap at this width.                           |
| `glow`     | `boolean`    | `false`             | Add an accent-colored glow shadow.                                   |

## Methods

| Method          | Signature                    | Description                    |
| --------------- | ---------------------------- | ------------------------------ |
| `setLabelColor` | `(color: number) => this`    | Change text color.             |
| `setGlow`       | `(enabled: boolean) => this` | Toggle the accent glow shadow. |

`Label` extends `Phaser.GameObjects.Text`, so all standard text methods (`setText`, `setOrigin`, etc.) are available.

## Events

None.

## Theming

Reads `theme.fonts[style]`, `theme.colors.text`, `theme.colors.accent`.

## See also

- [Theme](./Theme.md)
- [StatRow](./StatRow.md)

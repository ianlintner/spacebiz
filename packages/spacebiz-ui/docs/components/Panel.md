# Panel

Glass-styled framed container with optional title bar, drag handle, and ambient idle glow.

## Import

```ts
import { Panel } from "@spacebiz/ui";
import type { PanelConfig } from "@spacebiz/ui";
```

## Quick example

```ts
const panel = new Panel(this, {
  x: 200,
  y: 80,
  width: 400,
  height: 240,
  title: "Fleet Status",
});
const area = panel.getContentArea();
```

## Config

| Field       | Type      | Default | Description                                                              |
| ----------- | --------- | ------- | ------------------------------------------------------------------------ |
| `x`         | `number`  | —       | X position (top-left).                                                   |
| `y`         | `number`  | —       | Y position (top-left).                                                   |
| `width`     | `number`  | —       | Panel width.                                                             |
| `height`    | `number`  | —       | Panel height.                                                            |
| `title`     | `string`  | —       | Optional title-bar text (in accent color).                               |
| `draggable` | `boolean` | `false` | When `true`, drag the title bar (or whole panel if no title) to move it. |
| `showGlow`  | `boolean` | `true`  | Show the breathing accent glow halo behind the panel.                    |

## Methods

| Method           | Signature                                                       | Description                                              |
| ---------------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| `getContentY`    | `() => number`                                                  | Y offset of the content area (below the title bar).      |
| `getContentArea` | `() => { x: number; y: number; width: number; height: number }` | Inner padded content rect for laying out children.       |
| `setActive`      | `(active: boolean) => this`                                     | Brighten/dim the glow halo to flag the panel as focused. |

## Events

None.

## Theming

Reads `theme.glow.*`, `theme.glass.*`, `theme.panel.{borderWidth,cornerRadius,titleHeight}`, `theme.spacing`, `theme.fonts.heading`, `theme.colors.{accent,headerBg}`, `theme.ambient.panelIdlePulseDuration`. Requires `panel-bg` and `panel-glow` nine-slice textures.

## See also

- [Modal](./Modal.md)
- [InfoCard](./InfoCard.md)
- [SceneUiDirector](./SceneUiDirector.md)

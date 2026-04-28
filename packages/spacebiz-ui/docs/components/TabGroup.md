# TabGroup

Horizontal tab bar with click-to-switch content panes.

## Import

```ts
import { TabGroup } from "@spacebiz/ui";
import type { TabGroupConfig, TabConfig } from "@spacebiz/ui";
```

## Quick example

```ts
const overview = this.add.container(0, 0);
const cargo = this.add.container(0, 0);

new TabGroup(this, {
  x: 40,
  y: 80,
  width: 480,
  tabs: [
    { label: "Overview", content: overview },
    { label: "Cargo", content: cargo },
  ],
  defaultTab: 0,
});
```

## Config

| Field        | Type          | Default               | Description                                     |
| ------------ | ------------- | --------------------- | ----------------------------------------------- |
| `x`          | `number`      | —                     | X position.                                     |
| `y`          | `number`      | —                     | Y position.                                     |
| `width`      | `number`      | —                     | Total tab-bar width (split evenly across tabs). |
| `tabHeight`  | `number`      | `theme.button.height` | Tab bar height.                                 |
| `tabs`       | `TabConfig[]` | —                     | Tab definitions.                                |
| `defaultTab` | `number`      | `0`                   | Initially active tab index.                     |

`TabConfig`:

| Field     | Type                           | Description                                 |
| --------- | ------------------------------ | ------------------------------------------- |
| `label`   | `string`                       | Tab label.                                  |
| `content` | `Phaser.GameObjects.Container` | Container shown below the tabs when active. |

## Methods

| Method           | Signature                 | Description                   |
| ---------------- | ------------------------- | ----------------------------- |
| `setActiveTab`   | `(index: number) => void` | Programmatically switch tabs. |
| `getActiveIndex` | `() => number`            | Currently active tab index.   |
| `getTabWidth`    | `() => number`            | Total tab-bar width.          |

## Events

None on the Container. Plays `ui_tab_switch` via [UiSound](./UiSound.md).

## Theming

Reads `theme.colors.{panelBg,headerBg,buttonHover,accent,textDim,panelBorder}`, `theme.fonts.body`, `theme.button.height`, `theme.spacing.sm`.

## See also

- [Panel](./Panel.md)
- [DataTable](./DataTable.md)

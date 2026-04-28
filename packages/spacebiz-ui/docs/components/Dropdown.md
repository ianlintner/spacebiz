# Dropdown

Single-select option picker. Opens an overlay menu beneath the trigger and closes on outside click or selection.

## Import

```ts
import { Dropdown } from "@spacebiz/ui";
import type { DropdownConfig, DropdownOption } from "@spacebiz/ui";
```

## Quick example

```ts
new Dropdown(this, {
  x: 100,
  y: 100,
  width: 200,
  options: [
    { label: "Easy", value: "easy" },
    { label: "Normal", value: "normal" },
    { label: "Hard", value: "hard" },
  ],
  defaultIndex: 1,
  onChange: (value) => console.log(value),
});
```

## Config

| Field          | Type                                     | Default                 | Description                       |
| -------------- | ---------------------------------------- | ----------------------- | --------------------------------- |
| `x`            | `number`                                 | —                       | X position.                       |
| `y`            | `number`                                 | —                       | Y position.                       |
| `width`        | `number`                                 | —                       | Trigger width.                    |
| `height`       | `number`                                 | `36`                    | Trigger height.                   |
| `options`      | `DropdownOption[]`                       | —                       | List of `{ label, value }` items. |
| `defaultIndex` | `number`                                 | `0`                     | Initially selected index.         |
| `onChange`     | `(value: string, index: number) => void` | —                       | Fired after selection.            |
| `fontSize`     | `number`                                 | `theme.fonts.body.size` | Label font size override.         |

`DropdownOption` is `{ label: string; value: string }`.

## Methods

| Method             | Signature                 | Description                       |
| ------------------ | ------------------------- | --------------------------------- |
| `getSelectedIndex` | `() => number`            | Currently selected index.         |
| `getSelectedValue` | `() => string`            | Value of the selected option.     |
| `setSelectedIndex` | `(index: number) => void` | Programmatically select an index. |

## Events

None on the Container — selection is delivered through `onChange`. Plays `ui_click` via [UiSound](./UiSound.md).

## Theming

Reads `theme.colors.{buttonBg,buttonHover,headerBg,rowHover,panelBorder,accent,text,textDim}`, `theme.fonts.body`, `theme.spacing.sm`.

## See also

- [Button](./Button.md)
- [TabGroup](./TabGroup.md)

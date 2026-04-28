# IconButton

Compact icon-only (or icon + label) button used for nav sidebars, toolbars, and quick-access controls.

## Import

```ts
import { IconButton } from "@spacebiz/ui";
import type { IconButtonConfig } from "@spacebiz/ui";
```

## Quick example

```ts
new IconButton(this, {
  x: 16,
  y: 80,
  icon: "icon-fleet",
  label: "Fleet",
  active: true,
  onClick: () => this.scene.start("FleetScene"),
});
```

## Config

| Field       | Type         | Default                | Description                                       |
| ----------- | ------------ | ---------------------- | ------------------------------------------------- |
| `x`         | `number`     | —                      | X position.                                       |
| `y`         | `number`     | —                      | Y position.                                       |
| `icon`      | `string`     | —                      | Texture key for the icon image.                   |
| `size`      | `number`     | `40`                   | Square button size in pixels.                     |
| `label`     | `string`     | —                      | Optional label rendered to the right of the icon. |
| `onClick`   | `() => void` | —                      | Click handler.                                    |
| `tint`      | `number`     | `theme.colors.textDim` | Icon tint at rest.                                |
| `hoverTint` | `number`     | `theme.colors.accent`  | Icon tint on hover.                               |
| `active`    | `boolean`    | `false`                | Initial selected state.                           |
| `disabled`  | `boolean`    | `false`                | Render as disabled (35% alpha) and skip pointers. |

## Methods

| Method           | Signature                   | Description                              |
| ---------------- | --------------------------- | ---------------------------------------- |
| `setActiveState` | `(active: boolean) => this` | Toggle the selected state and indicator. |

## Events

None.

## Theming

Reads `theme.colors.{panelBg,textDim,accent,rowHover}`, `theme.fonts.caption`. Plays `ui_hover` and `ui_click_primary` via [UiSound](./UiSound.md).

## See also

- [Button](./Button.md)
- [UiSound](./UiSound.md)

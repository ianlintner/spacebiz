# DepthLayers

Render-depth constants. Use these instead of magic numbers to keep z-order consistent across scenes.

## Import

```ts
import {
  DEPTH_STARFIELD,
  DEPTH_AMBIENT_MID,
  DEPTH_CONTENT,
  DEPTH_UI,
  DEPTH_MODAL,
  DEPTH_HUD,
} from "@spacebiz/ui";
```

## Quick example

```ts
import { DEPTH_UI, DEPTH_MODAL } from "@spacebiz/ui";

panel.setDepth(DEPTH_UI);
modal.setDepth(DEPTH_MODAL);
```

## Config

| Constant            | Value   | Description                                       |
| ------------------- | ------- | ------------------------------------------------- |
| `DEPTH_STARFIELD`   | `-100`  | Parallax starfield, behind everything.            |
| `DEPTH_AMBIENT_MID` | `-50`   | Nebulae, sector halos, decorative orbital rings.  |
| `DEPTH_CONTENT`     | `0`     | In-world game objects (systems, planets, routes). |
| `DEPTH_UI`          | `100`   | Buttons, panels, regular UI.                      |
| `DEPTH_MODAL`       | `1000`  | Modals and dialogs.                               |
| `DEPTH_HUD`         | `10000` | HUD bars, always on top within a scene.           |

## Methods

None.

## Events

None.

## Theming

Independent of theme.

## See also

- [SceneUiDirector](./SceneUiDirector.md)
- [Modal](./Modal.md)

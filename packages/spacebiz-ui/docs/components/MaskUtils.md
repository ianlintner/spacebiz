# MaskUtils

Phaser 4 clipping-mask helper. Always use this rather than `setMask()` / `createGeometryMask()`, which Phaser 4 logs as deprecated under WebGL.

## Import

```ts
import { applyClippingMask } from "@spacebiz/ui";
```

## Quick example

```ts
import { applyClippingMask } from "@spacebiz/ui";

const maskShape = this.make.graphics({});
maskShape.fillStyle(0xffffff);
maskShape.fillRect(0, 0, 200, 100);
maskShape.setPosition(container.x, container.y);

applyClippingMask(container, maskShape);
```

For nested containers, sync the mask shape's position to the target's world transform each `preupdate`:

```ts
this.events.on("preupdate", () => {
  const m = container.getWorldTransformMatrix();
  maskShape.setPosition(m.tx, m.ty);
});
```

## Methods

| Method              | Signature                                                                                 | Description                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `applyClippingMask` | `(target: Phaser.GameObjects.GameObject, maskShape: Phaser.GameObjects.Graphics) => void` | Enable filters on `target` (idempotent) and add `maskShape` as a clipping mask via the Phaser 4 filter API. |

The function calls `target.enableFilters()` first to lazily allocate the filter camera, then `target.filters.internal.addMask(maskShape, false, undefined, "world")`. Falls back to legacy `setMask` only on non-WebGL renderers (e.g. headless tests).

## Config

None.

## Events

None.

## Theming

Independent of theme.

## See also

- [ScrollFrame](./ScrollFrame.md)
- [DataTable](./DataTable.md)
- [ScrollableList](./ScrollableList.md)

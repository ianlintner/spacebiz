# SceneUiDirector

Scoped UI layer manager. Each layer collects GameObjects and overlays so they can be torn down together (e.g. closing a popup).

## Import

```ts
import { SceneUiDirector, SceneUiLayer } from "@spacebiz/ui";
```

## Quick example

```ts
const director = new SceneUiDirector(this);

const layer = director.openLayer({ key: "settings" });
layer.createOverlay({ closeOnPointerUp: true });
layer.track(
  new Panel(this, {
    x: 100,
    y: 100,
    width: 300,
    height: 200,
    title: "Settings",
  }),
);

// Later, tear it all down:
layer.destroy();
```

## SceneUiDirector

### Constructor

```ts
new SceneUiDirector(scene: Phaser.Scene)
```

Auto-destroys all layers on scene shutdown.

### Methods

| Method       | Signature                                      | Description                                                      |
| ------------ | ---------------------------------------------- | ---------------------------------------------------------------- |
| `openLayer`  | `(options?: { key?: string }) => SceneUiLayer` | Create a new layer. Reusing a `key` destroys the previous layer. |
| `closeAll`   | `() => void`                                   | Destroy all open layers.                                         |
| `destroy`    | `() => void`                                   | Tear down everything; called automatically on scene shutdown.    |
| `unregister` | `(layer: SceneUiLayer) => void`                | Internal — removes a layer from tracking.                        |

## SceneUiLayer

### Methods

| Method          | Signature                                                           | Description                                                 |
| --------------- | ------------------------------------------------------------------- | ----------------------------------------------------------- |
| `track`         | `<T extends GameObject>(object: T) => T`                            | Adopt an object so it's destroyed with the layer.           |
| `trackMany`     | `<T extends GameObject>(...objects: T[]) => T[]`                    | Track multiple objects.                                     |
| `onDestroy`     | `(callback: () => void) => void`                                    | Run a callback when the layer is destroyed.                 |
| `createOverlay` | `(options?: SceneUiOverlayOptions) => Phaser.GameObjects.Rectangle` | Create a full-camera dim overlay (depth `DEPTH_MODAL - 1`). |
| `destroy`       | `() => void`                                                        | Tear down the layer.                                        |

`SceneUiOverlayOptions`:

| Field               | Type         | Default    | Description                                         |
| ------------------- | ------------ | ---------- | --------------------------------------------------- |
| `alpha`             | `number`     | `0.6`      | Overlay alpha.                                      |
| `color`             | `number`     | `0x000000` | Overlay fill color.                                 |
| `closeOnPointerUp`  | `boolean`    | `false`    | Auto-destroy the layer when the overlay is clicked. |
| `onPointerUp`       | `() => void` | —          | Pointer-up handler.                                 |
| `activationDelayMs` | `number`     | `0`        | Delay before the overlay accepts pointer events.    |

## Events

None.

## Theming

Independent of theme. Uses `DEPTH_MODAL` from [DepthLayers](./DepthLayers.md).

## See also

- [Modal](./Modal.md)
- [DepthLayers](./DepthLayers.md)

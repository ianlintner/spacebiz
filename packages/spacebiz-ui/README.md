# @spacebiz/ui

A theme-driven Phaser 4 UI component library written in TypeScript. Used by
[Star Freight Tycoon](https://github.com/ianlintner/space-tycoon); designed to
be reusable in any Phaser 4 game.

## What is this?

A set of canvas-rendered UI primitives (buttons, panels, modals, tables, etc.)
built directly on `Phaser.GameObjects.Container`. No HTML overlays, no DOM
dependencies. Components share a single `Theme` and follow a consistent
constructor-config API: `new Component(scene, config)`.

## Install

```bash
npm install @spacebiz/ui phaser
```

`phaser` is a peer dependency. Phaser 4 is required (named exports only).

## Hello Button

```ts
import * as Phaser from "phaser";
import { Button, getTheme } from "@spacebiz/ui";

class HelloScene extends Phaser.Scene {
  create(): void {
    const theme = getTheme();
    this.cameras.main.setBackgroundColor(theme.colors.bgDeep);

    const button = new Button(this, {
      x: 400,
      y: 300,
      label: "Click me",
      autoWidth: true,
      onClick: () => console.log("clicked"),
    });
    this.add.existing(button);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game",
  scene: [HelloScene],
});
```

## Components

**Foundation** — `Theme`, `Layout`, `DepthLayers`, `TextMetrics`, `MaskUtils`,
`UiSound`, `WidgetHooks`.

**Primitives** — `Button`, `IconButton`, `Panel`, `Label`, `Dropdown`,
`ProgressBar`.

**Composites** — `DataTable`, `ScrollFrame`, `ScrollableList`, `TabGroup`,
`StatRow`, `InfoCard`.

**Feedback** — `Modal`, `Tooltip`, `FloatingText`, `StatusBadge`.

**Ambient / FX** — `Starfield`, `AmbientFX` (pulse / twinkle / float / rotate
tweens), `MilestoneOverlay`.

**Scene utilities** — `SceneUiDirector`, `SceneUiLayer`.

## Examples

Three runnable examples live in [`examples/`](./examples):

- `01-hello-button` — single Button on a scene.
- `02-modal-dialog` — Modal with two Buttons.
- `03-data-table` — DataTable with sample rows.

Each example is a standalone Vite app — `cd examples/01-hello-button && npm install && npm run dev`.

## Documentation

See [`docs/`](./docs) for per-component API reference (work in progress).

## Contributing

Contributions welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE) (c) 2026 Ian Lintner.

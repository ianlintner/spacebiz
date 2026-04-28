# Getting started

`@spacebiz/ui` is a Phaser 4 UI component library. All components extend `Phaser.GameObjects.Container` (or wrap one) and follow the constructor-config pattern: `new Component(scene, config)`.

## Install

The package is currently published as a workspace package inside this repo. To consume it from another workspace, add it to `package.json`:

```json
{
  "dependencies": {
    "@spacebiz/ui": "workspace:*",
    "phaser": "^4.0.0"
  }
}
```

## Phaser 4 game scaffold

```ts
import * as Phaser from "phaser";
import { Button, getTheme } from "@spacebiz/ui";

class HelloScene extends Phaser.Scene {
  create(): void {
    const theme = getTheme();
    this.cameras.main.setBackgroundColor(theme.colors.background);

    new Button(this, {
      x: 100,
      y: 100,
      label: "Click me",
      onClick: () => console.log("clicked"),
    });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  scene: HelloScene,
});
```

Phaser 4 has named exports only. Always use `import * as Phaser from "phaser"` — there is no default export.

## Required textures

Several primitives expect themed nine-slice textures generated at boot time. Your boot scene must create:

- `panel-bg`, `panel-glow` — used by [Panel](./components/Panel.md) and nine-slice composites.
- `btn-normal`, `btn-hover`, `btn-pressed`, `btn-disabled` — used by [Button](./components/Button.md).
- `glow-dot` — used by [Starfield](./components/Starfield.md) and other ambient FX.

These can be generated with `Phaser.Textures.TextureManager.generate` or pre-rendered as PNGs. See the consuming game's `BootScene` for a reference implementation.

## Theme overview

Every visual primitive reads from a single global `ThemeConfig`. Override colors, fonts, and spacing once at boot:

```ts
import { setTheme, DEFAULT_THEME } from "@spacebiz/ui";

setTheme({
  ...DEFAULT_THEME,
  colors: { ...DEFAULT_THEME.colors, accent: 0xff00ff },
});
```

See [Theming](./theming.md) for the full `ThemeConfig` shape.

## Sound integration

The library is audio-engine agnostic. Wire it to your game's audio system once at boot:

```ts
import { registerUiSoundHandler } from "@spacebiz/ui";

registerUiSoundHandler({
  sfx: (key) => audioDirector.sfx(key),
});
```

The library emits keys like `ui_hover`, `ui_click_primary`, `ui_click`, `ui_row_select`, `ui_tab_switch`. If no handler is registered, sound calls are silent no-ops.

## Next steps

- Browse [components](./README.md#components-by-category).
- Read [Theming](./theming.md) to customise the look.

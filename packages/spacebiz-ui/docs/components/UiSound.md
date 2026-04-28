# UiSound

Pluggable SFX hook. The library emits semantic sound keys; the consuming game wires them to its audio engine. No-op if no handler is registered.

## Import

```ts
import { registerUiSoundHandler } from "@spacebiz/ui";
import type { UiSoundHandler } from "@spacebiz/ui";
```

## Quick example

```ts
import { registerUiSoundHandler } from "@spacebiz/ui";

registerUiSoundHandler({
  sfx: (key) => audioDirector.sfx(key),
});
```

## Methods

| Method                   | Signature                           | Description                                          |
| ------------------------ | ----------------------------------- | ---------------------------------------------------- |
| `registerUiSoundHandler` | `(handler: UiSoundHandler) => void` | Register the audio back-end. Call once at game boot. |

`UiSoundHandler` is `{ sfx(key: string): void }`.

## Sound keys emitted

| Key                | Source components                        |
| ------------------ | ---------------------------------------- |
| `ui_hover`         | Button, IconButton                       |
| `ui_click_primary` | Button, IconButton                       |
| `ui_click`         | Dropdown                                 |
| `ui_row_select`    | DataTable                                |
| `ui_tab_switch`    | TabGroup, DataTable (column sort header) |

## Config

None.

## Events

None.

## Theming

Independent of theme.

## See also

- [Button](./Button.md)
- [IconButton](./IconButton.md)
- [Dropdown](./Dropdown.md)

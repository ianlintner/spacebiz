# Modal

Centered dialog with full-screen overlay, title bar, body text, optional Cancel button, close (×) icon, and Enter/Escape keyboard shortcuts.

## Import

```ts
import { Modal } from "@spacebiz/ui";
import type { ModalConfig } from "@spacebiz/ui";
```

## Quick example

```ts
const modal = new Modal(this, {
  title: "End turn?",
  body: "Unconfirmed routes will be cancelled.",
  okText: "End turn",
  cancelText: "Keep planning",
  onOk: () => store.endTurn(),
  onCancel: () => undefined,
});
modal.show();
```

## Config

| Field        | Type         | Default    | Description                                                              |
| ------------ | ------------ | ---------- | ------------------------------------------------------------------------ |
| `title`      | `string`     | —          | Title bar text.                                                          |
| `body`       | `string`     | —          | Body text (word-wrapped to modal width).                                 |
| `okText`     | `string`     | `"OK"`     | OK button label.                                                         |
| `cancelText` | `string`     | `"Cancel"` | Cancel button label.                                                     |
| `onOk`       | `() => void` | —          | Fires on OK click or Enter.                                              |
| `onCancel`   | `() => void` | —          | When provided, renders the Cancel button. Fires on Cancel/×/overlay/Esc. |
| `width`      | `number`     | `400`      | Modal width.                                                             |
| `height`     | `number`     | `250`      | Modal height.                                                            |
| `testId`     | `string`     | `"modal"`  | Test-id prefix; registers `${testId}-ok`, `-cancel`, `-close`.           |

## Methods

| Method | Signature    | Description        |
| ------ | ------------ | ------------------ |
| `show` | `() => void` | Display the modal. |
| `hide` | `() => void` | Hide the modal.    |

## Events

None on the Container — handlers are invoked via the config callbacks. Auto-closes on overlay click, × click, Escape, OK, and Cancel.

## Theming

Reads `theme.colors.{modalOverlay,headerBg,accent,text,textDim}`, `theme.fonts.{heading,body}`, `theme.panel.titleHeight`, `theme.button.height`, `theme.spacing.{xs,sm,md}`. Requires `panel-bg`, `btn-normal`, `btn-hover`, `btn-pressed` nine-slice textures.

## See also

- [Panel](./Panel.md)
- [Button](./Button.md)
- [DepthLayers](./DepthLayers.md)

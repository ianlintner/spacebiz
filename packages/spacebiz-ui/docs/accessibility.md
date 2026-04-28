# Accessibility (Tier 1 UI)

This document describes the keyboard-focus model used by `@spacebiz/ui`
components and how a consumer wires it into a Phaser scene.

## Focus model

There is exactly one focused widget per scene at any time. Focus is tracked by
a per-scene `FocusManager` (in `foundation/FocusManager.ts`) which:

- Keeps an ordered list of registered `Focusable` widgets.
- Cycles focus on `Tab` (forward) and `Shift+Tab` (backward).
- Skips widgets whose `isFocusable()` returns `false` (disabled / hidden).
- Calls the widget's `focus()` / `blur()` methods so the widget can show or
  hide its focus ring.

Components that participate in focus implement the `Focusable` interface:

```ts
interface Focusable {
  focus(): void;
  blur(): void;
  isFocusable(): boolean;
}
```

The visible focus indicator is a 2 px ring drawn around the widget's bounds
with a 2 px offset, using the theme's `focusRing.color`. All of these are
configurable via `ThemeConfig.focusRing`:

```ts
focusRing: {
  color: 0x33ffdd,
  width: 2,
  offset: 2,
}
```

## Wiring up a scene

`Button`, `Dropdown`, and `TabGroup` register themselves with the per-scene
`FocusManager` automatically — there is nothing to wire up for the basic case.
The manager is lazily created the first time any focusable widget asks for it
and is torn down on scene shutdown.

If you want to programmatically focus a specific widget (for example, the
"Start Game" button on a menu screen), call `setFocus(true)`:

```ts
import { Button } from "@spacebiz/ui";

const start = new Button(this, { x: 100, y: 100, label: "Start", onClick });
start.setFocus(true);
```

To inspect or drive the focus directly (testing, custom flows):

```ts
import { FocusManager } from "@spacebiz/ui";

const mgr = FocusManager.forScene(this);
mgr.focusNext(); // Tab
mgr.focusPrev(); // Shift+Tab
mgr.setFocus(myWidget); // explicit
mgr.getFocused(); // current
```

## Per-component keyboard shortcuts

| Component  | Key                        | Behaviour                                          |
| ---------- | -------------------------- | -------------------------------------------------- |
| `Button`   | `Enter` or `Space`         | Activate when focused.                             |
| `Modal`    | `Tab` / `Shift+Tab`        | Cycle focus among the modal's internal buttons.    |
|            | `Enter` / `Space`          | Activate the focused button (defaults to OK).      |
|            | `Escape`                   | Cancel and close (only when `closable !== false`). |
| `Dropdown` | `Enter` or `Space`         | Toggle the option list open / commit selection.    |
|            | `ArrowUp` / `ArrowDown`    | Open the list and move highlight.                  |
|            | `Escape`                   | Close the list without committing.                 |
| `TabGroup` | `ArrowLeft` / `ArrowRight` | Move to the previous / next tab.                   |
|            | `Home` / `End`             | Jump to the first / last tab.                      |

## Modal focus trap

A `Modal` does not register with the scene-level `FocusManager`. Instead it
runs its own focus trap so `Tab` cannot escape the modal while it is showing.
The trap cycles among the close glyph (when `closable`), the OK button, and
the Cancel button (when an `onCancel` is provided). Initial focus lands on the
OK button so the most common interaction — confirm — only requires `Enter`.

When `closable: false` is passed in the config, the close glyph is hidden,
the overlay click is a no-op, and `Escape` is ignored.

## Testing notes

`FocusManager` is the source of truth and is exhaustively unit-tested
(`packages/spacebiz-ui/src/__tests__/a11y/FocusManager.test.ts`). Component
tests rely on the same `Focusable` contract, so any new widget can be unit
tested by stubbing the scene's keyboard / events and asserting the manager
state after key events.

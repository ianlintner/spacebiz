import type * as Phaser from "phaser";
import { getTheme } from "../Theme.ts";

/**
 * Create a hidden focus-ring rectangle sized to wrap a widget of the given
 * pixel bounds. The ring is drawn with theme-driven stroke color/width and
 * sits `theme.focusRing.offset` pixels outside the widget on every side.
 *
 * Caller is responsible for adding the returned rectangle to a container
 * (so it inherits the parent transform) and toggling visibility on
 * focus / blur.
 */
export function createFocusRing(
  scene: Phaser.Scene,
  width: number,
  height: number,
  originX = 0,
  originY = 0,
): Phaser.GameObjects.Rectangle {
  const theme = getTheme();
  const offset = theme.focusRing.offset;
  return scene.add
    .rectangle(
      originX - offset,
      originY - offset,
      width + offset * 2,
      height + offset * 2,
    )
    .setOrigin(0, 0)
    .setStrokeStyle(theme.focusRing.width, theme.focusRing.color)
    .setFillStyle(0x000000, 0)
    .setVisible(false);
}

/**
 * Anything that participates in keyboard focus traversal.
 *
 * Components implement this so the {@link FocusManager} can move focus among
 * them with Tab/Shift+Tab. Implementations are responsible for showing /
 * hiding their focus ring inside `focus()` / `blur()`.
 */
export interface Focusable {
  /** Mark this widget as focused (show focus ring, accept key input). */
  focus(): void;
  /** Mark this widget as no longer focused (hide focus ring). */
  blur(): void;
  /**
   * Return true when this widget is currently eligible for focus
   * (visible, enabled, attached to the scene). Disabled or hidden widgets
   * should return false so the manager skips over them.
   */
  isFocusable(): boolean;
}

/**
 * Per-scene keyboard focus tracker.
 *
 * The manager owns:
 *   - The set of {@link Focusable} widgets registered against the scene.
 *   - The currently focused widget (or `null`).
 *   - A keyboard listener that handles Tab / Shift+Tab traversal.
 *
 * Use {@link FocusManager.forScene} to retrieve the scene-scoped instance.
 * One manager is lazily created per scene and torn down on scene shutdown.
 */
export class FocusManager {
  private static readonly registry = new WeakMap<Phaser.Scene, FocusManager>();

  private readonly widgets: Focusable[] = [];
  private focused: Focusable | null = null;
  private destroyed = false;
  private readonly scene: Phaser.Scene;
  private readonly keyHandler: (event: KeyboardEvent) => void;

  private constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.keyHandler = (event: KeyboardEvent) => this.handleKey(event);
    scene.input.keyboard?.on("keydown", this.keyHandler);
    scene.events.once("shutdown", () => this.destroy());
    scene.events.once("destroy", () => this.destroy());
  }

  /**
   * Get (or lazily create) the FocusManager for the given scene.
   * Returns `null` on already-destroyed scenes.
   */
  static forScene(scene: Phaser.Scene): FocusManager {
    let mgr = FocusManager.registry.get(scene);
    if (!mgr) {
      mgr = new FocusManager(scene);
      FocusManager.registry.set(scene, mgr);
    }
    return mgr;
  }

  /** Test-only: discard any cached manager for the given scene. */
  static reset(scene: Phaser.Scene): void {
    const existing = FocusManager.registry.get(scene);
    if (existing) {
      existing.destroy();
      FocusManager.registry.delete(scene);
    }
  }

  register(widget: Focusable): void {
    if (this.destroyed) return;
    if (!this.widgets.includes(widget)) {
      this.widgets.push(widget);
    }
  }

  unregister(widget: Focusable): void {
    const idx = this.widgets.indexOf(widget);
    if (idx >= 0) this.widgets.splice(idx, 1);
    if (this.focused === widget) {
      this.focused = null;
    }
  }

  /** Currently focused widget, or `null`. */
  getFocused(): Focusable | null {
    return this.focused;
  }

  /** All registered widgets, in insertion (tab) order. */
  getWidgets(): readonly Focusable[] {
    return this.widgets;
  }

  /**
   * Focus a specific widget. Blurs the previous one. No-op if `widget` is
   * not currently focusable.
   */
  setFocus(widget: Focusable | null): void {
    if (this.focused === widget) return;
    if (widget && !widget.isFocusable()) return;
    if (this.focused) {
      this.focused.blur();
    }
    this.focused = widget;
    if (widget) widget.focus();
  }

  /** Move focus to the next focusable widget. Wraps around. */
  focusNext(): void {
    this.cycle(1);
  }

  /** Move focus to the previous focusable widget. Wraps around. */
  focusPrev(): void {
    this.cycle(-1);
  }

  private cycle(direction: 1 | -1): void {
    const focusable = this.widgets.filter((w) => w.isFocusable());
    if (focusable.length === 0) {
      this.setFocus(null);
      return;
    }
    let startIdx = this.focused ? focusable.indexOf(this.focused) : -1;
    if (startIdx < 0) {
      startIdx = direction === 1 ? -1 : 0;
    }
    const next =
      focusable[(startIdx + direction + focusable.length) % focusable.length];
    this.setFocus(next);
  }

  private handleKey(event: KeyboardEvent): void {
    if (this.destroyed) return;
    if (event.code !== "Tab") return;
    if (event.shiftKey) {
      this.focusPrev();
    } else {
      this.focusNext();
    }
    event.preventDefault();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.input.keyboard?.off("keydown", this.keyHandler);
    if (this.focused) this.focused.blur();
    this.focused = null;
    this.widgets.length = 0;
    FocusManager.registry.delete(this.scene);
  }
}

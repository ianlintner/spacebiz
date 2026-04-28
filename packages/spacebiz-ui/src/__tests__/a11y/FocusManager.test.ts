import { describe, it, expect, beforeEach, vi } from "vitest";
import type * as Phaser from "phaser";
import { FocusManager, type Focusable } from "../../foundation/FocusManager.ts";

/** Minimal scene-like stub good enough for FocusManager. */
function makeScene(): {
  scene: Phaser.Scene;
  fireKey: (event: KeyboardEvent) => void;
  shutdown: () => void;
} {
  const keyListeners: Array<(event: KeyboardEvent) => void> = [];
  const sceneListeners = new Map<string, Array<() => void>>();
  const scene = {
    input: {
      keyboard: {
        on: (_evt: string, fn: (event: KeyboardEvent) => void) => {
          keyListeners.push(fn);
        },
        off: (_evt: string, fn: (event: KeyboardEvent) => void) => {
          const idx = keyListeners.indexOf(fn);
          if (idx >= 0) keyListeners.splice(idx, 1);
        },
      },
    },
    events: {
      once: (evt: string, fn: () => void) => {
        const list = sceneListeners.get(evt) ?? [];
        list.push(fn);
        sceneListeners.set(evt, list);
      },
    },
  } as unknown as Phaser.Scene;
  return {
    scene,
    fireKey: (event) => keyListeners.slice().forEach((fn) => fn(event)),
    shutdown: () => {
      const list = sceneListeners.get("shutdown") ?? [];
      list.forEach((fn) => fn());
    },
  };
}

class FakeWidget implements Focusable {
  focused = false;
  enabled = true;
  focusCalls = 0;
  blurCalls = 0;
  focus(): void {
    this.focused = true;
    this.focusCalls++;
  }
  blur(): void {
    this.focused = false;
    this.blurCalls++;
  }
  isFocusable(): boolean {
    return this.enabled;
  }
}

describe("FocusManager", () => {
  let env: ReturnType<typeof makeScene>;
  let mgr: FocusManager;

  beforeEach(() => {
    env = makeScene();
    mgr = FocusManager.forScene(env.scene);
  });

  it("returns the same manager for repeated forScene() calls", () => {
    const second = FocusManager.forScene(env.scene);
    expect(second).toBe(mgr);
  });

  it("setFocus blurs the previous widget and focuses the next", () => {
    const a = new FakeWidget();
    const b = new FakeWidget();
    mgr.register(a);
    mgr.register(b);
    mgr.setFocus(a);
    expect(a.focused).toBe(true);
    mgr.setFocus(b);
    expect(a.focused).toBe(false);
    expect(b.focused).toBe(true);
    expect(mgr.getFocused()).toBe(b);
  });

  it("setFocus skips widgets that report not focusable", () => {
    const a = new FakeWidget();
    a.enabled = false;
    mgr.register(a);
    mgr.setFocus(a);
    expect(a.focused).toBe(false);
    expect(mgr.getFocused()).toBeNull();
  });

  it("focusNext cycles in registration order and wraps", () => {
    const widgets = [new FakeWidget(), new FakeWidget(), new FakeWidget()];
    widgets.forEach((w) => mgr.register(w));
    mgr.focusNext();
    expect(mgr.getFocused()).toBe(widgets[0]);
    mgr.focusNext();
    expect(mgr.getFocused()).toBe(widgets[1]);
    mgr.focusNext();
    expect(mgr.getFocused()).toBe(widgets[2]);
    mgr.focusNext();
    expect(mgr.getFocused()).toBe(widgets[0]);
  });

  it("focusPrev cycles backwards and wraps", () => {
    const widgets = [new FakeWidget(), new FakeWidget(), new FakeWidget()];
    widgets.forEach((w) => mgr.register(w));
    mgr.focusPrev();
    expect(mgr.getFocused()).toBe(widgets[2]);
    mgr.focusPrev();
    expect(mgr.getFocused()).toBe(widgets[1]);
  });

  it("focusNext skips disabled widgets", () => {
    const a = new FakeWidget();
    const b = new FakeWidget();
    const c = new FakeWidget();
    b.enabled = false;
    [a, b, c].forEach((w) => mgr.register(w));
    mgr.focusNext();
    expect(mgr.getFocused()).toBe(a);
    mgr.focusNext();
    expect(mgr.getFocused()).toBe(c);
  });

  it("Tab keydown advances focus and Shift+Tab moves backwards", () => {
    const a = new FakeWidget();
    const b = new FakeWidget();
    mgr.register(a);
    mgr.register(b);
    const tab = {
      code: "Tab",
      shiftKey: false,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;
    env.fireKey(tab);
    expect(mgr.getFocused()).toBe(a);
    env.fireKey(tab);
    expect(mgr.getFocused()).toBe(b);
    const shiftTab = {
      code: "Tab",
      shiftKey: true,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;
    env.fireKey(shiftTab);
    expect(mgr.getFocused()).toBe(a);
  });

  it("non-Tab keys are ignored", () => {
    const a = new FakeWidget();
    mgr.register(a);
    env.fireKey({
      code: "Enter",
      shiftKey: false,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(mgr.getFocused()).toBeNull();
  });

  it("unregister drops the widget and clears focus if it was focused", () => {
    const a = new FakeWidget();
    mgr.register(a);
    mgr.setFocus(a);
    mgr.unregister(a);
    expect(mgr.getFocused()).toBeNull();
    expect(mgr.getWidgets()).not.toContain(a);
  });

  it("destroy on scene shutdown blurs the focused widget", () => {
    const a = new FakeWidget();
    mgr.register(a);
    mgr.setFocus(a);
    expect(a.focused).toBe(true);
    env.shutdown();
    expect(a.focused).toBe(false);
  });
});

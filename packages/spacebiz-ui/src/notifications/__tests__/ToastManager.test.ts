import { describe, it, expect, beforeEach, vi } from "vitest";

// Stub the Toast module before importing ToastManager so the manager picks
// up the lightweight stand-in. Tests focus on queue ordering and reflow,
// not on Phaser rendering.
type StubScene = {
  cameras: { main: { width: number; height: number } };
  events: {
    once: (key: string, fn: () => void) => void;
  };
  time: { delayedCall: (ms: number, fn: () => void) => unknown };
  add: { existing: () => void };
  tweens: { add: () => void };
};

interface StubToast {
  toastWidth: number;
  toastHeight: number;
  x: number;
  y: number;
  setDepth: (d: number) => StubToast;
  setPosition: (x: number, y: number) => StubToast;
  slideTo: (x: number, y: number, animate: boolean) => void;
  dismiss: () => void;
  destroy: () => void;
  __config: { onDismiss?: () => void };
}

const constructed: StubToast[] = [];

vi.mock("../Toast.ts", () => {
  class FakeToast implements StubToast {
    toastWidth = 200;
    toastHeight = 40;
    x = 0;
    y = 0;
    __config: { onDismiss?: () => void };
    constructor(_scene: unknown, config: { onDismiss?: () => void }) {
      this.__config = config;
      constructed.push(this);
    }
    setDepth(_d: number): this {
      return this;
    }
    setPosition(x: number, y: number): this {
      this.x = x;
      this.y = y;
      return this;
    }
    slideTo(x: number, y: number, _animate: boolean): void {
      this.x = x - this.toastWidth;
      this.y = y;
    }
    dismiss(): void {
      this.__config.onDismiss?.();
    }
    destroy(): void {}
  }
  return { Toast: FakeToast };
});

function createScene(width = 800, height = 600): StubScene {
  return {
    cameras: { main: { width, height } },
    events: { once: () => {} },
    time: { delayedCall: () => ({}) },
    add: { existing: () => {} },
    tweens: { add: () => {} },
  };
}

beforeEach(() => {
  constructed.length = 0;
});

describe("ToastManager", () => {
  it("stacks toasts top-down in the right corner", async () => {
    const { ToastManager } = await import("../ToastManager.ts");
    const scene = createScene(800, 600) as unknown as Parameters<
      typeof ToastManager.show
    >[0];

    ToastManager.show(scene, { message: "first" });
    ToastManager.show(scene, { message: "second" });
    ToastManager.show(scene, { message: "third" });

    expect(constructed).toHaveLength(3);
    const [a, b, c] = constructed;
    expect(a.y).toBe(16); // TOP_INSET
    expect(b.y).toBe(16 + a.toastHeight + 8);
    expect(c.y).toBe(16 + a.toastHeight + 8 + b.toastHeight + 8);
    // Each toast right-aligned to (width - RIGHT_INSET).
    const rightEdge = 800 - 16;
    expect(a.x + a.toastWidth).toBe(rightEdge);
    expect(b.x + b.toastWidth).toBe(rightEdge);
    expect(c.x + c.toastWidth).toBe(rightEdge);
  });

  it("re-flows remaining toasts when one dismisses early", async () => {
    const { ToastManager } = await import("../ToastManager.ts");
    const scene = createScene() as unknown as Parameters<
      typeof ToastManager.show
    >[0];

    ToastManager.show(scene, { message: "a" });
    ToastManager.show(scene, { message: "b" });
    ToastManager.show(scene, { message: "c" });

    const [a, b, c] = constructed;
    a.dismiss();

    // After A dismisses, B should occupy the top slot.
    expect(b.y).toBe(16);
    expect(c.y).toBe(16 + b.toastHeight + 8);
    expect(ToastManager.active(scene)).toHaveLength(2);
  });

  it("dismissAll clears every toast", async () => {
    const { ToastManager } = await import("../ToastManager.ts");
    const scene = createScene() as unknown as Parameters<
      typeof ToastManager.show
    >[0];

    ToastManager.show(scene, { message: "a" });
    ToastManager.show(scene, { message: "b" });
    expect(ToastManager.active(scene)).toHaveLength(2);

    ToastManager.dismissAll(scene);
    expect(ToastManager.active(scene)).toHaveLength(0);
  });

  it("forwards user onDismiss callback", async () => {
    const { ToastManager } = await import("../ToastManager.ts");
    const scene = createScene() as unknown as Parameters<
      typeof ToastManager.show
    >[0];
    const cb = vi.fn();
    ToastManager.show(scene, { message: "x", onDismiss: cb });
    constructed[0].dismiss();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("isolates registries per scene", async () => {
    const { ToastManager } = await import("../ToastManager.ts");
    const sceneA = createScene() as unknown as Parameters<
      typeof ToastManager.show
    >[0];
    const sceneB = createScene() as unknown as Parameters<
      typeof ToastManager.show
    >[0];
    ToastManager.show(sceneA, { message: "a1" });
    ToastManager.show(sceneB, { message: "b1" });
    ToastManager.show(sceneB, { message: "b2" });
    expect(ToastManager.active(sceneA)).toHaveLength(1);
    expect(ToastManager.active(sceneB)).toHaveLength(2);
  });
});

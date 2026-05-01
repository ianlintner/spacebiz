/**
 * Minimal `phaser` module mock for headless component tests.
 *
 * The real Phaser package can't be imported in Vitest's `node` environment
 * because its bootstrap touches `window` at import time. This mock reproduces
 * just enough of the API surface that the Tier 1 primitive components
 * (`Button`, `Panel`, `Label`, `IconButton`, `Dropdown`, `ProgressBar`) need
 * to construct, react to events, and tear down cleanly.
 *
 * Usage in a test file:
 *
 *   import { vi } from "vitest";
 *   vi.mock("phaser", async () => {
 *     const harness = await import("../_harness/phaserMock.ts");
 *     return harness.makePhaserMock();
 *   });
 *
 * Then `import { Button } from "../../Button.ts"` works as normal.
 */

class EventEmitterStub {
  private listeners = new Map<string, Array<(...args: unknown[]) => void>>();

  on(event: string, fn: (...args: unknown[]) => void): this {
    const list = this.listeners.get(event) ?? [];
    list.push(fn);
    this.listeners.set(event, list);
    return this;
  }

  once(event: string, fn: (...args: unknown[]) => void): this {
    const wrap = (...args: unknown[]): void => {
      this.off(event, wrap);
      fn(...args);
    };
    return this.on(event, wrap);
  }

  off(event: string, fn?: (...args: unknown[]) => void): this {
    if (!fn) {
      this.listeners.delete(event);
      return this;
    }
    const list = this.listeners.get(event);
    if (!list) return this;
    const idx = list.indexOf(fn);
    if (idx >= 0) list.splice(idx, 1);
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    const list = this.listeners.get(event);
    if (!list) return false;
    for (const fn of [...list]) fn(...args);
    return true;
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.length ?? 0;
  }

  removeAllListeners(): this {
    this.listeners.clear();
    return this;
  }
}

class GameObjectStub extends EventEmitterStub {
  scene: any;
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  displayWidth = 0;
  displayHeight = 0;
  alpha = 1;
  visible = true;
  active = true;
  depth = 0;
  originX = 0;
  originY = 0;
  input: { cursor?: string } | null = null;
  parentContainer: ContainerStub | null = null;
  destroyed = false;

  constructor(scene: any) {
    super();
    this.scene = scene;
  }

  setOrigin(x: number, y?: number): this {
    this.originX = x;
    this.originY = y ?? x;
    return this;
  }

  setPosition(x?: number, y?: number): this {
    if (x !== undefined) this.x = x;
    if (y !== undefined) this.y = y;
    return this;
  }

  setX(x: number): this {
    this.x = x;
    return this;
  }

  setY(y: number): this {
    this.y = y;
    return this;
  }

  setSize(w: number, h: number): this {
    this.width = w;
    this.height = h;
    this.displayWidth = w;
    this.displayHeight = h;
    return this;
  }

  setAlpha(a: number): this {
    this.alpha = a;
    return this;
  }

  setVisible(v: boolean): this {
    this.visible = v;
    return this;
  }

  setActive(v: boolean): this {
    this.active = v;
    return this;
  }

  setDepth(d: number): this {
    this.depth = d;
    return this;
  }

  setInteractive(_a?: unknown, _b?: unknown): this {
    this.input = { cursor: "default" };
    return this;
  }

  disableInteractive(): this {
    this.input = null;
    return this;
  }

  setFillStyle(_color?: number, _alpha?: number): this {
    return this;
  }

  setStrokeStyle(_lw?: number, _color?: number): this {
    return this;
  }

  setTint(_t: number): this {
    return this;
  }

  setTexture(_k: string): this {
    return this;
  }

  setColor(_c: string): this {
    return this;
  }

  setText(t: string): this {
    (this as any).text = t;
    return this;
  }

  setShadow(): this {
    return this;
  }

  getWorldTransformMatrix(): { tx: number; ty: number } {
    return { tx: this.x, ty: this.y };
  }

  destroy(): void {
    this.destroyed = true;
    this.removeAllListeners();
  }
}

class ContainerStub extends GameObjectStub {
  list: GameObjectStub[] = [];

  constructor(scene: any, x = 0, y = 0) {
    super(scene);
    this.x = x;
    this.y = y;
  }

  add(child: GameObjectStub | GameObjectStub[]): this {
    const arr = Array.isArray(child) ? child : [child];
    for (const c of arr) {
      this.list.push(c);
      c.parentContainer = this;
    }
    return this;
  }

  preUpdate(): void {
    // intentionally empty; subclasses may override
  }
}

class TextStub extends GameObjectStub {
  text: string;
  style: Record<string, unknown>;
  wordWrapWidth = 0;

  constructor(scene: any, x: number, y: number, text: string, style: any) {
    super(scene);
    this.x = x;
    this.y = y;
    this.text = text;
    this.style = style ?? {};
    // crude width approximation: 8px per char × text length
    this.width = Math.max(1, text.length * 8);
    this.height = 16;
  }

  setText(t: string): this {
    this.text = t;
    this.width = Math.max(1, t.length * 8);
    return this;
  }

  setWordWrapWidth(width: number): this {
    this.wordWrapWidth = width;
    return this;
  }
}

class GameObjectFactoryStub {
  scene: any;
  constructor(scene: any) {
    this.scene = scene;
  }

  zone(x: number, y: number, w: number, h: number): GameObjectStub {
    const g = new GameObjectStub(this.scene);
    g.x = x;
    g.y = y;
    g.width = w;
    g.height = h;
    return g;
  }

  rectangle(
    x: number,
    y: number,
    w: number,
    h: number,
    _color?: number,
    _alpha?: number,
  ): GameObjectStub {
    const g = new GameObjectStub(this.scene);
    g.x = x;
    g.y = y;
    g.width = w;
    g.height = h;
    return g;
  }

  nineslice(
    x: number,
    y: number,
    _key: string,
    _frame?: unknown,
    w?: number,
    h?: number,
  ): GameObjectStub {
    const g = new GameObjectStub(this.scene);
    g.x = x;
    g.y = y;
    g.width = w ?? 0;
    g.height = h ?? 0;
    return g;
  }

  image(x: number, y: number, _key: string): GameObjectStub {
    const g = new GameObjectStub(this.scene);
    g.x = x;
    g.y = y;
    g.width = 32;
    g.height = 32;
    return g;
  }

  circle(
    x: number,
    y: number,
    radius: number,
    _color?: number,
    _alpha?: number,
  ): GameObjectStub {
    const g = new GameObjectStub(this.scene);
    g.x = x;
    g.y = y;
    g.width = radius * 2;
    g.height = radius * 2;
    return g;
  }

  text(x: number, y: number, text: string, style?: any): TextStub {
    return new TextStub(this.scene, x, y, text, style);
  }

  container(x: number, y: number, children?: GameObjectStub[]): ContainerStub {
    const c = new ContainerStub(this.scene, x, y);
    if (children) c.add(children);
    return c;
  }

  existing<T>(go: T): T {
    return go;
  }
}

class TweensStub {
  add(config: any): { stop: () => void; isPlaying: () => boolean } {
    if (config && typeof config.onComplete === "function") {
      // Run synchronously so component "complete" callbacks fire in tests.
      try {
        config.onComplete();
      } catch {
        // ignore — a faulty tween callback shouldn't crash the harness
      }
    }
    return {
      stop() {},
      isPlaying() {
        return false;
      },
    };
  }
}

class TimeStub {
  delayedCall(_delay: number, fn: () => void): { remove: () => void } {
    // Defer one microtask so the call lands after the synchronous setup,
    // matching real Phaser behaviour for the dropdown's outside-click setup.
    queueMicrotask(() => {
      try {
        fn();
      } catch {
        /* ignore */
      }
    });
    return { remove() {} };
  }
}

interface SceneStub {
  add: GameObjectFactoryStub;
  tweens: TweensStub;
  time: TimeStub;
  events: EventEmitterStub;
  input: EventEmitterStub & {
    setDraggable: (..._args: unknown[]) => void;
  };
  scale: EventEmitterStub & { width: number; height: number };
  game: {
    canvas: {
      width: number;
      height: number;
      getBoundingClientRect: () => {
        left: number;
        top: number;
        width: number;
        height: number;
      };
      addEventListener: (e: string, fn: any) => void;
      removeEventListener: (e: string, fn: any) => void;
    };
  };
  sys: { isActive: () => boolean; isVisible: () => boolean };
  scene: { key: string };
}

export function createMockScene(key = "TestScene"): SceneStub {
  const scene = {} as SceneStub;
  scene.add = new GameObjectFactoryStub(scene);
  scene.tweens = new TweensStub();
  scene.time = new TimeStub();
  scene.events = new EventEmitterStub();
  const inputEmitter = new EventEmitterStub() as EventEmitterStub & {
    setDraggable: (..._args: unknown[]) => void;
  };
  inputEmitter.setDraggable = () => {};
  scene.input = inputEmitter;
  const scaleEmitter = new EventEmitterStub() as EventEmitterStub & {
    width: number;
    height: number;
  };
  scaleEmitter.width = 1280;
  scaleEmitter.height = 720;
  scene.scale = scaleEmitter;
  const canvasListeners: Record<string, Array<(...a: unknown[]) => void>> = {};
  scene.game = {
    canvas: {
      width: 1280,
      height: 720,
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 1280,
        height: 720,
      }),
      addEventListener: (e: string, fn: any) => {
        (canvasListeners[e] ??= []).push(fn);
      },
      removeEventListener: (e: string, fn: any) => {
        const list = canvasListeners[e] ?? [];
        const idx = list.indexOf(fn);
        if (idx >= 0) list.splice(idx, 1);
      },
    },
  };
  scene.sys = { isActive: () => true, isVisible: () => true };
  scene.scene = { key };
  return scene;
}

export type MockScene = ReturnType<typeof createMockScene>;

/**
 * Returns the value to be used as the `phaser` module replacement.
 * Must be called from the `vi.mock("phaser", ...)` factory.
 */
export function makePhaserMock(): Record<string, unknown> {
  const Math_ = {
    Clamp(v: number, lo: number, hi: number): number {
      return v < lo ? lo : v > hi ? hi : v;
    },
  };
  class GeomRectangle {
    x: number;
    y: number;
    width: number;
    height: number;
    constructor(x: number, y: number, width: number, height: number) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    }
    static Contains(_r: unknown, _x: number, _y: number): boolean {
      return true;
    }
  }
  const Geom = { Rectangle: GeomRectangle };
  const GameObjects = {
    Container: ContainerStub,
    Text: TextStub,
  };
  const Scene = class {};
  const Input = {
    Pointer: class {},
  };
  const Tweens = {
    Tween: class {},
  };
  return {
    default: {
      Scene,
      GameObjects,
      Math: Math_,
      Geom,
      Input,
      Tweens,
    },
    Scene,
    GameObjects,
    Math: Math_,
    Geom,
    Input,
    Tweens,
  };
}

/**
 * Helper: synthesize a pointer event on a stub-mounted GameObject.
 * Resets idle-shimmer tween side effects across hover/out cycles.
 */
export function fireEvent(
  target: any,
  event: string,
  ...args: unknown[]
): void {
  if (typeof target?.emit === "function") {
    target.emit(event, ...args);
  }
}

/** Internal helpers exposed for unit-test introspection. */
export const _internals = {
  ContainerStub,
  TextStub,
  GameObjectStub,
  EventEmitterStub,
};

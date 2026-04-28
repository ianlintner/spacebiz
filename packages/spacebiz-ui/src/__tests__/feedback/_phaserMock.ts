/**
 * Minimal Phaser stub for headless feedback-component unit tests.
 *
 * This is a temporary harness for the feedback test unit. When the formal
 * harness from unit 6 lands under `__tests__/_harness/`, these tests should
 * migrate to it.
 *
 * Usage in a test file:
 *
 *   import { vi } from "vitest";
 *   import { phaserMockFactory, createMockScene } from "./_phaserMock.ts";
 *   vi.mock("phaser", phaserMockFactory);
 *
 *   // …then import the component under test, AFTER the vi.mock call.
 */

// ─── Tiny event-emitter that mimics the slice of Phaser.Events.EventEmitter
//     used by feedback components ────────────────────────────────────────────
export class MiniEmitter {
  private listeners = new Map<string, Array<{ fn: Function; ctx?: unknown }>>();
  private onceListeners = new Map<
    string,
    Array<{ fn: Function; ctx?: unknown }>
  >();

  on(event: string, fn: Function, ctx?: unknown): this {
    let arr = this.listeners.get(event);
    if (!arr) {
      arr = [];
      this.listeners.set(event, arr);
    }
    arr.push({ fn, ctx });
    return this;
  }

  once(event: string, fn: Function, ctx?: unknown): this {
    let arr = this.onceListeners.get(event);
    if (!arr) {
      arr = [];
      this.onceListeners.set(event, arr);
    }
    arr.push({ fn, ctx });
    return this;
  }

  off(event: string, fn?: Function, _ctx?: unknown): this {
    const filter = (
      arr: Array<{ fn: Function; ctx?: unknown }> | undefined,
    ) => {
      if (!arr) return undefined;
      if (!fn) return [];
      return arr.filter((l) => l.fn !== fn);
    };
    const a = filter(this.listeners.get(event));
    if (a) this.listeners.set(event, a);
    const b = filter(this.onceListeners.get(event));
    if (b) this.onceListeners.set(event, b);
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    const a = this.listeners.get(event);
    if (a) for (const l of [...a]) l.fn.apply(l.ctx, args);
    const b = this.onceListeners.get(event);
    if (b) {
      this.onceListeners.set(event, []);
      for (const l of b) l.fn.apply(l.ctx, args);
    }
    return true;
  }

  listenerCount(event: string): number {
    return (
      (this.listeners.get(event)?.length ?? 0) +
      (this.onceListeners.get(event)?.length ?? 0)
    );
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
    return this;
  }
}

// ─── Game object stubs ──────────────────────────────────────────────────────
export class MockGameObject extends MiniEmitter {
  scene: MockScene;
  type = "GameObject";
  visible = true;
  alpha = 1;
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  depth = 0;
  scaleX = 1;
  scaleY = 1;
  rotation = 0;
  input: { cursor?: string } | null = null;
  destroyed = false;

  constructor(scene: MockScene, x = 0, y = 0) {
    super();
    this.scene = scene;
    this.x = x;
    this.y = y;
  }

  setOrigin(_x?: number, _y?: number): this {
    return this;
  }
  setVisible(v: boolean): this {
    this.visible = v;
    return this;
  }
  setAlpha(a: number): this {
    this.alpha = a;
    return this;
  }
  setDepth(d: number): this {
    this.depth = d;
    return this;
  }
  setScale(s: number): this {
    this.scaleX = s;
    this.scaleY = s;
    return this;
  }
  setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }
  setSize(w: number, h: number): this {
    this.width = w;
    this.height = h;
    return this;
  }
  setInteractive(_hitArea?: unknown, _callback?: unknown): this {
    this.input = { cursor: undefined };
    return this;
  }
  setTint(_tint: number): this {
    return this;
  }
  setBlendMode(_mode: number): this {
    return this;
  }
  setStrokeStyle(_w?: number, _c?: number, _a?: number): this {
    return this;
  }
  setFillStyle(_c?: number, _a?: number): this {
    return this;
  }
  setScrollFactor(_f: number): this {
    return this;
  }
  setTexture(_key: string): this {
    return this;
  }
  setText(t: string): this {
    (this as MockGameObject & { text?: string }).text = String(t);
    return this;
  }
  setColor(_c: string): this {
    return this;
  }
  destroy(_fromScene?: boolean): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emit("destroy");
    if (this.scene) {
      this.scene.children.removeFromList(this);
    }
  }
}

export class MockContainer extends MockGameObject {
  type = "Container";
  list: MockGameObject[] = [];
  add(child: MockGameObject | MockGameObject[]): this {
    const arr = Array.isArray(child) ? child : [child];
    for (const c of arr) this.list.push(c);
    return this;
  }
  remove(child: MockGameObject): this {
    const i = this.list.indexOf(child);
    if (i >= 0) this.list.splice(i, 1);
    return this;
  }
}

export class MockText extends MockGameObject {
  type = "Text";
  text: string;
  width = 100;
  height = 20;
  constructor(scene: MockScene, x: number, y: number, text: string) {
    super(scene, x, y);
    this.text = String(text ?? "");
    // Approximate width from text length
    this.width = Math.max(10, this.text.length * 8);
  }
  setText(t: string): this {
    this.text = String(t);
    this.width = Math.max(10, this.text.length * 8);
    return this;
  }
}

export class MockRectangle extends MockGameObject {
  type = "Rectangle";
  fillColor: number;
  fillAlpha: number;
  constructor(
    scene: MockScene,
    x: number,
    y: number,
    w: number,
    h: number,
    color = 0,
    alpha = 1,
  ) {
    super(scene, x, y);
    this.width = w;
    this.height = h;
    this.fillColor = color;
    this.fillAlpha = alpha;
  }
  setFillStyle(c?: number, a?: number): this {
    if (c !== undefined) this.fillColor = c;
    if (a !== undefined) this.fillAlpha = a;
    return this;
  }
}

export class MockImage extends MockGameObject {
  type = "Image";
  texture: string;
  constructor(scene: MockScene, x: number, y: number, key: string) {
    super(scene, x, y);
    this.texture = key;
  }
}

export class MockNineslice extends MockGameObject {
  type = "NineSlice";
  texture: string;
  constructor(
    scene: MockScene,
    x: number,
    y: number,
    key: string,
    w = 100,
    h = 100,
  ) {
    super(scene, x, y);
    this.texture = key;
    this.width = w;
    this.height = h;
  }
  setTexture(k: string): this {
    this.texture = k;
    return this;
  }
}

// ─── Tween stubs ────────────────────────────────────────────────────────────
export interface MockTween {
  config: Record<string, unknown>;
  isPlaying: () => boolean;
  stop: () => void;
  destroy: () => void;
  stopped: boolean;
  destroyed: boolean;
  /** Trigger the configured onComplete callback synchronously. */
  complete: () => void;
}

function makeTween(config: Record<string, unknown>): MockTween {
  let stopped = false;
  let destroyed = false;
  return {
    config,
    isPlaying: () => !stopped && !destroyed,
    stop: () => {
      stopped = true;
    },
    destroy: () => {
      destroyed = true;
    },
    get stopped() {
      return stopped;
    },
    get destroyed() {
      return destroyed;
    },
    complete: () => {
      const fn = config.onComplete as (() => void) | undefined;
      if (fn) fn();
    },
  };
}

export class MockTimerEvent {
  destroyed = false;
  fired = false;
  delay: number;
  callback: () => void;
  constructor(delay: number, callback: () => void) {
    this.delay = delay;
    this.callback = callback;
  }
  destroy(): void {
    this.destroyed = true;
  }
  fire(): void {
    if (this.destroyed) return;
    this.fired = true;
    this.callback();
  }
}

// ─── Scene stub ─────────────────────────────────────────────────────────────
export class MockScene {
  cameras: { main: { width: number; height: number; zoom: number } };
  scale: { width: number; height: number };
  textures: {
    exists: (k: string) => boolean;
    add: (k: string) => void;
    _set: Set<string>;
  };
  events = new MiniEmitter();
  input: {
    keyboard: {
      on: (e: string, fn: Function, ctx?: unknown) => void;
      off: (e: string, fn: Function, ctx?: unknown) => void;
      _emit: (event: { code: string; preventDefault?: () => void }) => void;
    };
  };

  children: {
    list: MockGameObject[];
    exists: (o: MockGameObject) => boolean;
    removeFromList: (o: MockGameObject) => void;
  };

  add: {
    container: (x?: number, y?: number) => MockContainer;
    rectangle: (
      x: number,
      y: number,
      w: number,
      h: number,
      color?: number,
      alpha?: number,
    ) => MockRectangle;
    text: (x: number, y: number, t: string, _style?: unknown) => MockText;
    image: (x: number, y: number, key: string) => MockImage;
    nineslice: (
      x: number,
      y: number,
      key: string,
      _frame?: unknown,
      w?: number,
      h?: number,
      _l?: number,
      _r?: number,
      _t?: number,
      _b?: number,
    ) => MockNineslice;
    existing: <T extends MockGameObject>(o: T) => T;
  };

  tweens: {
    add: (config: Record<string, unknown>) => MockTween;
    _all: MockTween[];
  };

  time: {
    delayedCall: (delay: number, cb: () => void) => MockTimerEvent;
    _all: MockTimerEvent[];
  };

  constructor(width = 800, height = 600) {
    this.cameras = { main: { width, height, zoom: 1 } };
    this.scale = { width, height };

    const textureSet = new Set<string>();
    this.textures = {
      exists: (k) => textureSet.has(k),
      add: (k) => {
        textureSet.add(k);
      },
      _set: textureSet,
    };

    const childList: MockGameObject[] = [];
    this.children = {
      list: childList,
      exists: (o) => childList.includes(o),
      removeFromList: (o) => {
        const i = childList.indexOf(o);
        if (i >= 0) childList.splice(i, 1);
      },
    };

    const tweens: MockTween[] = [];
    this.tweens = {
      add: (config) => {
        const t = makeTween(config);
        tweens.push(t);
        return t;
      },
      _all: tweens,
    };

    const timers: MockTimerEvent[] = [];
    this.time = {
      delayedCall: (delay, cb) => {
        const t = new MockTimerEvent(delay, cb);
        timers.push(t);
        return t;
      },
      _all: timers,
    };

    const kbEmitter = new MiniEmitter();
    this.input = {
      keyboard: {
        on: (e, fn, ctx) => {
          kbEmitter.on(e, fn, ctx);
        },
        off: (e, fn, ctx) => {
          kbEmitter.off(e, fn, ctx);
        },
        _emit: (event) => {
          kbEmitter.emit("keydown", event);
        },
      },
    };

    const self = this;
    this.add = {
      container: (x = 0, y = 0) => {
        const c = new MockContainer(self, x, y);
        childList.push(c);
        return c;
      },
      rectangle: (x, y, w, h, color, alpha) => {
        const r = new MockRectangle(self, x, y, w, h, color, alpha);
        childList.push(r);
        return r;
      },
      text: (x, y, t) => {
        const tx = new MockText(self, x, y, t);
        childList.push(tx);
        return tx;
      },
      image: (x, y, key) => {
        const im = new MockImage(self, x, y, key);
        childList.push(im);
        return im;
      },
      nineslice: (x, y, key, _frame, w, h) => {
        const n = new MockNineslice(self, x, y, key, w, h);
        childList.push(n);
        return n;
      },
      existing: (o) => {
        if (!childList.includes(o)) childList.push(o);
        return o;
      },
    };
  }
}

export function createMockScene(width = 800, height = 600): MockScene {
  return new MockScene(width, height);
}

// ─── vi.mock factory ────────────────────────────────────────────────────────
/** Module factory for `vi.mock("phaser", phaserMockFactory)`. */
export function phaserMockFactory() {
  return {
    GameObjects: {
      Container: MockContainer,
      Rectangle: MockRectangle,
      Text: MockText,
      Image: MockImage,
      GameObject: MockGameObject,
    },
    Geom: {
      Rectangle: class GeomRect {
        x: number;
        y: number;
        w: number;
        h: number;
        constructor(x: number, y: number, w: number, h: number) {
          this.x = x;
          this.y = y;
          this.w = w;
          this.h = h;
        }
        static Contains(
          rect: { x: number; y: number; w: number; h: number },
          x: number,
          y: number,
        ): boolean {
          return (
            x >= rect.x &&
            x <= rect.x + rect.w &&
            y >= rect.y &&
            y <= rect.y + rect.h
          );
        }
      },
    },
    Math: {
      Clamp: (v: number, lo: number, hi: number) =>
        Math.max(lo, Math.min(hi, v)),
    },
    BlendModes: { ADD: 1, NORMAL: 0 },
    Tweens: { Tween: class Tween {} },
    Time: { TimerEvent: MockTimerEvent },
    Input: { Pointer: class Pointer {} },
    Events: { EventEmitter: MiniEmitter },
  };
}

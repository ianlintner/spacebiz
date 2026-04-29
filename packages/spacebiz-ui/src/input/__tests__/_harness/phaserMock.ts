/**
 * Minimal `phaser` module mock for headless input-component tests.
 *
 * The real Phaser package can't be imported in Vitest's `node` environment
 * because its bootstrap touches `window` at import time. This mock reproduces
 * just enough of the API surface that the form-control components
 * (`Slider`, `Checkbox`, `Toggle`, `RadioGroup`) need to construct, react to
 * events, and tear down cleanly.
 *
 * Usage in a test file:
 *
 *   import { vi } from "vitest";
 *   vi.mock("phaser", async () => {
 *     const harness = await import("./_harness/phaserMock.ts");
 *     return harness.makePhaserMock();
 *   });
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
  alpha = 1;
  visible = true;
  active = true;
  input: { cursor?: string } | null = null;
  parentContainer: ContainerStub | null = null;

  constructor(scene: any) {
    super();
    this.scene = scene;
  }

  setOrigin(_x: number, _y?: number): this {
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

  setSize(w: number, h: number): this {
    this.width = w;
    this.height = h;
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

  setStrokeStyle(_lw?: number, _color?: number, _alpha?: number): this {
    return this;
  }

  setColor(_c: string): this {
    return this;
  }

  setText(t: string): this {
    (this as any).text = t;
    return this;
  }

  getWorldTransformMatrix(): { tx: number; ty: number } {
    return { tx: this.x, ty: this.y };
  }

  destroy(): void {
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
}

class TextStub extends GameObjectStub {
  text: string;
  style: Record<string, unknown>;

  constructor(scene: any, x: number, y: number, text: string, style: any) {
    super(scene);
    this.x = x;
    this.y = y;
    this.text = text;
    this.style = style ?? {};
    this.width = Math.max(1, text.length * 8);
    this.height = 16;
  }

  setText(t: string): this {
    this.text = t;
    this.width = Math.max(1, t.length * 8);
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

  existing<T>(go: T): T {
    return go;
  }
}

class TweensStub {
  add(config: any): { stop: () => void } {
    if (config && typeof config.onComplete === "function") {
      try {
        config.onComplete();
      } catch {
        /* ignore */
      }
    }
    return { stop() {} };
  }
}

interface SceneStub {
  add: GameObjectFactoryStub;
  tweens: TweensStub;
  events: EventEmitterStub;
  input: EventEmitterStub;
}

export function createMockScene(): SceneStub {
  const scene = {} as SceneStub;
  scene.add = new GameObjectFactoryStub(scene);
  scene.tweens = new TweensStub();
  scene.events = new EventEmitterStub();
  scene.input = new EventEmitterStub();
  return scene;
}

export type MockScene = ReturnType<typeof createMockScene>;

export function makePhaserMock(): Record<string, unknown> {
  const Math_ = {
    Clamp(v: number, lo: number, hi: number): number {
      return v < lo ? lo : v > hi ? hi : v;
    },
  };
  const Geom = {
    Rectangle: class {
      x: number;
      y: number;
      width: number;
      height: number;
      constructor(x: number, y: number, w: number, h: number) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
      }
      static Contains(_r: unknown, _x: number, _y: number): boolean {
        return true;
      }
    },
  };
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

export function fireEvent(
  target: any,
  event: string,
  ...args: unknown[]
): void {
  if (typeof target?.emit === "function") {
    target.emit(event, ...args);
  }
}

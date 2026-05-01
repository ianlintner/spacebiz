/**
 * Minimal Phaser 4 mock for headless component tests.
 *
 * Use via `vi.mock("phaser", () => import("./_harness/mockPhaser.ts"))` at
 * the top of a test file. The mock implements just enough surface area for
 * the spacebiz-ui composite components to instantiate, render, and respond
 * to method calls without booting a real Phaser game.
 *
 * Out-of-scope: actual rendering, hit testing, real input dispatch. Tests
 * exercise data-flow and callback wiring; pointer events are simulated by
 * directly calling `gameObject.emit("pointerover", ...)`.
 */

interface HandlerEntry {
  fn: (...args: unknown[]) => void;
  ctx: unknown;
}

class EventEmitter {
  private handlers: Record<string, HandlerEntry[]> = {};

  on(event: string, fn: (...args: unknown[]) => void, ctx?: unknown): this {
    (this.handlers[event] ??= []).push({ fn, ctx });
    return this;
  }

  once(event: string, fn: (...args: unknown[]) => void, ctx?: unknown): this {
    const wrapper = (...args: unknown[]) => {
      this.off(event, wrapper);
      fn.apply(ctx, args);
    };
    return this.on(event, wrapper, ctx);
  }

  off(event: string, fn?: (...args: unknown[]) => void, _ctx?: unknown): this {
    if (!this.handlers[event]) return this;
    if (!fn) {
      delete this.handlers[event];
    } else {
      this.handlers[event] = this.handlers[event].filter((h) => h.fn !== fn);
    }
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    const list = this.handlers[event];
    if (!list || list.length === 0) return false;
    for (const entry of [...list]) entry.fn.apply(entry.ctx, args);
    return true;
  }

  removeAllListeners(): this {
    this.handlers = {};
    return this;
  }
}

class GameObject extends EventEmitter {
  scene: MockScene;
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  alpha = 1;
  visible = true;
  depth = 0;
  parentContainer: Container | null = null;
  input: { cursor: string } | null = null;
  type = "GameObject";
  private data: Record<string, unknown> = {};
  destroyed = false;

  constructor(scene: MockScene, x = 0, y = 0) {
    super();
    this.scene = scene;
    this.x = x;
    this.y = y;
  }

  setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
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
  setSize(w: number, h: number): this {
    this.width = w;
    this.height = h;
    return this;
  }
  setOrigin(_x: number, _y?: number): this {
    return this;
  }
  setInteractive(_hit?: unknown, _cb?: unknown): this {
    this.input = { cursor: "default" };
    return this;
  }
  disableInteractive(): this {
    this.input = null;
    return this;
  }
  setData(k: string, v: unknown): this {
    this.data[k] = v;
    return this;
  }
  getData(k: string): unknown {
    return this.data[k];
  }
  setName(_n: string): this {
    return this;
  }
  setScrollFactor(_x: number, _y?: number): this {
    return this;
  }
  setBlendMode(_m: unknown): this {
    return this;
  }
  setMask(_m: unknown): this {
    return this;
  }
  enableFilters(): this {
    if (!(this as unknown as { _filters?: unknown })._filters) {
      (this as unknown as { _filters: unknown })._filters = {
        internal: {
          addMask: (
            _shape: unknown,
            _invert?: boolean,
            _cam?: unknown,
            _vt?: string,
          ) => undefined,
        },
        external: { addMask: (_shape: unknown) => undefined },
      };
    }
    return this;
  }
  get filters(): {
    internal: { addMask: (...args: unknown[]) => unknown };
    external: { addMask: (...args: unknown[]) => unknown };
  } | null {
    return (
      ((this as unknown as { _filters?: unknown })._filters as {
        internal: { addMask: (...args: unknown[]) => unknown };
        external: { addMask: (...args: unknown[]) => unknown };
      } | null) ?? null
    );
  }
  getWorldTransformMatrix(): { tx: number; ty: number } {
    let tx = this.x;
    let ty = this.y;
    let p = this.parentContainer;
    while (p) {
      tx += p.x;
      ty += p.y;
      p = p.parentContainer;
    }
    return { tx, ty };
  }
  getBounds(): { x: number; y: number; width: number; height: number } {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }
  destroy(_fromScene?: boolean): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emit("destroy");
    this.removeAllListeners();
    if (this.parentContainer) {
      this.parentContainer.remove(this, false);
    }
  }
}

class Rectangle extends GameObject {
  fillColor = 0;
  fillAlpha = 1;
  type = "Rectangle";
  constructor(
    scene: MockScene,
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor = 0,
    fillAlpha = 1,
  ) {
    super(scene, x, y);
    this.width = width;
    this.height = height;
    this.fillColor = fillColor;
    this.fillAlpha = fillAlpha;
  }
  setFillStyle(color: number, alpha = 1): this {
    this.fillColor = color;
    this.fillAlpha = alpha;
    return this;
  }
  setStrokeStyle(_w: number, _color?: number, _alpha?: number): this {
    return this;
  }
  setDisplaySize(w: number, h: number): this {
    this.width = w;
    this.height = h;
    return this;
  }
}

class Line extends GameObject {
  type = "Line";
  geomX1 = 0;
  geomY1 = 0;
  geomX2 = 0;
  geomY2 = 0;
  strokeColor = 0;
  strokeAlpha = 1;
  lineWidth = 1;
  constructor(
    scene: MockScene,
    x: number,
    y: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    strokeColor = 0,
    strokeAlpha = 1,
  ) {
    super(scene, x, y);
    this.geomX1 = x1;
    this.geomY1 = y1;
    this.geomX2 = x2;
    this.geomY2 = y2;
    this.strokeColor = strokeColor;
    this.strokeAlpha = strokeAlpha;
  }
  setTo(x1: number, y1: number, x2: number, y2: number): this {
    this.geomX1 = x1;
    this.geomY1 = y1;
    this.geomX2 = x2;
    this.geomY2 = y2;
    return this;
  }
  setStrokeStyle(lineWidth: number, color = 0, alpha = 1): this {
    this.lineWidth = lineWidth;
    this.strokeColor = color;
    this.strokeAlpha = alpha;
    return this;
  }
  setOrigin(_x: number, _y?: number): this {
    return this;
  }
}

class TextObject extends GameObject {
  text: string;
  style: Record<string, unknown>;
  type = "Text";
  constructor(
    scene: MockScene,
    x: number,
    y: number,
    text: string | string[],
    style: Record<string, unknown> = {},
  ) {
    super(scene, x, y);
    this.text = Array.isArray(text) ? text.join("\n") : text;
    this.style = style;
    // Approximate text size from font size and length.
    const fs =
      typeof style.fontSize === "string" ? parseInt(style.fontSize, 10) : 14;
    this.width = Math.max(1, this.text.length * Math.floor(fs * 0.55));
    this.height = fs + 4;
  }
  setText(text: string | string[]): this {
    this.text = Array.isArray(text) ? text.join("\n") : text;
    const fs =
      typeof this.style.fontSize === "string"
        ? parseInt(this.style.fontSize as string, 10)
        : 14;
    this.width = Math.max(1, this.text.length * Math.floor(fs * 0.55));
    return this;
  }
  setColor(c: string): this {
    this.style.color = c;
    return this;
  }
  setFontStyle(s: string): this {
    this.style.fontStyle = s;
    return this;
  }
  setCrop(_x: number, _y: number, _w: number, _h: number): this {
    return this;
  }
  setStyle(s: Record<string, unknown>): this {
    this.style = { ...this.style, ...s };
    return this;
  }
  setWordWrapWidth(_w: number): this {
    return this;
  }
}

class ImageObject extends GameObject {
  texture: string;
  tint = 0xffffff;
  type = "Image";
  constructor(scene: MockScene, x: number, y: number, texture: string) {
    super(scene, x, y);
    this.texture = texture;
    this.width = 32;
    this.height = 32;
  }
  setDisplaySize(w: number, h: number): this {
    this.width = w;
    this.height = h;
    return this;
  }
  setTint(c: number): this {
    this.tint = c;
    return this;
  }
  setTexture(key: string): this {
    this.texture = key;
    return this;
  }
}

class NineSlice extends GameObject {
  texture: string;
  type = "NineSlice";
  constructor(
    scene: MockScene,
    x: number,
    y: number,
    texture: string,
    _frame?: string,
    width = 0,
    height = 0,
  ) {
    super(scene, x, y);
    this.texture = texture;
    this.width = width;
    this.height = height;
  }
}

class Graphics extends GameObject {
  type = "Graphics";
  constructor(scene: MockScene) {
    super(scene, 0, 0);
  }
  fillStyle(_c: number, _a?: number): this {
    return this;
  }
  fillRect(_x: number, _y: number, _w: number, _h: number): this {
    return this;
  }
  clear(): this {
    return this;
  }
  lineStyle(_w: number, _c: number, _a?: number): this {
    return this;
  }
  strokeRect(_x: number, _y: number, _w: number, _h: number): this {
    return this;
  }
  createGeometryMask(): { type: string } {
    return { type: "GeometryMask" };
  }
}

class Container extends GameObject {
  list: GameObject[] = [];
  type = "Container";
  constructor(scene: MockScene, x = 0, y = 0, children: GameObject[] = []) {
    super(scene, x, y);
    for (const c of children) this.add(c);
  }
  add(child: GameObject | GameObject[]): this {
    const arr = Array.isArray(child) ? child : [child];
    for (const c of arr) {
      if (c.parentContainer && c.parentContainer !== (this as Container)) {
        c.parentContainer.remove(c, false);
      }
      c.parentContainer = this;
      this.list.push(c);
    }
    return this;
  }
  addAt(child: GameObject, index: number): this {
    if (
      child.parentContainer &&
      child.parentContainer !== (this as Container)
    ) {
      child.parentContainer.remove(child, false);
    }
    child.parentContainer = this;
    this.list.splice(index, 0, child);
    return this;
  }
  remove(child: GameObject, destroyChild = false): this {
    const idx = this.list.indexOf(child);
    if (idx >= 0) {
      this.list.splice(idx, 1);
      if (child.parentContainer === (this as Container)) {
        child.parentContainer = null;
      }
      if (destroyChild) child.destroy();
    }
    return this;
  }
  removeAll(destroyChild = false): this {
    const items = [...this.list];
    this.list = [];
    for (const c of items) {
      if (c.parentContainer === (this as Container)) c.parentContainer = null;
      if (destroyChild) c.destroy();
    }
    return this;
  }
  sendToBack(child: GameObject): this {
    const idx = this.list.indexOf(child);
    if (idx > 0) {
      this.list.splice(idx, 1);
      this.list.unshift(child);
    }
    return this;
  }
  bringToTop(child: GameObject): this {
    const idx = this.list.indexOf(child);
    if (idx >= 0 && idx < this.list.length - 1) {
      this.list.splice(idx, 1);
      this.list.push(child);
    }
    return this;
  }
  getAll(): GameObject[] {
    return [...this.list];
  }
  getBounds(): { x: number; y: number; width: number; height: number } {
    if (this.list.length === 0) {
      return { x: this.x, y: this.y, width: 0, height: 0 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const c of this.list) {
      const cx = this.x + c.x;
      const cy = this.y + c.y;
      minX = Math.min(minX, cx);
      minY = Math.min(minY, cy);
      maxX = Math.max(maxX, cx + c.width);
      maxY = Math.max(maxY, cy + c.height);
    }
    return {
      x: minX,
      y: minY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
    };
  }
  destroy(fromScene?: boolean): void {
    if (this.destroyed) return;
    const children = [...this.list];
    super.destroy(fromScene);
    for (const c of children) c.destroy();
  }
}

class GameObjectFactory {
  scene: MockScene;
  constructor(scene: MockScene) {
    this.scene = scene;
  }
  text(
    x: number,
    y: number,
    text: string | string[],
    style: Record<string, unknown> = {},
  ): TextObject {
    return this.scene._track(new TextObject(this.scene, x, y, text, style));
  }
  rectangle(
    x: number,
    y: number,
    w: number,
    h: number,
    fillColor = 0,
    fillAlpha = 1,
  ): Rectangle {
    return this.scene._track(
      new Rectangle(this.scene, x, y, w, h, fillColor, fillAlpha),
    );
  }
  line(
    x: number,
    y: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    strokeColor = 0,
    strokeAlpha = 1,
  ): Line {
    return this.scene._track(
      new Line(this.scene, x, y, x1, y1, x2, y2, strokeColor, strokeAlpha),
    );
  }
  image(x: number, y: number, key: string): ImageObject {
    return this.scene._track(new ImageObject(this.scene, x, y, key));
  }
  container(x = 0, y = 0, children: GameObject[] = []): Container {
    return this.scene._track(new Container(this.scene, x, y, children));
  }
  graphics(_cfg?: unknown): Graphics {
    return this.scene._track(new Graphics(this.scene));
  }
  nineslice(
    x: number,
    y: number,
    key: string,
    frame?: string,
    width = 0,
    height = 0,
    _l?: number,
    _r?: number,
    _t?: number,
    _b?: number,
  ): NineSlice {
    return this.scene._track(
      new NineSlice(this.scene, x, y, key, frame, width, height),
    );
  }
  existing<T extends GameObject>(go: T): T {
    return go;
  }
}

class GameObjectMaker {
  scene: MockScene;
  constructor(scene: MockScene) {
    this.scene = scene;
  }
  graphics(_cfg?: unknown): Graphics {
    return new Graphics(this.scene);
  }
}

class TextureManager {
  private keys = new Set<string>();
  exists(key: string): boolean {
    return this.keys.has(key);
  }
  add(key: string): void {
    this.keys.add(key);
  }
}

class TimerEvent {
  destroyed = false;
  destroy(): void {
    this.destroyed = true;
  }
  remove(): void {
    this.destroyed = true;
  }
}

class TimeManager {
  scene: MockScene;
  constructor(scene: MockScene) {
    this.scene = scene;
  }
  delayedCall(_ms: number, _cb: () => void): TimerEvent {
    return new TimerEvent();
  }
}

class TweenStub {
  isPlaying = true;
  stop(): this {
    this.isPlaying = false;
    return this;
  }
}

class TweenManager {
  scene: MockScene;
  constructor(scene: MockScene) {
    this.scene = scene;
  }
  add(_config: Record<string, unknown>): TweenStub {
    return new TweenStub();
  }
}

class KeyboardManager extends EventEmitter {}

class InputManager {
  keyboard: KeyboardManager = new KeyboardManager();
}

class ScaleManager extends EventEmitter {
  width = 1280;
  height = 720;
}

class CanvasMock {
  width = 1280;
  height = 720;
  private listeners: Record<string, Array<(e: unknown) => void>> = {};
  addEventListener(event: string, cb: (e: unknown) => void): void {
    (this.listeners[event] ??= []).push(cb);
  }
  removeEventListener(event: string, cb: (e: unknown) => void): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((l) => l !== cb);
  }
  dispatchEvent(event: string, payload: unknown): void {
    for (const cb of this.listeners[event] ?? []) cb(payload);
  }
  getBoundingClientRect(): {
    left: number;
    top: number;
    width: number;
    height: number;
  } {
    return { left: 0, top: 0, width: this.width, height: this.height };
  }
}

class GameMock {
  canvas = new CanvasMock();
}

class ChildrenManager {
  scene: MockScene;
  constructor(scene: MockScene) {
    this.scene = scene;
  }
  remove(go: GameObject): void {
    this.scene._tracked = this.scene._tracked.filter((g) => g !== go);
  }
}

export class MockScene extends EventEmitter {
  add: GameObjectFactory;
  make: GameObjectMaker;
  textures: TextureManager;
  events: EventEmitter;
  scale: ScaleManager;
  game: GameMock;
  input: InputManager;
  time: TimeManager;
  tweens: TweenManager;
  children: ChildrenManager;
  cameras: { main: { width: number; height: number } };
  _tracked: GameObject[] = [];

  constructor() {
    super();
    this.add = new GameObjectFactory(this);
    this.make = new GameObjectMaker(this);
    this.textures = new TextureManager();
    this.events = new EventEmitter();
    this.scale = new ScaleManager();
    this.game = new GameMock();
    this.input = new InputManager();
    this.time = new TimeManager(this);
    this.tweens = new TweenManager(this);
    this.children = new ChildrenManager(this);
    this.cameras = { main: { width: 1280, height: 720 } };
  }

  _track<T extends GameObject>(go: T): T {
    this._tracked.push(go);
    return go;
  }
}

export function createMockScene(): MockScene {
  return new MockScene();
}

// Geometry helpers
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
  static Contains(rect: GeomRectangle, x: number, y: number): boolean {
    return (
      x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height
    );
  }
}

const Geom = { Rectangle: GeomRectangle };

const Math_ = {
  Clamp(value: number, min: number, max: number): number {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  },
};

const GameObjectsEvents = {
  DESTROY: "destroy",
} as const;

// The exported namespace mirrors `import * as Phaser from "phaser"`.
export const GameObjects = {
  Container,
  Rectangle,
  Line,
  Text: TextObject,
  Image: ImageObject,
  Graphics,
  NineSlice,
  GameObject,
  Events: GameObjectsEvents,
};

export const Tweens = {
  Tween: TweenStub,
};

export const Input = {
  Pointer: class Pointer {
    x = 0;
    y = 0;
  },
  Keyboard: { Key: class Key {} },
};

export const Cameras = {
  Scene2D: { Camera: class Camera {} },
};

export const Display = {
  Masks: {
    GeometryMask: class GeometryMask {},
  },
};

export { Geom, Math_ as Math };

export class Scene extends EventEmitter {}

import * as Phaser from "phaser";

/**
 * Minimal Phaser.Scene-shaped factory for tests that don't need a real game
 * instance. Use this for pure logic / config-shape tests; for anything that
 * actually constructs Phaser GameObjects, prefer `mountComponent`.
 *
 * Every method is a plausible no-op or returns a chainable stub. The `events`
 * EventEmitter is real so subscribers can verify wiring.
 */

export interface MockScene {
  add: Record<string, (...args: unknown[]) => unknown>;
  make: Record<string, (...args: unknown[]) => unknown>;
  scale: { width: number; height: number; on: () => void; off: () => void };
  events: Phaser.Events.EventEmitter;
  tweens: {
    add: (config: unknown) => unknown;
    killTweensOf: (target: unknown) => void;
  };
  time: {
    delayedCall: (delay: number, callback: () => void) => unknown;
    addEvent: (config: unknown) => unknown;
  };
  cameras: {
    main: { width: number; height: number; centerX: number; centerY: number };
  };
  textures: {
    exists: (key: string) => boolean;
    get: (key: string) => unknown;
    addCanvas: (key: string, canvas: unknown) => unknown;
    list: Record<string, unknown>;
  };
  input: {
    on: () => void;
    off: () => void;
    keyboard: { on: () => void; off: () => void } | null;
  };
  sys: { events: Phaser.Events.EventEmitter };
  load: { on: () => void; off: () => void; image: () => void };
}

function chainable(): unknown {
  // Returns a Proxy where every property access returns the same chainable
  // stub — covers the fluent setX().setY().setZ() calls Phaser code uses.
  const target: Record<string | symbol, unknown> = {};
  const proxy: unknown = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      const fn = (..._args: unknown[]): unknown => proxy;
      t[prop] = fn;
      return fn;
    },
  });
  return proxy;
}

/** Build a fresh mock scene. Each call returns an isolated instance. */
export function mockScene(overrides: Partial<MockScene> = {}): MockScene {
  const events = new Phaser.Events.EventEmitter();
  const sysEvents = new Phaser.Events.EventEmitter();
  const stubFactory = () => chainable();

  const base: MockScene = {
    add: new Proxy(
      {},
      {
        get: () => stubFactory,
      },
    ) as Record<string, (...args: unknown[]) => unknown>,
    make: new Proxy(
      {},
      {
        get: () => stubFactory,
      },
    ) as Record<string, (...args: unknown[]) => unknown>,
    scale: {
      width: 1280,
      height: 720,
      on: () => undefined,
      off: () => undefined,
    },
    events,
    tweens: {
      add: () => chainable(),
      killTweensOf: () => undefined,
    },
    time: {
      delayedCall: () => chainable(),
      addEvent: () => chainable(),
    },
    cameras: {
      main: { width: 1280, height: 720, centerX: 640, centerY: 360 },
    },
    textures: {
      exists: () => false,
      get: () => chainable(),
      addCanvas: () => chainable(),
      list: {},
    },
    input: {
      on: () => undefined,
      off: () => undefined,
      keyboard: { on: () => undefined, off: () => undefined },
    },
    sys: { events: sysEvents },
    load: {
      on: () => undefined,
      off: () => undefined,
      image: () => undefined,
    },
  };
  return { ...base, ...overrides };
}

import { getLayout, updateLayout } from "../Layout.ts";
import type { LayoutMetrics } from "../Layout.ts";
import type { Resizable } from "./types.ts";

// Phaser scene-event identifiers, declared as literals so this module can be
// imported in a node test environment without pulling in Phaser (which needs
// `window`). They mirror Phaser.Scenes.Events.SHUTDOWN / DESTROY.
const SCENE_SHUTDOWN = "shutdown";
const SCENE_DESTROY = "destroy";

// Minimal Phaser scene shape that ResizeHost actually relies on. Avoids a
// hard import of Phaser at module load.
interface ResizeHostScene {
  scale: {
    width: number;
    height: number;
    gameSize: { width: number; height: number };
    on(
      event: "resize",
      fn: (size: { width: number; height: number }) => void,
    ): unknown;
    off(
      event: "resize",
      fn: (size: { width: number; height: number }) => void,
    ): unknown;
  };
  events: {
    once(event: string, fn: () => void): unknown;
  };
}

const HOST_KEY = "__spacebiz_resize_host__";

type ResizeCallback = (metrics: LayoutMetrics) => void;

interface ResizeHostState {
  resizables: Set<Resizable>;
  callbacks: Set<ResizeCallback>;
  handler: (gameSize: { width: number; height: number }) => void;
  shutdown: () => void;
}

type SceneWithHost = ResizeHostScene & { [HOST_KEY]?: ResizeHostState };

export class ResizeHost {
  private constructor() {}

  /** Get or create the per-scene ResizeHost state. */
  static attach(scene: ResizeHostScene): ResizeHostState {
    const sc = scene as SceneWithHost;
    const existing = sc[HOST_KEY];
    if (existing) return existing;

    const state: ResizeHostState = {
      resizables: new Set(),
      callbacks: new Set(),
      handler: (gameSize) => {
        updateLayout(gameSize.width, gameSize.height);
        const metrics = getLayout();
        for (const r of state.resizables) {
          try {
            r.onLayout(metrics);
          } catch (err) {
            console.error("[ResizeHost] resizable.onLayout threw:", err);
          }
        }
        for (const cb of state.callbacks) {
          try {
            cb(metrics);
          } catch (err) {
            console.error("[ResizeHost] callback threw:", err);
          }
        }
      },
      shutdown: () => {
        scene.scale.off("resize", state.handler);
        state.resizables.clear();
        state.callbacks.clear();
        delete sc[HOST_KEY];
      },
    };

    scene.scale.on("resize", state.handler);
    scene.events.once(SCENE_SHUTDOWN, state.shutdown);
    scene.events.once(SCENE_DESTROY, state.shutdown);

    sc[HOST_KEY] = state;
    return state;
  }

  /** Register a Resizable to receive `onLayout` on every resize. */
  static register(scene: ResizeHostScene, resizable: Resizable): () => void {
    const state = ResizeHost.attach(scene);
    state.resizables.add(resizable);
    return () => state.resizables.delete(resizable);
  }

  /** Subscribe an ad-hoc callback (auto-removed on scene shutdown). */
  static subscribe(
    scene: ResizeHostScene,
    callback: ResizeCallback,
  ): () => void {
    const state = ResizeHost.attach(scene);
    state.callbacks.add(callback);
    return () => state.callbacks.delete(callback);
  }

  /** Trigger a resize broadcast immediately using current scale. */
  static broadcast(scene: ResizeHostScene): void {
    const state = ResizeHost.attach(scene);
    state.handler(scene.scale.gameSize);
  }
}

/** Hook-style helper: subscribe to layout metrics with auto-cleanup. */
export function useResize(
  scene: ResizeHostScene,
  callback: (metrics: LayoutMetrics) => void,
): () => void {
  return ResizeHost.subscribe(scene, callback);
}

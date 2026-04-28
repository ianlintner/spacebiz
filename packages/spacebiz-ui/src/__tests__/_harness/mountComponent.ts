import * as Phaser from "phaser";

/**
 * Boots a real headless Phaser game on the current jsdom DOM and mounts a
 * component into a transient scene. Returns the live scene + the constructed
 * component plus a `destroy()` cleanup that tears the game down.
 *
 * Use for component-level tests that need to assert on actual Phaser
 * GameObjects (Container children, Text content, depth, etc). For pure config
 * shape tests, prefer `mockScene` — booting Phaser per test costs ~30ms.
 */

export interface MountedComponent<T> {
  scene: Phaser.Scene;
  component: T;
  game: Phaser.Game;
  destroy: () => void;
}

/**
 * Mount a component built by `factory(scene)` and resolve once `create()` has
 * run. The factory is called during the scene's `create` lifecycle so all
 * standard Phaser construction patterns work.
 */
export function mountComponent<T>(
  factory: (scene: Phaser.Scene) => T,
): Promise<MountedComponent<T>> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    let component: T | undefined;
    let createdScene: Phaser.Scene | undefined;

    class HarnessScene extends Phaser.Scene {
      constructor() {
        super("__harness__");
      }
      create(): void {
        try {
          createdScene = this;
          component = factory(this);
        } catch (err) {
          reject(err);
        }
      }
    }

    let game: Phaser.Game;
    try {
      game = new Phaser.Game({
        type: Phaser.HEADLESS,
        width: 800,
        height: 600,
        banner: false,
        customEnvironment: true,
        scene: HarnessScene,
        audio: { noAudio: true },
        // jsdom's requestAnimationFrame doesn't fire reliably under Vitest, so
        // force the setTimeout-driven game loop. Without this, scene init/create
        // never runs and the harness times out.
        fps: { forceSetTimeOut: true, target: 60 },
      });
    } catch (err) {
      reject(err);
      return;
    }
    void game;

    // Phaser fires READY after the boot sequence; by then `create` has run on
    // the start scene. We resolve on the first post-create tick to ensure the
    // component finished construction.
    const finalize = (): void => {
      if (resolved) return;
      if (!component || !createdScene) return;
      resolved = true;
      resolve({
        scene: createdScene,
        component,
        game,
        destroy: () => game.destroy(true, false),
      });
    };

    game.events.once(Phaser.Core.Events.READY, () => {
      // One more event-loop tick so any synchronous create() side effects
      // settle before the test inspects them.
      queueMicrotask(finalize);
    });

    // Safety net: if READY never fires (e.g. headless boot path differs
    // between Phaser versions), poll a few times then bail.
    let pollCount = 0;
    const poll = (): void => {
      if (resolved) return;
      if (component && createdScene) {
        finalize();
        return;
      }
      if (++pollCount > 50) {
        reject(new Error("mountComponent: scene create() never ran"));
        return;
      }
      setTimeout(poll, 10);
    };
    setTimeout(poll, 10);
  });
}

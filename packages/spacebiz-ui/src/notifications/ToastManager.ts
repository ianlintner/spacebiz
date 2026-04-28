import type * as Phaser from "phaser";
import { Toast } from "./Toast.ts";
import type { ToastConfig } from "./Toast.ts";
import { DEPTH_MODAL } from "../DepthLayers.ts";

const STACK_GAP = 8;
const TOP_INSET = 16;
const RIGHT_INSET = 16;

interface SceneRegistry {
  toasts: Toast[];
  shutdownBound: boolean;
}

const registries = new WeakMap<Phaser.Scene, SceneRegistry>();

function getRegistry(scene: Phaser.Scene): SceneRegistry {
  let reg = registries.get(scene);
  if (!reg) {
    reg = { toasts: [], shutdownBound: false };
    registries.set(scene, reg);
  }
  if (!reg.shutdownBound) {
    const cleanup = (): void => {
      const r = registries.get(scene);
      if (!r) return;
      for (const t of r.toasts) {
        t.destroy();
      }
      r.toasts = [];
      registries.delete(scene);
    };
    scene.events.once("shutdown", cleanup);
    scene.events.once("destroy", cleanup);
    reg.shutdownBound = true;
  }
  return reg;
}

function reflow(scene: Phaser.Scene, animate: boolean): void {
  const reg = registries.get(scene);
  if (!reg) return;
  const cam = scene.cameras.main;
  const rightX = cam.width - RIGHT_INSET;
  let y = TOP_INSET;
  for (const toast of reg.toasts) {
    toast.slideTo(rightX, y, animate);
    y += toast.toastHeight + STACK_GAP;
  }
}

/**
 * Singleton-per-scene queue of stacked toasts. New toasts appear at the top
 * of the stack (top-right corner). When a toast dismisses, the remaining
 * toasts re-flow upward.
 */
export const ToastManager = {
  /** Show a toast in the given scene. Returns the created Toast instance. */
  show(scene: Phaser.Scene, config: ToastConfig): Toast {
    const reg = getRegistry(scene);

    const toast = new Toast(scene, {
      ...config,
      onDismiss: () => {
        const r = registries.get(scene);
        if (r) {
          r.toasts = r.toasts.filter((t) => t !== toast);
          reflow(scene, true);
        }
        config.onDismiss?.();
      },
    });
    toast.setDepth(DEPTH_MODAL);
    // Start off-screen to the right so the first reflow animates a slide-in.
    toast.setPosition(scene.cameras.main.width, TOP_INSET);

    reg.toasts.push(toast);
    reflow(scene, true);
    return toast;
  },

  /** Dismiss every active toast in the scene. */
  dismissAll(scene: Phaser.Scene): void {
    const reg = registries.get(scene);
    if (!reg) return;
    // Snapshot — `dismiss` mutates the array via the onDismiss callback.
    const snapshot = [...reg.toasts];
    for (const t of snapshot) {
      t.dismiss();
    }
  },

  /** Snapshot of currently-active toasts in the scene (test/debug helper). */
  active(scene: Phaser.Scene): readonly Toast[] {
    return registries.get(scene)?.toasts ?? [];
  },
};

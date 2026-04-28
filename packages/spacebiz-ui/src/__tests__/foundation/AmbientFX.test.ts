import { describe, it, expect, vi } from "vitest";
import type * as Phaser from "phaser";

// Phaser's runtime touches `window` on import. Stub it; these tests only need
// the type imports — the implementation reaches into scene.* off the argument.
vi.mock("phaser", () => ({}));

import {
  addPulseTween,
  addTwinkleTween,
  addFloatTween,
  addRotateTween,
  flashScreen,
  registerAmbientCleanup,
} from "../../AmbientFX.ts";

interface CapturedTween {
  config: Record<string, unknown>;
  isPlayingValue: boolean;
  stop: ReturnType<typeof vi.fn>;
  isPlaying: () => boolean;
}

interface MockScene {
  scene: Phaser.Scene;
  tweenCalls: CapturedTween[];
  shutdownHandlers: Array<() => void>;
  cameraWidth: number;
  cameraHeight: number;
  cameraZoom: number;
  rectangles: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    color: number;
    alpha: number;
    destroy: ReturnType<typeof vi.fn>;
  }>;
}

function makeMockScene(): MockScene {
  const tweenCalls: CapturedTween[] = [];
  const shutdownHandlers: Array<() => void> = [];
  const rectangles: MockScene["rectangles"] = [];

  const scene = {
    tweens: {
      add: (config: Record<string, unknown>) => {
        const captured: CapturedTween = {
          config,
          isPlayingValue: true,
          stop: vi.fn(),
          isPlaying: () => captured.isPlayingValue,
        };
        tweenCalls.push(captured);
        return captured as unknown as Phaser.Tweens.Tween;
      },
    },
    events: {
      once: (event: string, handler: () => void) => {
        if (event === "shutdown") {
          shutdownHandlers.push(handler);
        }
      },
    },
    cameras: {
      main: { width: 800, height: 600, zoom: 1 },
    },
    add: {
      rectangle: (
        x: number,
        y: number,
        w: number,
        h: number,
        color: number,
        alpha: number,
      ) => {
        const rect: {
          x: number;
          y: number;
          w: number;
          h: number;
          color: number;
          alpha: number;
          destroy: ReturnType<typeof vi.fn>;
          setOrigin: () => typeof rect;
          setDepth: () => typeof rect;
          setScrollFactor: () => typeof rect;
        } = {
          x,
          y,
          w,
          h,
          color,
          alpha,
          destroy: vi.fn(),
          setOrigin: () => rect,
          setDepth: () => rect,
          setScrollFactor: () => rect,
        };
        rectangles.push(rect);
        return rect;
      },
    },
  } as unknown as Phaser.Scene;

  return {
    scene,
    tweenCalls,
    shutdownHandlers,
    cameraWidth: 800,
    cameraHeight: 600,
    cameraZoom: 1,
    rectangles,
  };
}

describe("AmbientFX", () => {
  describe("addPulseTween", () => {
    it("creates an infinite yoyo tween between minAlpha and maxAlpha", () => {
      const m = makeMockScene();
      const target = {} as unknown as Phaser.GameObjects.GameObject;

      addPulseTween(m.scene, target, {
        minAlpha: 0.2,
        maxAlpha: 0.8,
        duration: 1000,
      });

      expect(m.tweenCalls).toHaveLength(1);
      const cfg = m.tweenCalls[0].config;
      expect(cfg.targets).toBe(target);
      expect(cfg.alpha).toEqual({ from: 0.2, to: 0.8 });
      expect(cfg.duration).toBe(1000);
      expect(cfg.yoyo).toBe(true);
      expect(cfg.repeat).toBe(-1);
      expect(cfg.ease).toBe("Sine.easeInOut");
      expect(cfg.delay).toBe(0);
    });

    it("respects custom ease and delay", () => {
      const m = makeMockScene();
      addPulseTween(m.scene, {} as Phaser.GameObjects.GameObject, {
        minAlpha: 0,
        maxAlpha: 1,
        duration: 500,
        ease: "Linear",
        delay: 250,
      });

      const cfg = m.tweenCalls[0].config;
      expect(cfg.ease).toBe("Linear");
      expect(cfg.delay).toBe(250);
    });
  });

  describe("addTwinkleTween", () => {
    it("creates a yoyo tween with a duration in [min, max]", () => {
      const m = makeMockScene();
      addTwinkleTween(m.scene, {} as Phaser.GameObjects.GameObject, {
        minAlpha: 0.1,
        maxAlpha: 0.9,
        minDuration: 1000,
        maxDuration: 2000,
      });

      const cfg = m.tweenCalls[0].config as {
        duration: number;
        delay: number;
        yoyo: boolean;
        repeat: number;
        alpha: { from: number; to: number };
      };
      expect(cfg.alpha).toEqual({ from: 0.1, to: 0.9 });
      expect(cfg.yoyo).toBe(true);
      expect(cfg.repeat).toBe(-1);
      expect(cfg.duration).toBeGreaterThanOrEqual(1000);
      expect(cfg.duration).toBeLessThanOrEqual(2000);
      expect(cfg.delay).toBeGreaterThanOrEqual(0);
      expect(cfg.delay).toBeLessThanOrEqual(cfg.duration);
    });

    it("uses the supplied delay verbatim when provided", () => {
      const m = makeMockScene();
      addTwinkleTween(m.scene, {} as Phaser.GameObjects.GameObject, {
        minAlpha: 0,
        maxAlpha: 1,
        minDuration: 100,
        maxDuration: 100,
        delay: 42,
      });
      expect(m.tweenCalls[0].config.delay).toBe(42);
    });
  });

  describe("addFloatTween", () => {
    it("animates relative x/y offsets and yoyos forever", () => {
      const m = makeMockScene();
      addFloatTween(m.scene, {} as Phaser.GameObjects.GameObject, {
        dx: 5,
        dy: -3,
        duration: 1200,
      });

      const cfg = m.tweenCalls[0].config;
      expect(cfg.x).toBe("+=5");
      expect(cfg.y).toBe("+=-3");
      expect(cfg.duration).toBe(1200);
      expect(cfg.yoyo).toBe(true);
      expect(cfg.repeat).toBe(-1);
      expect(cfg.ease).toBe("Sine.easeInOut");
      expect(cfg.delay).toBe(0);
    });
  });

  describe("addRotateTween", () => {
    it("rotates a full clockwise revolution by default", () => {
      const m = makeMockScene();
      addRotateTween(m.scene, {} as Phaser.GameObjects.GameObject, 5000);

      const cfg = m.tweenCalls[0].config;
      expect(cfg.rotation).toBeCloseTo(Math.PI * 2);
      expect(cfg.duration).toBe(5000);
      expect(cfg.repeat).toBe(-1);
      expect(cfg.ease).toBe("Linear");
    });

    it("rotates counter-clockwise when clockwise=false", () => {
      const m = makeMockScene();
      addRotateTween(m.scene, {} as Phaser.GameObjects.GameObject, 2000, false);
      expect(m.tweenCalls[0].config.rotation).toBeCloseTo(-Math.PI * 2);
    });
  });

  describe("registerAmbientCleanup", () => {
    it("registers a single shutdown listener", () => {
      const m = makeMockScene();
      registerAmbientCleanup(m.scene, []);
      expect(m.shutdownHandlers).toHaveLength(1);
    });

    it("stops every still-playing tween on scene shutdown", () => {
      const m = makeMockScene();
      const t1 = m.scene.tweens.add({} as never) as unknown as CapturedTween;
      const t2 = m.scene.tweens.add({} as never) as unknown as CapturedTween;
      registerAmbientCleanup(m.scene, [
        t1 as unknown as Phaser.Tweens.Tween,
        t2 as unknown as Phaser.Tweens.Tween,
      ]);

      m.shutdownHandlers[0]();

      expect(t1.stop).toHaveBeenCalledTimes(1);
      expect(t2.stop).toHaveBeenCalledTimes(1);
    });

    it("skips tweens that are no longer playing", () => {
      const m = makeMockScene();
      const live = m.scene.tweens.add({} as never) as unknown as CapturedTween;
      const dead = m.scene.tweens.add({} as never) as unknown as CapturedTween;
      dead.isPlayingValue = false;

      registerAmbientCleanup(m.scene, [
        live as unknown as Phaser.Tweens.Tween,
        dead as unknown as Phaser.Tweens.Tween,
      ]);
      m.shutdownHandlers[0]();

      expect(live.stop).toHaveBeenCalledTimes(1);
      expect(dead.stop).not.toHaveBeenCalled();
    });
  });

  describe("flashScreen", () => {
    it("creates a fullscreen overlay rectangle and a fade tween", () => {
      const m = makeMockScene();
      flashScreen(m.scene, 0x00ff88);

      expect(m.rectangles).toHaveLength(1);
      const rect = m.rectangles[0];
      expect(rect.w).toBe(m.cameraWidth);
      expect(rect.h).toBe(m.cameraHeight);
      expect(rect.color).toBe(0x00ff88);
      expect(rect.alpha).toBe(0);

      expect(m.tweenCalls).toHaveLength(1);
      const cfg = m.tweenCalls[0].config as {
        alpha: number;
        duration: number;
        yoyo: boolean;
        onComplete: () => void;
      };
      expect(cfg.alpha).toBe(0.35);
      // Default 600ms × 0.25 (rise + yoyo fall = full cycle).
      expect(cfg.duration).toBe(150);
      expect(cfg.yoyo).toBe(true);
      cfg.onComplete();
      expect(rect.destroy).toHaveBeenCalledTimes(1);
    });

    it("scales the overlay by inverse camera zoom", () => {
      const m = makeMockScene();
      (m.scene.cameras.main as unknown as { zoom: number }).zoom = 2;
      flashScreen(m.scene, 0xff0000);

      const rect = m.rectangles[0];
      expect(rect.w).toBe(m.cameraWidth / 2);
      expect(rect.h).toBe(m.cameraHeight / 2);
    });

    it("respects custom peakAlpha and duration", () => {
      const m = makeMockScene();
      flashScreen(m.scene, 0xffffff, 0.7, 1200);
      const cfg = m.tweenCalls[0].config as {
        alpha: number;
        duration: number;
      };
      expect(cfg.alpha).toBe(0.7);
      expect(cfg.duration).toBe(300);
    });
  });
});

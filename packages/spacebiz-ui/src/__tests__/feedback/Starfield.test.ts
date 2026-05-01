import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("phaser", async () => {
  const m = await import("./_phaserMock.ts");
  return m.phaserMockFactory();
});

import {
  createMockScene,
  type MockScene,
  type MockContainer,
  type MockImage,
} from "./_phaserMock.ts";
import { createStarfield } from "../../Starfield.ts";

function getLayerContainers(scene: MockScene): MockContainer[] {
  return scene.children.list.filter(
    (c) => (c as MockContainer).type === "Container",
  ) as MockContainer[];
}

function totalStars(scene: MockScene): number {
  let count = 0;
  for (const c of getLayerContainers(scene)) {
    for (const child of c.list) {
      if ((child as MockImage).type === "Image") count++;
    }
  }
  return count;
}

describe("Starfield", () => {
  let scene: MockScene;

  beforeEach(() => {
    scene = createMockScene(800, 600);
    // Pre-register the haze texture so haze sprites are produced.
    scene.textures.add("glow-dot");
  });

  it("returns a handle exposing setSize + destroy", () => {
    const handle = createStarfield(scene as never);
    expect(handle).toBeDefined();
    expect(typeof handle.setSize).toBe("function");
    expect(typeof handle.destroy).toBe("function");
  });

  it("setSize tears down old containers and rebuilds with the new bounds", () => {
    const handle = createStarfield(scene as never, {
      drift: false,
      twinkle: false,
      shimmer: false,
      haze: false,
      layers: [
        {
          count: 3,
          scrollFactor: 0.1,
          minAlpha: 0.2,
          maxAlpha: 0.5,
          minScale: 0.5,
          maxScale: 1.0,
          tints: [0xffffff],
        },
      ],
    });
    expect(getLayerContainers(scene).length).toBe(1);
    const initialContainers = getLayerContainers(scene);
    handle.setSize(1600, 900);
    // Old containers were destroyed and removed from the scene; a new one was
    // added in their place.
    for (const c of initialContainers) {
      expect(c.destroyed).toBe(true);
    }
    expect(getLayerContainers(scene).length).toBe(1);
    expect(totalStars(scene)).toBe(3);
  });

  it("destroy tears down all containers and stops perpetual tweens", () => {
    const handle = createStarfield(scene as never, {
      drift: true,
      twinkle: false,
      shimmer: false,
      haze: false,
      layers: [
        {
          count: 2,
          scrollFactor: 0.1,
          minAlpha: 0.2,
          maxAlpha: 0.5,
          minScale: 0.5,
          maxScale: 1.0,
          tints: [0xffffff],
        },
      ],
    });
    const initial = getLayerContainers(scene);
    const initialTweens = scene.tweens._all.slice();
    expect(initial.length).toBe(1);
    expect(initialTweens.length).toBeGreaterThan(0);
    handle.destroy();
    for (const c of initial) {
      expect(c.destroyed).toBe(true);
    }
    for (const t of initialTweens) {
      expect(t.stopped).toBe(true);
    }
  });

  it("creates one container per default layer", () => {
    createStarfield(scene as never, {
      drift: false,
      twinkle: false,
      shimmer: false,
      haze: false,
    });
    // Default config has 3 layers.
    expect(getLayerContainers(scene).length).toBe(3);
  });

  it("respects a custom layers config and produces the expected star count", () => {
    createStarfield(scene as never, {
      drift: false,
      twinkle: false,
      shimmer: false,
      haze: false,
      layers: [
        {
          count: 5,
          scrollFactor: 0.1,
          minAlpha: 0.2,
          maxAlpha: 0.5,
          minScale: 0.5,
          maxScale: 1.0,
          tints: [0xffffff],
        },
        {
          count: 7,
          scrollFactor: 0.3,
          minAlpha: 0.2,
          maxAlpha: 0.5,
          minScale: 0.5,
          maxScale: 1.0,
          tints: [0xffffff],
        },
      ],
    });
    expect(getLayerContainers(scene).length).toBe(2);
    expect(totalStars(scene)).toBe(5 + 7);
  });

  it("registers cleanup on scene shutdown when ambient tweens are created", () => {
    createStarfield(scene as never, {
      // Force at least one perpetual tween via drift.
      drift: true,
      twinkle: false,
      shimmer: false,
      haze: false,
      layers: [
        {
          count: 3,
          scrollFactor: 0.1,
          minAlpha: 0.2,
          maxAlpha: 0.5,
          minScale: 0.5,
          maxScale: 1.0,
          tints: [0xffffff],
        },
      ],
    });
    expect(scene.tweens._all.length).toBeGreaterThan(0);
    const tweens = scene.tweens._all.slice();
    // Trigger shutdown — registered cleanup should stop all tweens.
    scene.events.emit("shutdown");
    for (const t of tweens) {
      expect(t.stopped).toBe(true);
    }
  });

  it("does not register cleanup or create tweens when all animation flags are off", () => {
    createStarfield(scene as never, {
      drift: false,
      twinkle: false,
      shimmer: false,
      haze: false,
      layers: [
        {
          count: 2,
          scrollFactor: 0.1,
          minAlpha: 0.2,
          maxAlpha: 0.5,
          minScale: 0.5,
          maxScale: 1.0,
          tints: [0xffffff],
        },
      ],
    });
    expect(scene.tweens._all.length).toBe(0);
    expect(scene.events.listenerCount("shutdown")).toBe(0);
  });

  it("uses the supplied worldBounds when provided", () => {
    createStarfield(scene as never, {
      drift: false,
      twinkle: false,
      shimmer: false,
      haze: false,
      worldBounds: { minX: -200, maxX: 200, minY: -100, maxY: 100 },
      layers: [
        {
          count: 4,
          scrollFactor: 0.1,
          minAlpha: 0.4,
          maxAlpha: 0.4,
          minScale: 0.5,
          maxScale: 0.5,
          tints: [0xffffff],
        },
      ],
    });
    expect(totalStars(scene)).toBe(4);
  });
});

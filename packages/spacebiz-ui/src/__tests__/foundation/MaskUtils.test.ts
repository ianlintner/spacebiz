import { describe, it, expect, vi } from "vitest";
import type * as Phaser from "phaser";

// Phaser's runtime touches `window` on import. Stub it; these tests only need
// the type imports — the implementation doesn't reference the namespace.
vi.mock("phaser", () => ({}));

import { applyClippingMask } from "../../MaskUtils.ts";

/** Build a fake target with the Phaser 4 `filters.internal.addMask` API. */
function makeFilterTarget(): {
  target: Phaser.GameObjects.GameObject;
  addMask: ReturnType<typeof vi.fn>;
  setMask: ReturnType<typeof vi.fn>;
} {
  const addMask = vi.fn();
  const setMask = vi.fn();
  const target = {
    filters: { internal: { addMask } },
    setMask,
  } as unknown as Phaser.GameObjects.GameObject;
  return { target, addMask, setMask };
}

/** Build a fake target with only the deprecated Phaser 3 `setMask` API. */
function makeLegacyTarget(): {
  target: Phaser.GameObjects.GameObject;
  setMask: ReturnType<typeof vi.fn>;
} {
  const setMask = vi.fn();
  const target = { setMask } as unknown as Phaser.GameObjects.GameObject;
  return { target, setMask };
}

function makeMaskShape(): Phaser.GameObjects.Graphics {
  return {
    createGeometryMask: vi.fn(() => ({ kind: "geometry-mask" })),
  } as unknown as Phaser.GameObjects.Graphics;
}

describe("MaskUtils.applyClippingMask", () => {
  it("invokes the Phaser 4 filter API when available", () => {
    const { target, addMask, setMask } = makeFilterTarget();
    const mask = makeMaskShape();

    applyClippingMask(target, mask);

    expect(addMask).toHaveBeenCalledTimes(1);
    expect(setMask).not.toHaveBeenCalled();
  });

  it("passes the mask shape, invert=false, and viewTransform='world'", () => {
    const { target, addMask } = makeFilterTarget();
    const mask = makeMaskShape();

    applyClippingMask(target, mask);

    expect(addMask).toHaveBeenCalledWith(mask, false, undefined, "world");
  });

  it("does not call createGeometryMask on the v4 path", () => {
    const { target } = makeFilterTarget();
    const mask = makeMaskShape();
    const createGeo = mask.createGeometryMask as unknown as ReturnType<
      typeof vi.fn
    >;

    applyClippingMask(target, mask);

    expect(createGeo).not.toHaveBeenCalled();
  });

  it("falls back to legacy setMask when filters API is missing", () => {
    const { target, setMask } = makeLegacyTarget();
    const mask = makeMaskShape();
    const createGeo = mask.createGeometryMask as unknown as ReturnType<
      typeof vi.fn
    >;

    applyClippingMask(target, mask);

    expect(createGeo).toHaveBeenCalledTimes(1);
    expect(setMask).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when neither API is present", () => {
    const target = {} as unknown as Phaser.GameObjects.GameObject;
    const mask = makeMaskShape();

    expect(() => applyClippingMask(target, mask)).not.toThrow();
  });
});

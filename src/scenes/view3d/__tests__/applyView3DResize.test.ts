import { describe, it, expect, vi } from "vitest";
import { applyView3DResize } from "../applyView3DResize.ts";

describe("applyView3DResize", () => {
  it("forwards width/height to renderer.setSize with updateStyle=false", () => {
    const renderer = { setSize: vi.fn() };
    const camera = { aspect: 1, updateProjectionMatrix: vi.fn() };

    applyView3DResize(renderer, camera, 1920, 1080);

    expect(renderer.setSize).toHaveBeenCalledTimes(1);
    // updateStyle must be false so Three.js does not overwrite the canvas's
    // CSS size — both view classes manage that themselves.
    expect(renderer.setSize).toHaveBeenCalledWith(1920, 1080, false);
  });

  it("updates camera.aspect to width / height and calls updateProjectionMatrix", () => {
    const renderer = { setSize: vi.fn() };
    const camera = { aspect: 1, updateProjectionMatrix: vi.fn() };

    applyView3DResize(renderer, camera, 1600, 900);

    expect(camera.aspect).toBeCloseTo(1600 / 900, 6);
    expect(camera.updateProjectionMatrix).toHaveBeenCalledTimes(1);
  });

  it("does not divide by zero when height is 0", () => {
    const renderer = { setSize: vi.fn() };
    const camera = { aspect: 2, updateProjectionMatrix: vi.fn() };

    applyView3DResize(renderer, camera, 800, 0);

    // Renderer still resized — caller may temporarily collapse the canvas.
    expect(renderer.setSize).toHaveBeenCalledWith(800, 0, false);
    // Aspect must be left untouched so it can never become NaN/Infinity.
    expect(camera.aspect).toBe(2);
    expect(camera.updateProjectionMatrix).not.toHaveBeenCalled();
  });
});

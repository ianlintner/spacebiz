import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("phaser", async () => {
  const m = await import("./_phaserMock.ts");
  return m.phaserMockFactory();
});

import {
  createMockScene,
  type MockScene,
  type MockRectangle,
} from "./_phaserMock.ts";
import { SceneUiDirector } from "../../SceneUiDirector.ts";
import { DEPTH_MODAL } from "../../DepthLayers.ts";

// The mock objects don't satisfy the full Phaser.GameObjects.GameObject type at
// compile time (TS sees the real Phaser types via SceneUiDirector's signature).
// At runtime they're indistinguishable for the slice the director touches, so a
// type assertion is sound here.
function asGo<T>(o: T): never {
  return o as unknown as never;
}

describe("SceneUiDirector", () => {
  let scene: MockScene;

  beforeEach(() => {
    scene = createMockScene(800, 600);
  });

  it("opens an anonymous layer and adds it to the scene shutdown chain", () => {
    const dir = new SceneUiDirector(scene as never);
    expect(scene.events.listenerCount("shutdown")).toBe(1);
    const layer = dir.openLayer();
    expect(layer.key).toBeUndefined();
  });

  it("opens a keyed layer and re-uses the slot when re-opened", () => {
    const dir = new SceneUiDirector(scene as never);
    const a = dir.openLayer({ key: "menu" });
    const b = dir.openLayer({ key: "menu" });
    expect(a).not.toBe(b);
    // Re-opening with the same key destroys the previous instance.
    expect((a as unknown as { isDestroyed: boolean }).isDestroyed).toBe(true);
    expect(b.key).toBe("menu");
  });

  it("track() adds the object to the scene display list and returns it", () => {
    const dir = new SceneUiDirector(scene as never);
    const layer = dir.openLayer();
    const rect = scene.add.rectangle(0, 0, 10, 10);
    // Strip from the display list so we can verify track re-adds it.
    scene.children.removeFromList(rect);
    expect(scene.children.exists(rect)).toBe(false);
    const result = layer.track(asGo<MockRectangle>(rect));
    expect(result).toBe(rect as unknown);
    expect(scene.children.exists(rect)).toBe(true);
  });

  it("trackMany() registers multiple objects in one call", () => {
    const dir = new SceneUiDirector(scene as never);
    const layer = dir.openLayer();
    const r1 = scene.add.rectangle(0, 0, 1, 1);
    const r2 = scene.add.rectangle(0, 0, 1, 1);
    const r3 = scene.add.rectangle(0, 0, 1, 1);
    const out = layer.trackMany(asGo(r1), asGo(r2), asGo(r3));
    expect(out).toEqual([r1, r2, r3]);
  });

  it("destroy() destroys all tracked objects and unregisters the layer", () => {
    const dir = new SceneUiDirector(scene as never);
    const layer = dir.openLayer({ key: "panel" });
    const r1 = scene.add.rectangle(0, 0, 1, 1);
    const r2 = scene.add.rectangle(0, 0, 1, 1);
    layer.track(asGo(r1));
    layer.track(asGo(r2));
    layer.destroy();
    expect(r1.destroyed).toBe(true);
    expect(r2.destroyed).toBe(true);
    // Re-opening the same key should yield a fresh layer.
    const fresh = dir.openLayer({ key: "panel" });
    expect(fresh).not.toBe(layer);
  });

  it("destroy() invokes registered onDestroy callbacks once", () => {
    const dir = new SceneUiDirector(scene as never);
    const layer = dir.openLayer();
    const cb = vi.fn();
    layer.onDestroy(cb);
    layer.destroy();
    expect(cb).toHaveBeenCalledTimes(1);
    // Second destroy is a no-op.
    layer.destroy();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("createOverlay() places the overlay one layer below the modal depth", () => {
    const dir = new SceneUiDirector(scene as never);
    const layer = dir.openLayer();
    const overlay = layer.createOverlay();
    expect(overlay.depth).toBe(DEPTH_MODAL - 1);
    // It should sit on the camera's full surface.
    expect(overlay.width).toBe(800);
    expect(overlay.height).toBe(600);
  });

  it("createOverlay({ closeOnPointerUp: true }) tears down the layer when clicked", () => {
    const dir = new SceneUiDirector(scene as never);
    const layer = dir.openLayer();
    const r = scene.add.rectangle(0, 0, 1, 1);
    layer.track(asGo(r));
    const overlay = layer.createOverlay({ closeOnPointerUp: true });
    overlay.emit("pointerup");
    expect(r.destroyed).toBe(true);
  });

  it("createOverlay({ onPointerUp }) fires the callback without auto-closing", () => {
    const dir = new SceneUiDirector(scene as never);
    const layer = dir.openLayer();
    const cb = vi.fn();
    const overlay = layer.createOverlay({ onPointerUp: cb });
    overlay.emit("pointerup");
    expect(cb).toHaveBeenCalledTimes(1);
    expect((layer as unknown as { isDestroyed: boolean }).isDestroyed).toBe(
      false,
    );
  });

  it("createOverlay({ activationDelayMs }) defers wiring the pointer handler", () => {
    const dir = new SceneUiDirector(scene as never);
    const layer = dir.openLayer();
    const cb = vi.fn();
    const overlay = layer.createOverlay({
      onPointerUp: cb,
      activationDelayMs: 100,
    });
    // No listener attached yet — emit is a no-op.
    overlay.emit("pointerup");
    expect(cb).not.toHaveBeenCalled();
    // Fire the timer; handler is now wired.
    scene.time._all[0]!.fire();
    overlay.emit("pointerup");
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("closeAll() destroys both keyed and anonymous layers", () => {
    const dir = new SceneUiDirector(scene as never);
    const a = dir.openLayer({ key: "a" });
    const b = dir.openLayer();
    dir.closeAll();
    expect((a as unknown as { isDestroyed: boolean }).isDestroyed).toBe(true);
    expect((b as unknown as { isDestroyed: boolean }).isDestroyed).toBe(true);
  });

  it("scene shutdown destroys the director and all open layers", () => {
    const dir = new SceneUiDirector(scene as never);
    const a = dir.openLayer({ key: "a" });
    scene.events.emit("shutdown");
    expect((a as unknown as { isDestroyed: boolean }).isDestroyed).toBe(true);
    // Confirm the director also clears its internal maps by opening a new layer.
    const fresh = dir.openLayer({ key: "a" });
    expect(fresh).not.toBe(a);
  });
});

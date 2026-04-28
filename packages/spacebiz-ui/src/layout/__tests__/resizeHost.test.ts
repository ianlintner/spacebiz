import { describe, it, expect, vi } from "vitest";
import { ResizeHost, useResize } from "../ResizeHost.ts";

// Minimal Phaser.Scene-shaped stub. ResizeHost only touches scene.scale,
// scene.events, and the SHUTDOWN/DESTROY string events.
function makeMockScene(width = 1280, height = 720) {
  const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
  const scaleHandlers: Array<
    (size: { width: number; height: number }) => void
  > = [];

  const scene = {
    scale: {
      width,
      height,
      gameSize: { width, height },
      on(event: string, fn: (size: { width: number; height: number }) => void) {
        if (event === "resize") scaleHandlers.push(fn);
      },
      off(
        event: string,
        fn: (size: { width: number; height: number }) => void,
      ) {
        if (event !== "resize") return;
        const idx = scaleHandlers.indexOf(fn);
        if (idx >= 0) scaleHandlers.splice(idx, 1);
      },
      emit(width: number, height: number) {
        for (const fn of scaleHandlers.slice()) fn({ width, height });
      },
    },
    events: {
      once(event: string, fn: (...args: unknown[]) => void) {
        (handlers[event] ??= []).push(fn);
      },
      fire(event: string) {
        const list = handlers[event] ?? [];
        handlers[event] = [];
        for (const fn of list) fn();
      },
    },
  };

  return scene;
}

describe("ResizeHost", () => {
  it("attaches once per scene and reuses state", () => {
    const scene = makeMockScene();
    const a = ResizeHost.attach(scene as never);
    const b = ResizeHost.attach(scene as never);
    expect(a).toBe(b);
  });

  it("notifies registered Resizables on resize", () => {
    const scene = makeMockScene();
    const target = { onLayout: vi.fn() };
    ResizeHost.register(scene as never, target);
    scene.scale.emit(1600, 900);
    expect(target.onLayout).toHaveBeenCalledTimes(1);
    const metrics = target.onLayout.mock.calls[0][0];
    expect(metrics.gameWidth).toBe(1600);
    expect(metrics.gameHeight).toBe(900);
  });

  it("notifies ad-hoc subscribers and supports unsubscribe", () => {
    const scene = makeMockScene();
    const cb = vi.fn();
    const off = useResize(scene as never, cb);
    scene.scale.emit(1280, 720);
    expect(cb).toHaveBeenCalledTimes(1);
    off();
    scene.scale.emit(1280, 720);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("clears subscribers on scene shutdown", () => {
    const scene = makeMockScene();
    const cb = vi.fn();
    useResize(scene as never, cb);
    scene.events.fire("shutdown");
    scene.scale.emit(1280, 720);
    expect(cb).not.toHaveBeenCalled();
  });

  it("isolates subscriber errors", () => {
    const scene = makeMockScene();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    useResize(scene as never, () => {
      throw new Error("boom");
    });
    const ok = vi.fn();
    useResize(scene as never, ok);
    scene.scale.emit(1280, 720);
    expect(ok).toHaveBeenCalledTimes(1);
    errSpy.mockRestore();
  });

  it("broadcast() pushes current size to subscribers", () => {
    const scene = makeMockScene(1024, 768);
    const cb = vi.fn();
    useResize(scene as never, cb);
    ResizeHost.broadcast(scene as never);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0].gameWidth).toBe(1024);
  });
});

import { describe, it, expect, vi } from "vitest";
import { attachReflowHandler } from "../sceneReflow.ts";

function makeFakeScene(): {
  scale: {
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
  };
  events: {
    once: ReturnType<typeof vi.fn>;
  };
} {
  return {
    scale: { on: vi.fn(), off: vi.fn() },
    events: { once: vi.fn() },
  };
}

describe("attachReflowHandler", () => {
  it("registers a scale resize listener and a shutdown cleanup", () => {
    const scene = makeFakeScene();
    const handler = vi.fn();

    attachReflowHandler(scene as never, handler);

    expect(scene.scale.on).toHaveBeenCalledWith("resize", handler);
    expect(scene.events.once).toHaveBeenCalledWith(
      "shutdown",
      expect.any(Function),
    );

    const cleanup = scene.events.once.mock.calls[0][1] as () => void;
    cleanup();
    expect(scene.scale.off).toHaveBeenCalledWith("resize", handler);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerUiSoundHandler, playUiSfx } from "../../UiSound.ts";

describe("UiSound", () => {
  beforeEach(() => {
    // Reset the module-level handler between tests by registering a fresh stub.
    registerUiSoundHandler({ sfx: () => {} });
  });

  it("is a no-op before any handler is registered", async () => {
    // Re-import the module in isolation so the module-level handler is null.
    vi.resetModules();
    const fresh = await import("../../UiSound.ts");
    expect(() => fresh.playUiSfx("ui.click")).not.toThrow();
  });

  it("invokes the registered handler with the supplied key", () => {
    const sfx = vi.fn();
    registerUiSoundHandler({ sfx });

    playUiSfx("ui.click");

    expect(sfx).toHaveBeenCalledTimes(1);
    expect(sfx).toHaveBeenCalledWith("ui.click");
  });

  it("supports replacing the handler at runtime", () => {
    const first = vi.fn();
    const second = vi.fn();
    registerUiSoundHandler({ sfx: first });
    registerUiSoundHandler({ sfx: second });

    playUiSfx("ui.hover");

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("ui.hover");
  });

  it("forwards every call without dedup or buffering", () => {
    const sfx = vi.fn();
    registerUiSoundHandler({ sfx });

    playUiSfx("a");
    playUiSfx("b");
    playUiSfx("a");

    expect(sfx).toHaveBeenCalledTimes(3);
    expect(sfx.mock.calls.map((c) => c[0])).toEqual(["a", "b", "a"]);
  });

  it("does not throw when the handler itself errors are not swallowed", () => {
    // Sanity: handler errors propagate so callers see real bugs.
    registerUiSoundHandler({
      sfx: () => {
        throw new Error("boom");
      },
    });
    expect(() => playUiSfx("x")).toThrow("boom");
  });
});

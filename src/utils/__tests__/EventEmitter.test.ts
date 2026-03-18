import { describe, it, expect, vi } from "vitest";
import { GameEventEmitter } from "../EventEmitter";

describe("GameEventEmitter", () => {
  it("calls listener when event is emitted", () => {
    const emitter = new GameEventEmitter();
    const listener = vi.fn();
    emitter.on("test", listener);
    emitter.emit("test", { value: 42 });
    expect(listener).toHaveBeenCalledWith({ value: 42 });
  });

  it("supports multiple listeners", () => {
    const emitter = new GameEventEmitter();
    const l1 = vi.fn();
    const l2 = vi.fn();
    emitter.on("test", l1);
    emitter.on("test", l2);
    emitter.emit("test", {});
    expect(l1).toHaveBeenCalled();
    expect(l2).toHaveBeenCalled();
  });

  it("off() removes listener", () => {
    const emitter = new GameEventEmitter();
    const listener = vi.fn();
    emitter.on("test", listener);
    emitter.off("test", listener);
    emitter.emit("test", {});
    expect(listener).not.toHaveBeenCalled();
  });

  it("once() fires only once", () => {
    const emitter = new GameEventEmitter();
    const listener = vi.fn();
    emitter.once("test", listener);
    emitter.emit("test", {});
    emitter.emit("test", {});
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does nothing when emitting event with no listeners", () => {
    const emitter = new GameEventEmitter();
    expect(() => emitter.emit("nothing", {})).not.toThrow();
  });
});

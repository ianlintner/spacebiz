import { describe, it, expect, vi } from "vitest";
import { GameStore } from "../GameStore";

describe("GameStore", () => {
  it("initializes with default state", () => {
    const store = new GameStore();
    expect(store.getState().turn).toBe(1);
    expect(store.getState().phase).toBe("planning");
    expect(store.getState().cash).toBe(200000);
  });

  it("updates state and emits change event", () => {
    const store = new GameStore();
    const listener = vi.fn();
    store.on("stateChanged", listener);
    store.update({ cash: 150000 });
    expect(store.getState().cash).toBe(150000);
    expect(listener).toHaveBeenCalled();
  });

  it("serializes and deserializes state", () => {
    const store = new GameStore();
    store.update({ cash: 99999, turn: 5 });
    const json = store.serialize();
    const store2 = new GameStore();
    store2.deserialize(json);
    expect(store2.getState().cash).toBe(99999);
    expect(store2.getState().turn).toBe(5);
  });

  it("emits specific field change events", () => {
    const store = new GameStore();
    const listener = vi.fn();
    store.on("cashChanged", listener);
    store.update({ cash: 180000 });
    expect(listener).toHaveBeenCalledWith(180000);
  });
});

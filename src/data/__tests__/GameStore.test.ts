import { describe, it, expect, vi } from "vitest";
import { GameStore, gameStore } from "../GameStore";
import type { GameState } from "../types";

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
    expect(listener).toHaveBeenCalledTimes(1);
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

  it("emits stateChanged exactly once with changedKeys for multi-field update", () => {
    const store = new GameStore();
    const listener = vi.fn();
    store.on("stateChanged", listener);
    store.update({ cash: 180000, turn: 3 });
    expect(listener).toHaveBeenCalledTimes(1);
    const [state, changedKeys] = listener.mock.calls[0] as [
      GameState,
      Set<keyof GameState>,
    ];
    expect(state.cash).toBe(180000);
    expect(state.turn).toBe(3);
    expect(changedKeys.has("cash")).toBe(true);
    expect(changedKeys.has("turn")).toBe(true);
    expect(changedKeys.has("reputation")).toBe(false);
  });

  it("does not emit when update is a no-op", () => {
    const store = new GameStore();
    const listener = vi.fn();
    store.on("stateChanged", listener);
    const currentCash = store.getState().cash;
    store.update({ cash: currentCash });
    expect(listener).not.toHaveBeenCalled();
  });

  it("does not emit per-key Changed events (legacy behavior removed)", () => {
    const store = new GameStore();
    const cashListener = vi.fn();
    store.on("cashChanged", cashListener);
    store.update({ cash: 1 });
    expect(cashListener).not.toHaveBeenCalled();
  });

  it("freezes state in dev mode (top-level mutation throws)", () => {
    // Vitest sets import.meta.env.DEV = true by default.
    const store = new GameStore();
    const state = store.getState() as GameState;
    expect(() => {
      state.cash = 0;
    }).toThrow();
  });

  it("reset() emits stateChanged with all keys", () => {
    const store = new GameStore();
    store.update({ cash: 1, turn: 2 });
    const listener = vi.fn();
    store.on("stateChanged", listener);
    store.reset(42);
    expect(listener).toHaveBeenCalledTimes(1);
    const [state, changedKeys] = listener.mock.calls[0] as [
      GameState,
      Set<keyof GameState>,
    ];
    expect(state.seed).toBe(42);
    expect(changedKeys.size).toBeGreaterThan(10);
  });
});

describe("GameStore.createDefaultState", () => {
  it("seeds an empty DiplomacyState", () => {
    gameStore.reset();
    const s = gameStore.getState();
    expect(s.diplomacy).toBeDefined();
    expect(s.diplomacy!.rivalStanding).toEqual({});
    expect(s.diplomacy!.crossEmpireRivalStanding).toEqual({});
    expect(s.diplomacy!.empireTags).toEqual({});
    expect(s.diplomacy!.rivalTags).toEqual({});
    expect(s.diplomacy!.empireAmbassadors).toEqual({});
    expect(s.diplomacy!.rivalLiaisons).toEqual({});
    expect(s.diplomacy!.cooldowns).toEqual({});
    expect(s.diplomacy!.queuedActions).toEqual([]);
    expect(s.diplomacy!.actionsResolvedThisTurn).toBe(0);
  });
});

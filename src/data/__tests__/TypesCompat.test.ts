import { describe, it, expect } from "vitest";
import { SAVE_VERSION, ACTION_POINTS_PER_TURN, GAME_LENGTH_PRESETS, NAV_UNLOCK_RULES, NAV_ALWAYS_VISIBLE } from "../constants";
import { GameStore, SaveVersionError } from "../GameStore";

describe("Phase 6 data model compatibility", () => {
  it("SAVE_VERSION constant is defined", () => {
    expect(SAVE_VERSION).toBeDefined();
  });

  it("default state includes Phase 6 fields", () => {
    const store = new GameStore();
    const state = store.getState();
    expect(state.saveVersion).toBe(SAVE_VERSION);
    expect(state.actionPoints).toEqual({ current: ACTION_POINTS_PER_TURN, max: ACTION_POINTS_PER_TURN });
    expect(state.turnBrief).toEqual([]);
    expect(state.pendingChoiceEvents).toEqual([]);
    expect(state.activeEventChains).toEqual([]);
    expect(state.captains).toEqual([]);
    expect(state.routeMarket).toEqual([]);
    expect(state.researchEvents).toEqual([]);
    expect(Array.isArray(state.unlockedNavTabs)).toBe(true);
    expect(state.unlockedNavTabs).toContain("map");
    expect(state.unlockedNavTabs).toContain("routes");
    expect(state.reputationTier).toBe("unknown");
    expect(state.storyteller.turnsSinceLastDecision).toBe(0);
  });

  it("deserialize throws SaveVersionError for old save with no version", () => {
    const store = new GameStore();
    const oldSave = JSON.stringify({ turn: 1, cash: 100 }); // no saveVersion
    expect(() => store.deserialize(oldSave)).toThrow(SaveVersionError);
    expect(() => store.deserialize(oldSave)).toThrow("Major update – new game required");
  });

  it("deserialize throws SaveVersionError for wrong version", () => {
    const store = new GameStore();
    const wrongVersion = JSON.stringify({ saveVersion: 3, turn: 1, cash: 100 });
    expect(() => store.deserialize(wrongVersion)).toThrow(SaveVersionError);
    const err = (() => {
      try { store.deserialize(wrongVersion); } catch (e) { return e as SaveVersionError; }
    })();
    expect(err?.savedVersion).toBe(3);
    expect(err?.currentVersion).toBe(SAVE_VERSION);
  });

  it("deserialize succeeds for matching save version", () => {
    const store = new GameStore();
    store.update({ cash: 999999, turn: 7 });
    const json = store.serialize();
    const store2 = new GameStore();
    expect(() => store2.deserialize(json)).not.toThrow();
    expect(store2.getState().cash).toBe(999999);
    expect(store2.getState().turn).toBe(7);
  });

  it("ACTION_POINTS_PER_TURN is 2", () => {
    expect(ACTION_POINTS_PER_TURN).toBe(2);
  });

  it("GAME_LENGTH_PRESETS has quick/standard/epic", () => {
    expect(GAME_LENGTH_PRESETS.quick.maxTurns).toBe(25);
    expect(GAME_LENGTH_PRESETS.standard.maxTurns).toBe(45);
    expect(GAME_LENGTH_PRESETS.epic.maxTurns).toBe(80);
  });

  it("NAV_ALWAYS_VISIBLE has map/routes/fleet/finance", () => {
    expect(NAV_ALWAYS_VISIBLE).toContain("map");
    expect(NAV_ALWAYS_VISIBLE).toContain("routes");
    expect(NAV_ALWAYS_VISIBLE).toContain("fleet");
    expect(NAV_ALWAYS_VISIBLE).toContain("finance");
  });

  it("NAV_UNLOCK_RULES covers all progressive tabs", () => {
    const ruleTabIds = NAV_UNLOCK_RULES.map(r => r.tabId);
    expect(ruleTabIds).toContain("research");
    expect(ruleTabIds).toContain("contracts");
    expect(ruleTabIds).toContain("empires");
    expect(ruleTabIds).toContain("rivals");
    expect(ruleTabIds).toContain("hub");
  });
});

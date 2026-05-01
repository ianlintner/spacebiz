import { describe, it, expect } from "vitest";
import {
  resolveDiplomacyAction,
  processQueuedDiplomacyActions,
} from "../DiplomacyResolver.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import type { GameState, QueuedDiplomacyAction } from "../../../data/types.ts";
import { EMPTY_DIPLOMACY_STATE } from "../../../data/types.ts";

function baseState(opts?: {
  reputation?: number;
  queued?: readonly QueuedDiplomacyAction[];
}): GameState {
  return {
    seed: 1,
    turn: 5,
    cash: 1_000_000,
    reputation: opts?.reputation ?? 0,
    empireReputation: { vex: 50, sol: 50 },
    diplomacy: {
      ...EMPTY_DIPLOMACY_STATE,
      rivalStanding: { chen: 50, kade: 50 },
      empireTags: { vex: [], sol: [] },
      rivalTags: { chen: [], kade: [] },
      crossEmpireRivalStanding: { vex: { chen: 50 } },
      queuedActions: opts?.queued ?? [],
    },
  } as unknown as GameState;
}

describe("resolveDiplomacyAction (dispatcher)", () => {
  it("dispatches giftEmpire", () => {
    const rng = new SeededRNG(1);
    const action: QueuedDiplomacyAction = {
      id: "a1",
      kind: "giftEmpire",
      targetId: "vex",
      cashCost: 10_000,
    };
    const out = resolveDiplomacyAction(baseState(), action, rng);
    // giftEmpire writes a giftEmpire-keyed cooldown
    expect(out.nextState.diplomacy!.cooldowns["giftEmpire:vex"]).toBe(5 + 3);
  });

  it("dispatches giftRival", () => {
    const rng = new SeededRNG(1);
    const action: QueuedDiplomacyAction = {
      id: "a1",
      kind: "giftRival",
      targetId: "chen",
      cashCost: 5_000,
    };
    const out = resolveDiplomacyAction(baseState(), action, rng);
    expect(out.nextState.diplomacy!.cooldowns["giftRival:chen"]).toBe(5 + 3);
  });

  it("dispatches lobbyFor", () => {
    const rng = new SeededRNG(1);
    const action: QueuedDiplomacyAction = {
      id: "a1",
      kind: "lobbyFor",
      targetId: "vex",
      subjectId: "chen",
      cashCost: 5_000,
    };
    const out = resolveDiplomacyAction(baseState(), action, rng);
    expect(out.nextState.diplomacy!.cooldowns["lobbyFor:vex:chen"]).toBe(5 + 4);
  });

  it("dispatches proposeNonCompete", () => {
    const rng = new SeededRNG(1);
    const action: QueuedDiplomacyAction = {
      id: "a1",
      kind: "proposeNonCompete",
      targetId: "chen",
      subjectId: "vex",
      subjectIdSecondary: "sol",
      cashCost: 0,
    };
    const out = resolveDiplomacyAction(baseState(), action, rng);
    expect(out.nextState.diplomacy!.cooldowns["proposeNonCompete:chen"]).toBe(
      5 + 5,
    );
  });

  it("dispatches surveil", () => {
    const rng = new SeededRNG(1);
    const action: QueuedDiplomacyAction = {
      id: "a1",
      kind: "surveil",
      targetId: "chen",
      surveilLens: "cash",
      cashCost: 10_000,
    };
    const s = baseState();
    (s as unknown as { aiCompanies: unknown[] }).aiCompanies = [
      { id: "chen", cash: 1000, activeRoutes: [] },
    ];
    const out = resolveDiplomacyAction(s, action, rng);
    expect(out.nextState.diplomacy!.cooldowns["surveil:chen"]).toBe(5 + 6);
  });

  it("dispatches sabotage", () => {
    const rng = new SeededRNG(1);
    const action: QueuedDiplomacyAction = {
      id: "a1",
      kind: "sabotage",
      targetId: "chen",
      cashCost: 30_000,
    };
    const s = baseState();
    (s as unknown as { aiCompanies: unknown[] }).aiCompanies = [
      { id: "chen", name: "Chen", cash: 1_000_000, activeRoutes: [] },
    ];
    const out = resolveDiplomacyAction(s, action, rng);
    expect(out.nextState.diplomacy!.cooldowns["sabotage:chen"]).toBe(5 + 8);
  });
});

describe("processQueuedDiplomacyActions (throttle)", () => {
  function gift(id: string, target: string): QueuedDiplomacyAction {
    return { id, kind: "giftRival", targetId: target, cashCost: 1000 };
  }

  it("at low reputation: cap=2, 3 queued resolves 2 + 1 deferred digest", () => {
    const queued: QueuedDiplomacyAction[] = [
      gift("a", "chen"),
      gift("b", "kade"),
      gift("c", "chen"),
    ];
    const s = baseState({ reputation: 0, queued });
    const rng = new SeededRNG(1);
    const out = processQueuedDiplomacyActions(s, rng);
    expect(out.nextState.diplomacy!.actionsResolvedThisTurn).toBe(2);
    // queue fully drained
    expect(out.nextState.diplomacy!.queuedActions).toEqual([]);
    const deferred = out.digestEntries.filter((e) =>
      e.text.includes("deferred"),
    );
    expect(deferred.length).toBe(1);
  });

  it("at reputation >= 75: cap=3, all 3 resolved, no deferred", () => {
    const queued: QueuedDiplomacyAction[] = [
      gift("a", "chen"),
      gift("b", "kade"),
      gift("c", "chen"),
    ];
    const s = baseState({ reputation: 80, queued });
    const rng = new SeededRNG(1);
    const out = processQueuedDiplomacyActions(s, rng);
    expect(out.nextState.diplomacy!.actionsResolvedThisTurn).toBe(3);
    expect(out.nextState.diplomacy!.queuedActions).toEqual([]);
    const deferred = out.digestEntries.filter((e) =>
      e.text.includes("deferred"),
    );
    expect(deferred.length).toBe(0);
  });

  it("queue is fully drained even when no actions queued", () => {
    const s = baseState({ queued: [] });
    const rng = new SeededRNG(1);
    const out = processQueuedDiplomacyActions(s, rng);
    expect(out.nextState.diplomacy!.queuedActions).toEqual([]);
  });

  it("deferred digest entries reference action kind and target", () => {
    const queued: QueuedDiplomacyAction[] = [
      gift("a", "chen"),
      gift("b", "kade"),
      gift("c", "chen"),
      gift("d", "kade"),
    ];
    const s = baseState({ reputation: 0, queued });
    const rng = new SeededRNG(1);
    const out = processQueuedDiplomacyActions(s, rng);
    const deferred = out.digestEntries.filter((e) =>
      e.text.includes("deferred"),
    );
    expect(deferred.length).toBe(2);
    expect(deferred[0]!.text).toContain("giftRival");
    expect(deferred[0]!.text).toContain("chen");
  });
});

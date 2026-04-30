import { describe, it, expect } from "vitest";
import { resolveSabotage } from "../DiplomacyResolver.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import type { GameState, QueuedDiplomacyAction } from "../../../data/types.ts";
import { EMPTY_DIPLOMACY_STATE } from "../../../data/types.ts";

function baseState(rivalCash = 1_000_000): GameState {
  return {
    seed: 1,
    turn: 5,
    cash: 100_000,
    aiCompanies: [
      {
        id: "chen",
        name: "Chen Logistics",
        cash: rivalCash,
        activeRoutes: [],
      },
      // Untouched second rival to ensure we don't accidentally mutate others.
      {
        id: "kade",
        name: "Kade Reach",
        cash: 500_000,
        activeRoutes: [],
      },
    ],
    diplomacy: {
      ...EMPTY_DIPLOMACY_STATE,
      rivalStanding: { chen: 50, kade: 50 },
      rivalTags: { chen: [], kade: [] },
    },
  } as unknown as GameState;
}

function action(): QueuedDiplomacyAction {
  return {
    id: "a1",
    kind: "sabotage",
    targetId: "chen",
    cashCost: 30_000,
  };
}

describe("resolveSabotage", () => {
  it("clean success: Sabotaged tag, rival cash deducted 200k, digest only, no modal", () => {
    for (let seed = 1; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveSabotage(baseState(), action(), rng);
      if (out.success) {
        const tags = out.nextState.diplomacy!.rivalTags.chen!;
        const sabo = tags.find((t) => t.kind === "Sabotaged");
        expect(sabo).toBeDefined();
        if (sabo && sabo.kind === "Sabotaged") {
          expect(sabo.expiresOnTurn).toBe(5 + 4);
        }
        // Player paid full cost
        expect(out.nextState.cash).toBe(100_000 - 30_000);
        // Rival cash deducted by 200k
        const chen = out.nextState.aiCompanies?.find((r) => r.id === "chen");
        expect(chen?.cash).toBe(1_000_000 - 200_000);
        // Other rivals untouched
        const kade = out.nextState.aiCompanies?.find((r) => r.id === "kade");
        expect(kade?.cash).toBe(500_000);
        // Digest line surfaces, no modal on clean success
        expect(out.modalEntries.length).toBe(0);
        expect(out.digestEntries.length).toBeGreaterThanOrEqual(1);
        // No SuspectedSpy on clean success
        expect(tags.some((t) => t.kind === "SuspectedSpy")).toBe(false);
        return;
      }
    }
    throw new Error("no sabotage success across seeds");
  });

  it("exposed failure: SuspectedSpy:player tag, modal entry, no Sabotaged tag, half cash refunded", () => {
    for (let seed = 1; seed < 500; seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveSabotage(baseState(), action(), rng);
      if (!out.success) {
        const tags = out.nextState.diplomacy!.rivalTags.chen!;
        const spy = tags.find((t) => t.kind === "SuspectedSpy");
        expect(spy).toBeDefined();
        if (spy && spy.kind === "SuspectedSpy") {
          expect(spy.suspectId).toBe("player");
          expect(spy.expiresOnTurn).toBe(5 + 5);
        }
        expect(tags.some((t) => t.kind === "Sabotaged")).toBe(false);
        // Half cost on failure
        expect(out.nextState.cash).toBe(100_000 - 15_000);
        // Rival cash NOT deducted on failure
        const chen = out.nextState.aiCompanies?.find((r) => r.id === "chen");
        expect(chen?.cash).toBe(1_000_000);
        // Modal surfaces the exposure
        expect(out.modalEntries.length).toBeGreaterThanOrEqual(1);
        return;
      }
    }
    throw new Error("no sabotage failure across seeds");
  });

  it("sets cooldown 8 turns and increments actionsResolvedThisTurn", () => {
    const rng = new SeededRNG(1);
    const out = resolveSabotage(baseState(), action(), rng);
    expect(out.nextState.diplomacy!.cooldowns["sabotage:chen"]).toBe(5 + 8);
    expect(out.nextState.diplomacy!.actionsResolvedThisTurn).toBe(1);
  });

  it("rival cash deduction caps at the rival's current cash (no negatives)", () => {
    for (let seed = 1; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveSabotage(baseState(50_000), action(), rng);
      if (out.success) {
        const chen = out.nextState.aiCompanies?.find((r) => r.id === "chen");
        // Rival had 50k, deduction is 200k → floor at 0.
        expect(chen?.cash).toBe(0);
        return;
      }
    }
    throw new Error("no sabotage success across seeds");
  });
});

import { describe, it, expect } from "vitest";
import { resolveSurveil } from "../DiplomacyResolver.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import type {
  GameState,
  QueuedDiplomacyAction,
  SurveilLens,
} from "../../../data/types.ts";
import { EMPTY_DIPLOMACY_STATE } from "../../../data/types.ts";

function baseState(): GameState {
  return {
    seed: 1,
    turn: 5,
    cash: 100_000,
    aiCompanies: [
      {
        id: "chen",
        cash: 2_100_000,
        activeRoutes: [{ value: 1000 }, { value: 5000 }, { value: 2500 }],
      },
    ],
    diplomacy: {
      ...EMPTY_DIPLOMACY_STATE,
      rivalStanding: { chen: 50 },
      rivalTags: { chen: [] },
      crossEmpireRivalStanding: {
        vex: { chen: 40 },
        sol: { chen: 70 },
        zaq: { chen: 55 },
      },
    },
  } as unknown as GameState;
}

function action(lens: SurveilLens = "cash"): QueuedDiplomacyAction {
  return {
    id: "a1",
    kind: "surveil",
    targetId: "chen",
    surveilLens: lens,
    cashCost: 10_000,
  };
}

describe("resolveSurveil", () => {
  it("clean success: LeakedIntel tag with chosen lens, digest only, no modal", () => {
    for (let seed = 1; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveSurveil(baseState(), action("cash"), rng);
      if (out.success) {
        const tag = out.nextState.diplomacy!.rivalTags.chen!.find(
          (t) => t.kind === "LeakedIntel",
        );
        expect(tag).toBeDefined();
        if (tag && tag.kind === "LeakedIntel") {
          expect(tag.lens).toBe("cash");
          expect(tag.value).toBe("2100000");
          expect(tag.expiresOnTurn).toBe(5 + 3);
        }
        expect(out.modalEntries.length).toBe(0);
        expect(out.digestEntries.length).toBeGreaterThanOrEqual(1);
        expect(out.nextState.cash).toBe(90_000);
        return;
      }
    }
    throw new Error("no surveil success across seeds");
  });

  it("exposed failure: SuspectedSpy:player tag, modal entry, no LeakedIntel", () => {
    for (let seed = 1; seed < 500; seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveSurveil(baseState(), action("cash"), rng);
      if (!out.success) {
        const tags = out.nextState.diplomacy!.rivalTags.chen!;
        const spy = tags.find((t) => t.kind === "SuspectedSpy");
        expect(spy).toBeDefined();
        if (spy && spy.kind === "SuspectedSpy") {
          expect(spy.suspectId).toBe("player");
          expect(spy.expiresOnTurn).toBe(5 + 5);
        }
        expect(tags.some((t) => t.kind === "LeakedIntel")).toBe(false);
        expect(out.modalEntries.length).toBeGreaterThanOrEqual(1);
        return;
      }
    }
    throw new Error("no surveil failure across seeds");
  });

  it("lens=cash returns rival.cash as a string", () => {
    for (let seed = 1; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveSurveil(baseState(), action("cash"), rng);
      if (out.success) {
        const tag = out.nextState.diplomacy!.rivalTags.chen!.find(
          (t) => t.kind === "LeakedIntel",
        );
        if (tag && tag.kind === "LeakedIntel") {
          expect(tag.value).toBe("2100000");
        }
        return;
      }
    }
    throw new Error("no surveil success across seeds");
  });

  it("lens=topContractByValue returns the highest route value as a string", () => {
    for (let seed = 1; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveSurveil(
        baseState(),
        action("topContractByValue"),
        rng,
      );
      if (out.success) {
        const tag = out.nextState.diplomacy!.rivalTags.chen!.find(
          (t) => t.kind === "LeakedIntel",
        );
        if (tag && tag.kind === "LeakedIntel") {
          expect(tag.lens).toBe("topContractByValue");
          expect(tag.value).toBe("5000");
        }
        return;
      }
    }
    throw new Error("no surveil success across seeds");
  });

  it("lens=topEmpireStanding returns the empire id with highest cross-empire standing toward this rival", () => {
    for (let seed = 1; seed < 200; seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveSurveil(baseState(), action("topEmpireStanding"), rng);
      if (out.success) {
        const tag = out.nextState.diplomacy!.rivalTags.chen!.find(
          (t) => t.kind === "LeakedIntel",
        );
        if (tag && tag.kind === "LeakedIntel") {
          expect(tag.lens).toBe("topEmpireStanding");
          // sol has 70, the highest in fixture
          expect(tag.value).toBe("sol");
        }
        return;
      }
    }
    throw new Error("no surveil success across seeds");
  });

  it("sets cooldown and increments actionsResolvedThisTurn", () => {
    const rng = new SeededRNG(1);
    const out = resolveSurveil(baseState(), action(), rng);
    expect(out.nextState.diplomacy!.cooldowns["surveil:chen"]).toBe(5 + 6);
    expect(out.nextState.diplomacy!.actionsResolvedThisTurn).toBe(1);
  });
});

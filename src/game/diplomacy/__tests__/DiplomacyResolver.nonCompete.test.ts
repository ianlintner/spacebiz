import { describe, it, expect } from "vitest";
import { resolveNonCompete } from "../DiplomacyResolver.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import type { GameState, QueuedDiplomacyAction } from "../../../data/types.ts";
import { EMPTY_DIPLOMACY_STATE } from "../../../data/types.ts";

function baseState(rivalStanding: number): GameState {
  return {
    seed: 1,
    turn: 5,
    cash: 100_000,
    diplomacy: {
      ...EMPTY_DIPLOMACY_STATE,
      rivalStanding: { chen: rivalStanding },
      rivalTags: { chen: [] },
    },
  } as unknown as GameState;
}

function action(): QueuedDiplomacyAction {
  return {
    id: "a1",
    kind: "proposeNonCompete",
    targetId: "chen",
    subjectId: "vex",
    subjectIdSecondary: "sol",
    cashCost: 0,
  };
}

describe("resolveNonCompete", () => {
  it("throws when subjectId or subjectIdSecondary missing", () => {
    const rng = new SeededRNG(1);
    expect(() =>
      resolveNonCompete(
        baseState(50),
        {
          id: "a",
          kind: "proposeNonCompete",
          targetId: "chen",
          cashCost: 0,
        },
        rng,
      ),
    ).toThrow();
  });

  it("rejected when standing < 20", () => {
    for (let seed = 1; seed < 50; seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveNonCompete(baseState(15), action(), rng);
      expect(out.success).toBe(false);
      expect(
        out.nextState.diplomacy!.rivalTags.chen!.some(
          (t) => t.kind === "NonCompete",
        ),
      ).toBe(false);
      expect(out.modalEntries.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("can be accepted when standing >= 20 (across seeds)", () => {
    let foundAccept = false;
    for (let seed = 1; seed < 200 && !foundAccept; seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveNonCompete(baseState(50), action(), rng);
      if (out.success) {
        foundAccept = true;
        const tag = out.nextState.diplomacy!.rivalTags.chen!.find(
          (t) => t.kind === "NonCompete",
        );
        expect(tag).toBeDefined();
        if (tag && tag.kind === "NonCompete") {
          expect(tag.protectedEmpireIds).toContain("vex");
          expect(tag.protectedEmpireIds).toContain("sol");
          expect(tag.expiresOnTurn).toBe(5 + 10);
        }
        expect(out.modalEntries.length).toBeGreaterThanOrEqual(1);
      }
    }
    expect(foundAccept).toBe(true);
  });

  it("always uses modal surface (both branches surface a modal entry)", () => {
    // accept branch
    let sawAccept = false;
    let sawReject = false;
    for (let seed = 1; seed < 200 && !(sawAccept && sawReject); seed++) {
      const rng = new SeededRNG(seed);
      const out = resolveNonCompete(baseState(50), action(), rng);
      expect(out.modalEntries.length).toBeGreaterThanOrEqual(1);
      if (out.success) sawAccept = true;
      else sawReject = true;
    }
    expect(sawAccept).toBe(true);
    expect(sawReject).toBe(true);
  });

  it("sets cooldown and increments actionsResolvedThisTurn", () => {
    const rng = new SeededRNG(1);
    const out = resolveNonCompete(baseState(50), action(), rng);
    expect(out.nextState.diplomacy!.cooldowns["proposeNonCompete:chen"]).toBe(
      5 + 5,
    );
    expect(out.nextState.diplomacy!.actionsResolvedThisTurn).toBe(1);
  });
});

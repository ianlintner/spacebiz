import { describe, it, expect } from "vitest";
import { tickDiplomacyState } from "../DiplomacyTick.ts";
import type { GameState } from "../../../data/types.ts";
import { EMPTY_DIPLOMACY_STATE } from "../../../data/types.ts";

function baseState(): GameState {
  return {
    seed: 1,
    turn: 5,
    empireReputation: { vex: 60, sol: 40, low: 25 },
    diplomacy: {
      ...EMPTY_DIPLOMACY_STATE,
      rivalStanding: { chen: 70 },
      empireTags: {
        vex: [
          { kind: "RecentlyGifted", expiresOnTurn: 5 },
          { kind: "OweFavor", expiresOnTurn: 99 },
        ],
      },
      cooldowns: { "giftEmpire:vex": 5, "giftEmpire:sol": 99 },
      actionsResolvedThisTurn: 2,
    },
  } as unknown as GameState;
}

describe("tickDiplomacyState", () => {
  it("drifts standings toward 50 (and rivalStanding too)", () => {
    const next = tickDiplomacyState(baseState());
    expect(next.empireReputation?.vex).toBe(59);
    expect(next.empireReputation?.sol).toBe(41);
    expect(next.diplomacy?.rivalStanding.chen).toBe(69);
  });

  it("respects the hostile drift floor (< 30 stays put)", () => {
    const next = tickDiplomacyState(baseState());
    expect(next.empireReputation?.low).toBe(25);
  });

  it("expires tags whose expiresOnTurn <= currentTurn", () => {
    const next = tickDiplomacyState(baseState());
    const vexTags = next.diplomacy?.empireTags.vex ?? [];
    expect(vexTags.some((t) => t.kind === "RecentlyGifted")).toBe(false);
    expect(vexTags.some((t) => t.kind === "OweFavor")).toBe(true);
  });

  it("decrements/drops cooldowns whose untilTurn <= currentTurn", () => {
    const next = tickDiplomacyState(baseState());
    const cooldowns = next.diplomacy?.cooldowns ?? {};
    expect(cooldowns["giftEmpire:vex"]).toBeUndefined();
    expect(cooldowns["giftEmpire:sol"]).toBe(99);
  });

  it("resets actionsResolvedThisTurn to 0", () => {
    const next = tickDiplomacyState(baseState());
    expect(next.diplomacy?.actionsResolvedThisTurn).toBe(0);
  });
});

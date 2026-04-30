import { describe, it, expect } from "vitest";
import { selectDiplomacyOffer } from "../DiplomacyAI.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import type { GameState } from "../../../data/types.ts";
import { EMPTY_DIPLOMACY_STATE } from "../../../data/types.ts";

function baseState(): GameState {
  return {
    seed: 1,
    turn: 5,
    galaxy: {
      sectors: [],
      empires: [
        { id: "vex", name: "Vex" },
        { id: "sol", name: "Sol" },
      ],
      systems: [],
      planets: [],
    },
    aiCompanies: [{ id: "chen", name: "Chen Industries" }],
    contracts: [],
    empireReputation: { vex: 70, sol: 50 },
    diplomacy: {
      ...EMPTY_DIPLOMACY_STATE,
      rivalStanding: { chen: 30 },
      empireTags: { vex: [], sol: [] },
      rivalTags: {
        chen: [{ kind: "SuspectedSpy", suspectId: "player", expiresOnTurn: 9 }],
      },
    },
  } as unknown as GameState;
}

describe("selectDiplomacyOffer", () => {
  it("returns null sometimes (not every turn fires)", () => {
    let nullCount = 0;
    for (let s = 0; s < 30; s++) {
      const out = selectDiplomacyOffer(new SeededRNG(s), baseState());
      if (out === null) nullCount++;
    }
    expect(nullCount).toBeGreaterThan(0);
  });

  it("when emitted, the offer is a ChoiceEvent with options", () => {
    for (let s = 0; s < 30; s++) {
      const out = selectDiplomacyOffer(new SeededRNG(s), baseState());
      if (out) {
        expect(out.id).toBeDefined();
        expect(out.options.length).toBeGreaterThanOrEqual(1);
        return;
      }
    }
    throw new Error("Never emitted an offer in 30 trials");
  });

  it("can produce a SuspectedSpy warning when that tag is set", () => {
    let saw = false;
    for (let s = 0; s < 50; s++) {
      const out = selectDiplomacyOffer(new SeededRNG(s), baseState());
      if (out && out.eventId === "diplomacy:rivalSpyWarning") {
        saw = true;
        break;
      }
    }
    expect(saw).toBe(true);
  });

  it("fires rivalSpyWarning when only Sabotaged tag is present (no SuspectedSpy)", () => {
    const sabotagedState: GameState = {
      ...baseState(),
      diplomacy: {
        ...EMPTY_DIPLOMACY_STATE,
        rivalStanding: { chen: 30 },
        empireTags: { vex: [], sol: [] },
        rivalTags: {
          chen: [{ kind: "Sabotaged", expiresOnTurn: 9 }],
        },
      },
      // Override empireReputation so empires don't add Warm/Allied candidates
      // and dilute the test signal.
      empireReputation: { vex: 50, sol: 50 },
    } as unknown as GameState;

    let saw = false;
    for (let s = 0; s < 80; s++) {
      const out = selectDiplomacyOffer(new SeededRNG(s), sabotagedState);
      if (out && out.eventId === "diplomacy:rivalSpyWarning") {
        saw = true;
        break;
      }
    }
    expect(saw).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import {
  computeReputationTier,
  getLicenseFeeMultiplier,
  getReputationTariffMultiplier,
  hasPremiumContractAccess,
  makePremiumContract,
  getEmpireRep,
  adjustEmpireRep,
  computeFameRep,
  DEFAULT_EMPIRE_REPUTATION,
} from "../ReputationEffects.ts";
import type { Contract, GameState } from "../../../data/types.ts";
import { ContractStatus } from "../../../data/types.ts";

// ── computeReputationTier ────────────────────────────────────────────────────

describe("computeReputationTier", () => {
  it("returns notorious for 0", () => {
    expect(computeReputationTier(0)).toBe("notorious");
  });

  it("returns notorious for 24 (boundary below unknown)", () => {
    expect(computeReputationTier(24)).toBe("notorious");
  });

  it("returns unknown for 25 (boundary)", () => {
    expect(computeReputationTier(25)).toBe("unknown");
  });

  it("returns unknown for 49", () => {
    expect(computeReputationTier(49)).toBe("unknown");
  });

  it("returns respected for 50 (boundary)", () => {
    expect(computeReputationTier(50)).toBe("respected");
  });

  it("returns respected for 74", () => {
    expect(computeReputationTier(74)).toBe("respected");
  });

  it("returns renowned for 75 (boundary)", () => {
    expect(computeReputationTier(75)).toBe("renowned");
  });

  it("returns renowned for 89", () => {
    expect(computeReputationTier(89)).toBe("renowned");
  });

  it("returns legendary for 90 (boundary)", () => {
    expect(computeReputationTier(90)).toBe("legendary");
  });

  it("returns legendary for 100", () => {
    expect(computeReputationTier(100)).toBe("legendary");
  });
});

// ── getLicenseFeeMultiplier ──────────────────────────────────────────────────

describe("getLicenseFeeMultiplier", () => {
  it("returns 0.90 for rep 60 (respected — discount)", () => {
    expect(getLicenseFeeMultiplier(60)).toBe(0.9);
  });

  it("returns 1.20 for rep 20 (notorious — surcharge)", () => {
    expect(getLicenseFeeMultiplier(20)).toBe(1.2);
  });

  it("returns 1.00 for rep 40 (unknown — neutral)", () => {
    expect(getLicenseFeeMultiplier(40)).toBe(1.0);
  });

  it("returns 0.90 at exact boundary rep 50", () => {
    expect(getLicenseFeeMultiplier(50)).toBe(0.9);
  });

  it("returns 1.20 at exact boundary rep 24", () => {
    expect(getLicenseFeeMultiplier(24)).toBe(1.2);
  });

  it("returns 1.00 at exact boundary rep 25", () => {
    expect(getLicenseFeeMultiplier(25)).toBe(1.0);
  });
});

// ── getReputationTariffMultiplier ────────────────────────────────────────────

describe("getReputationTariffMultiplier", () => {
  it("returns 1.20 for rep 10 with peace (low rep, non-allied)", () => {
    expect(getReputationTariffMultiplier(10, "peace")).toBe(1.2);
  });

  it("returns 1.00 for rep 60 with peace (no surcharge)", () => {
    expect(getReputationTariffMultiplier(60, "peace")).toBe(1.0);
  });

  it("returns 1.00 for rep 10 with alliance (alliance overrides)", () => {
    expect(getReputationTariffMultiplier(10, "alliance")).toBe(1.0);
  });

  it("returns 1.20 for rep 10 with coldWar (non-allied surcharge)", () => {
    expect(getReputationTariffMultiplier(10, "coldWar")).toBe(1.2);
  });

  it("returns 1.00 for rep 25 boundary with peace", () => {
    expect(getReputationTariffMultiplier(25, "peace")).toBe(1.0);
  });

  it("returns 1.20 for rep 24 with tradePact (surcharge despite good relations)", () => {
    expect(getReputationTariffMultiplier(24, "tradePact")).toBe(1.2);
  });
});

// ── hasPremiumContractAccess ─────────────────────────────────────────────────

describe("hasPremiumContractAccess", () => {
  it("returns false for rep 74 (below threshold)", () => {
    expect(hasPremiumContractAccess(74)).toBe(false);
  });

  it("returns true for rep 75 (boundary)", () => {
    expect(hasPremiumContractAccess(75)).toBe(true);
  });

  it("returns true for rep 100", () => {
    expect(hasPremiumContractAccess(100)).toBe(true);
  });

  it("returns false for rep 0", () => {
    expect(hasPremiumContractAccess(0)).toBe(false);
  });
});

// ── makePremiumContract ──────────────────────────────────────────────────────

const baseContract: Contract = {
  id: "contract-test-t5-abc123",
  type: "passengerFerry",
  targetEmpireId: null,
  originPlanetId: "planet-0-0-0",
  destinationPlanetId: "planet-0-1-0",
  cargoType: "passengers",
  durationTurns: 4,
  turnsRemaining: 4,
  rewardCash: 20000,
  rewardReputation: 0,
  rewardResearchPoints: 2,
  rewardTariffReduction: null,
  depositPaid: 3000,
  status: ContractStatus.Available,
  linkedRouteId: null,
  turnsWithoutShip: 0,
};

describe("makePremiumContract", () => {
  it("doubles rewardCash", () => {
    const premium = makePremiumContract(baseContract);
    expect(premium.rewardCash).toBe(40000);
  });

  it("doubles depositPaid", () => {
    const premium = makePremiumContract(baseContract);
    expect(premium.depositPaid).toBe(6000);
  });

  it("sets duration to 70% of base (rounded up)", () => {
    const premium = makePremiumContract(baseContract);
    // ceil(4 * 0.7) = ceil(2.8) = 3
    expect(premium.durationTurns).toBe(3);
    expect(premium.turnsRemaining).toBe(3);
  });

  it("keeps other fields from base contract", () => {
    const premium = makePremiumContract(baseContract);
    expect(premium.cargoType).toBe("passengers");
    expect(premium.originPlanetId).toBe("planet-0-0-0");
    expect(premium.type).toBe("passengerFerry");
  });

  it("sets status to Available", () => {
    const premium = makePremiumContract({
      ...baseContract,
      status: ContractStatus.Active,
    });
    expect(premium.status).toBe(ContractStatus.Available);
  });

  it("resets linkedRouteId and turnsWithoutShip", () => {
    const premium = makePremiumContract({
      ...baseContract,
      linkedRouteId: "route-123",
      turnsWithoutShip: 2,
    });
    expect(premium.linkedRouteId).toBeNull();
    expect(premium.turnsWithoutShip).toBe(0);
  });

  it("generates unique id by appending -premium", () => {
    const premium = makePremiumContract(baseContract);
    expect(premium.id).toBe("contract-test-t5-abc123-premium");
  });

  it("handles duration of 1 (min stays at 1)", () => {
    const shortContract = {
      ...baseContract,
      durationTurns: 1,
      turnsRemaining: 1,
    };
    const premium = makePremiumContract(shortContract);
    expect(premium.durationTurns).toBe(1);
  });
});

// ── Per-Empire Reputation ────────────────────────────────────────────────────

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    reputation: 50,
    empireReputation: {},
    ...overrides,
  } as GameState;
}

describe("getEmpireRep", () => {
  it("returns the stored value when present", () => {
    const state = makeState({ empireReputation: { solaris: 72 } });
    expect(getEmpireRep(state, "solaris")).toBe(72);
  });

  it("returns the default when empire is missing", () => {
    const state = makeState({ empireReputation: {} });
    expect(getEmpireRep(state, "solaris")).toBe(DEFAULT_EMPIRE_REPUTATION);
  });

  it("returns the default when empireReputation map is undefined (v6 saves)", () => {
    const state = makeState();
    delete (state as Partial<GameState>).empireReputation;
    expect(getEmpireRep(state, "solaris")).toBe(50);
  });
});

describe("adjustEmpireRep", () => {
  it("adds delta to existing reputation", () => {
    const state = makeState({ empireReputation: { solaris: 60 } });
    expect(adjustEmpireRep(state, "solaris", 5).solaris).toBe(65);
  });

  it("starts from default for an empire with no record", () => {
    const state = makeState({ empireReputation: {} });
    expect(adjustEmpireRep(state, "vex", 10).vex).toBe(60);
  });

  it("clamps to [0, 100]", () => {
    const state = makeState({ empireReputation: { a: 5, b: 95 } });
    expect(adjustEmpireRep(state, "a", -50).a).toBe(0);
    expect(adjustEmpireRep(state, "b", 50).b).toBe(100);
  });

  it("does not mutate the input map", () => {
    const map = { solaris: 50 };
    const state = makeState({ empireReputation: map });
    adjustEmpireRep(state, "solaris", 10);
    expect(map.solaris).toBe(50);
  });

  it("preserves other empires' reputation", () => {
    const state = makeState({
      empireReputation: { solaris: 50, vex: 30, krell: 80 },
    });
    const next = adjustEmpireRep(state, "solaris", 10);
    expect(next).toEqual({ solaris: 60, vex: 30, krell: 80 });
  });
});

describe("computeFameRep", () => {
  it("falls back to legacy state.reputation when map is empty", () => {
    const state = makeState({ reputation: 73, empireReputation: {} });
    expect(computeFameRep(state)).toBe(73);
  });

  it("falls back to legacy state.reputation when map is undefined", () => {
    const state = makeState({ reputation: 42 });
    delete (state as Partial<GameState>).empireReputation;
    expect(computeFameRep(state)).toBe(42);
  });

  it("blends mean and max (0.6 mean + 0.4 max)", () => {
    const state = makeState({
      reputation: 99, // ignored when map present
      empireReputation: { a: 50, b: 50, c: 80 },
    });
    // mean = 60, max = 80 -> 0.6*60 + 0.4*80 = 36 + 32 = 68
    expect(computeFameRep(state)).toBe(68);
  });

  it("collapses to the single value when only one empire is recorded", () => {
    const state = makeState({
      empireReputation: { solo: 70 },
    });
    expect(computeFameRep(state)).toBe(70);
  });

  it("rewards a single legendary standing without ignoring weak rest", () => {
    const lopsided = makeState({
      empireReputation: { home: 95, a: 10, b: 10, c: 10 },
    });
    // mean = 31.25, max = 95 -> 0.6*31.25 + 0.4*95 = 18.75 + 38 = 56.75 -> 57
    expect(computeFameRep(lopsided)).toBe(57);
  });
});

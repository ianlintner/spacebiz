import { describe, it, expect } from "vitest";
import {
  computeReputationTier,
  getLicenseFeeMultiplier,
  getReputationTariffMultiplier,
  hasPremiumContractAccess,
  makePremiumContract,
} from "../ReputationEffects.ts";
import type { Contract } from "../../../data/types.ts";
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

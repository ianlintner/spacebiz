import { describe, it, expect } from "vitest";
import {
  getTechEffectTotal,
  hasTechEffect,
  getTechRouteSlotBonus,
  getLicenseFeeMultiplier,
  getTariffMultiplier,
  getMaintenanceMultiplier,
  getFuelMultiplier,
  getRevenueMultiplier,
  getFreightHullMark,
  getPassengerHullMark,
  getTotalFreightCapacity,
  getTotalPassengerCapacity,
} from "../TechEffects.ts";
import type { GameState, TechState } from "../../../data/types.ts";
import { initAdviserState } from "../../adviser/AdviserEngine.ts";

function createTestState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 42,
    turn: 3,
    maxTurns: 20,
    phase: "planning",
    cash: 150000,
    loans: [],
    reputation: 55,
    companyName: "Test Corp",
    ceoName: "Commander",
    ceoPortrait: { portraitId: "ceo-01", category: "human" },
    gameSize: "standard",
    galaxyShape: "spiral",
    playerEmpireId: "empire-1",
    galaxy: { sectors: [], empires: [], systems: [], planets: [] },
    activeRoutes: [],
    market: { fuelPrice: 12, fuelTrend: "stable", planetMarkets: {} },
    aiCompanies: [],
    activeEvents: [],
    history: [],
    storyteller: {
      playerHealthScore: 50,
      headwindBias: 0,
      turnsInDebt: 0,
      consecutiveProfitTurns: 0,
      turnsSinceLastDecision: 0,
    },
    score: 0,
    gameOver: false,
    gameOverReason: null,
    adviser: initAdviserState(),
    routeSlots: 4,
    unlockedEmpireIds: ["empire-1"],
    contracts: [],
    tech: {
      researchPoints: 0,
      completedTechIds: [],
      currentResearchId: null,
      researchProgress: 0,
      purchaseCount: {},
      queue: [],
      committedBranches: [],
    },
    empireTradePolicies: {},
    interEmpireCargoLocks: [],
    stationHub: null,
    saveVersion: 6,
    actionPoints: { current: 2, max: 2 },
    turnBrief: [],
    pendingChoiceEvents: [],
    activeEventChains: [],
    captains: [],
    routeMarket: [],
    researchEvents: [],
    unlockedNavTabs: [
      "map",
      "routes",
      "fleet",
      "finance",
    ] as import("../../../data/types.ts").NavTabId[],
    reputationTier:
      "unknown" as import("../../../data/types.ts").ReputationTier,
    localRouteSlots: 2,
    ...overrides,
  };
}

describe("Tech Effects", () => {
  it("returns 0 for no completed techs", () => {
    const state = createTestState();
    expect(getTechEffectTotal(state, "addRouteSlots")).toBe(0);
  });

  it("sums route slot bonuses from completed techs", () => {
    const state = createTestState({
      tech: {
        researchPoints: 0,
        completedTechIds: ["logistics_hub", "logistics_3"],
        currentResearchId: null,
        researchProgress: 0,
        purchaseCount: { logistics_hub: 1, logistics_3: 1 },
        queue: [],
        committedBranches: [],
      },
    });
    // logistics_hub = +1, logistics_3 = +1
    expect(getTechRouteSlotBonus(state)).toBe(2);
  });

  it("hasTechEffect returns false with no techs", () => {
    const state = createTestState();
    expect(hasTechEffect(state, "addRouteSlots")).toBe(false);
  });

  it("hasTechEffect returns true after completing relevant tech", () => {
    const state = createTestState({
      tech: {
        researchPoints: 0,
        completedTechIds: ["logistics_hub"],
        currentResearchId: null,
        researchProgress: 0,
        purchaseCount: { logistics_hub: 1 },
        queue: [],
        committedBranches: [],
      },
    });
    expect(hasTechEffect(state, "addRouteSlots")).toBe(true);
  });

  it("license fee multiplier starts at 1.0", () => {
    const state = createTestState();
    expect(getLicenseFeeMultiplier(state)).toBe(1);
  });

  it("license fee multiplier decreases with tech", () => {
    const state = createTestState({
      tech: {
        researchPoints: 0,
        completedTechIds: ["logistics_hub", "logistics_3"], // logistics_3 has -0.1 licenseFee
        currentResearchId: null,
        researchProgress: 0,
        purchaseCount: { logistics_hub: 1, logistics_3: 1 },
        queue: [],
        committedBranches: [],
      },
    });
    expect(getLicenseFeeMultiplier(state)).toBeCloseTo(0.9);
  });

  it("repeatable fuel savings node purchased twice gives 2× effect", () => {
    const state = createTestState({
      tech: {
        researchPoints: 0,
        completedTechIds: ["fuel_savings_r"],
        currentResearchId: null,
        researchProgress: 0,
        purchaseCount: { fuel_savings_r: 2 },
        queue: [],
        committedBranches: [],
      },
    });
    // fuel_savings_r = -0.01 per purchase; 2 purchases = -0.02 total
    expect(getFuelMultiplier(state)).toBeCloseTo(0.98);
  });

  it("repeatable fuel savings node purchased three times gives 3× effect", () => {
    const state = createTestState({
      tech: {
        researchPoints: 0,
        completedTechIds: ["fuel_savings_r"],
        currentResearchId: null,
        researchProgress: 0,
        purchaseCount: { fuel_savings_r: 3 },
        queue: [],
        committedBranches: [],
      },
    });
    // fuel_savings_r = -0.01 per purchase; 3 purchases = -0.03 total
    expect(getFuelMultiplier(state)).toBeCloseTo(0.97);
  });

  it("getTechEffectTotal uses purchaseCount as source of truth (not completedTechIds)", () => {
    // purchaseCount says 2 purchases but completedTechIds only lists it once
    const state = createTestState({
      tech: {
        researchPoints: 0,
        completedTechIds: ["fuel_savings_r"],
        currentResearchId: null,
        researchProgress: 0,
        purchaseCount: { fuel_savings_r: 2 },
        queue: [],
        committedBranches: [],
      },
    });
    // Should be -0.02 (2 purchases × -0.01), not -0.01
    expect(getTechEffectTotal(state, "modifyFuel")).toBeCloseTo(-0.02);
  });

  it("tariff multiplier defaults to 1.0", () => {
    const state = createTestState();
    expect(getTariffMultiplier(state, "neutral")).toBe(1);
  });

  it("maintenance multiplier defaults to 1.0", () => {
    const state = createTestState();
    expect(getMaintenanceMultiplier(state)).toBe(1);
  });

  it("fuel multiplier defaults to 1.0", () => {
    const state = createTestState();
    expect(getFuelMultiplier(state)).toBe(1);
  });

  it("revenue multiplier defaults to 1.0", () => {
    const state = createTestState();
    expect(getRevenueMultiplier(state)).toBe(1);
  });
});

describe("getFreightHullMark", () => {
  it("returns 1 (Mk I) with no hull research", () => {
    const tech: TechState = {
      researchPoints: 0,
      completedTechIds: [],
      purchaseCount: {},
      queue: [],
      currentResearchId: null,
      researchProgress: 0,
      committedBranches: [],
    };
    expect(getFreightHullMark(tech)).toBe(1);
  });
});

describe("getPassengerHullMark", () => {
  it("returns 1 with no research", () => {
    const tech: TechState = {
      researchPoints: 0,
      completedTechIds: [],
      purchaseCount: {},
      queue: [],
      currentResearchId: null,
      researchProgress: 0,
      committedBranches: [],
    };
    expect(getPassengerHullMark(tech)).toBe(1);
  });
});

describe("getTotalFreightCapacity", () => {
  it("returns base (4) with no Logistics AI research", () => {
    const tech: TechState = {
      researchPoints: 0,
      completedTechIds: [],
      purchaseCount: {},
      queue: [],
      currentResearchId: null,
      researchProgress: 0,
      committedBranches: [],
    };
    expect(getTotalFreightCapacity(tech)).toBe(4);
  });
});

describe("getTotalPassengerCapacity", () => {
  it("returns base (4) with no research", () => {
    const tech: TechState = {
      researchPoints: 0,
      completedTechIds: [],
      purchaseCount: {},
      queue: [],
      currentResearchId: null,
      researchProgress: 0,
      committedBranches: [],
    };
    expect(getTotalPassengerCapacity(tech)).toBe(4);
  });
});

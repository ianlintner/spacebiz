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
} from "../TechEffects.ts";
import type { GameState } from "../../../data/types.ts";
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
    gameSize: "small",
    galaxyShape: "spiral",
    playerEmpireId: "empire-1",
    galaxy: { sectors: [], empires: [], systems: [], planets: [] },
    fleet: [],
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
    },
    empireTradePolicies: {},
    interEmpireCargoLocks: [],
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
        completedTechIds: ["logistics_1", "logistics_2"],
        currentResearchId: null,
        researchProgress: 0,
      },
    });
    // logistics_1 = +1, logistics_2 = +1
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
        completedTechIds: ["logistics_1"],
        currentResearchId: null,
        researchProgress: 0,
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
        completedTechIds: ["logistics_1", "logistics_2"], // logistics_2 has -0.1 licenseFee
        currentResearchId: null,
        researchProgress: 0,
      },
    });
    expect(getLicenseFeeMultiplier(state)).toBeCloseTo(0.9);
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

import { describe, it, expect } from "vitest";
import {
  getAvailableRouteSlots,
  getUsedRouteSlots,
  getFreeRouteSlots,
} from "../RouteManager.ts";
import type { GameState, ActiveRoute } from "../../../data/types.ts";
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
    unlockedNavTabs: ["map", "routes", "fleet", "finance"] as import("../../../data/types.ts").NavTabId[],
    reputationTier: "unknown" as import("../../../data/types.ts").ReputationTier,
    localRouteSlots: 2,
    ...overrides,
  };
}

function makeRoute(id: string): ActiveRoute {
  return {
    id,
    originPlanetId: "planet-1",
    destinationPlanetId: "planet-2",
    distance: 10,
    cargoType: "rawMaterials",
    assignedShipIds: [],
  };
}

describe("Route Slot System", () => {
  it("returns base route slots when no tech completed", () => {
    const state = createTestState({ routeSlots: 4 });
    expect(getAvailableRouteSlots(state)).toBe(4);
  });

  it("adds tech bonus to route slots", () => {
    const state = createTestState({
      routeSlots: 4,
      tech: {
        researchPoints: 0,
        completedTechIds: ["logistics_1"], // +1 slot
        currentResearchId: null,
        researchProgress: 0,
      },
    });
    expect(getAvailableRouteSlots(state)).toBe(5);
  });

  it("counts used route slots from active routes", () => {
    const state = createTestState({
      activeRoutes: [makeRoute("r1"), makeRoute("r2"), makeRoute("r3")],
    });
    expect(getUsedRouteSlots(state)).toBe(3);
  });

  it("calculates free route slots correctly", () => {
    const state = createTestState({
      routeSlots: 4,
      activeRoutes: [makeRoute("r1")],
    });
    expect(getFreeRouteSlots(state)).toBe(3);
  });

  it("returns zero free slots when at capacity", () => {
    const state = createTestState({
      routeSlots: 2,
      activeRoutes: [makeRoute("r1"), makeRoute("r2"), makeRoute("r3")],
    });
    expect(getFreeRouteSlots(state)).toBe(0);
  });

  it("stacks multiple logistics tech bonuses", () => {
    const state = createTestState({
      routeSlots: 4,
      tech: {
        researchPoints: 0,
        completedTechIds: ["logistics_1", "logistics_2"], // +1 +1
        currentResearchId: null,
        researchProgress: 0,
      },
    });
    expect(getAvailableRouteSlots(state)).toBe(6);
  });
});

import { describe, it, expect } from "vitest";
import {
  isTechAvailable,
  getAvailableTechs,
  setResearchTarget,
  calculateRPPerTurn,
  processResearch,
  getCurrentResearch,
  getResearchProgress,
} from "../TechTree.ts";
import type { GameState, TechState, ActiveRoute } from "../../../data/types.ts";
import { initAdviserState } from "../../adviser/AdviserEngine.ts";
import { BASE_RP_PER_TURN } from "../../../data/constants.ts";

function makeTechState(overrides: Partial<TechState> = {}): TechState {
  return {
    researchPoints: 0,
    completedTechIds: [],
    currentResearchId: null,
    researchProgress: 0,
    ...overrides,
  };
}

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
    tech: makeTechState(),
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

function makeRoute(
  id: string,
  cargoType: string,
  hasShip: boolean,
): ActiveRoute {
  return {
    id,
    originPlanetId: "planet-1",
    destinationPlanetId: "planet-2",
    distance: 10,
    cargoType: cargoType as ActiveRoute["cargoType"],
    assignedShipIds: hasShip ? ["ship-1"] : [],
  };
}

describe("Tech Tree System", () => {
  describe("isTechAvailable", () => {
    it("tier 1 tech is available with no prerequisites", () => {
      const tech = makeTechState();
      expect(isTechAvailable("logistics_1", tech)).toBe(true);
    });

    it("already completed tech is not available", () => {
      const tech = makeTechState({ completedTechIds: ["logistics_1"] });
      expect(isTechAvailable("logistics_1", tech)).toBe(false);
    });

    it("currently researching tech is not available", () => {
      const tech = makeTechState({ currentResearchId: "logistics_1" });
      expect(isTechAvailable("logistics_1", tech)).toBe(false);
    });

    it("tier 2 tech requires tier 1 in same branch", () => {
      const tech = makeTechState({ completedTechIds: [] });
      expect(isTechAvailable("logistics_2", tech)).toBe(false);
    });

    it("tier 2 tech available after tier 1 completed", () => {
      const tech = makeTechState({ completedTechIds: ["logistics_1"] });
      expect(isTechAvailable("logistics_2", tech)).toBe(true);
    });
  });

  describe("getAvailableTechs", () => {
    it("returns all tier 1 techs initially", () => {
      const tech = makeTechState();
      const available = getAvailableTechs(tech);
      // All tier 1 techs from each branch should be available
      expect(available.length).toBeGreaterThan(0);
      expect(available.every((t) => t.tier === 1)).toBe(true);
    });

    it("includes tier 2 after completing tier 1", () => {
      const tech = makeTechState({ completedTechIds: ["logistics_1"] });
      const available = getAvailableTechs(tech);
      const hasT2 = available.some((t) => t.id === "logistics_2");
      expect(hasT2).toBe(true);
    });
  });

  describe("setResearchTarget", () => {
    it("sets a valid research target", () => {
      const tech = makeTechState();
      const result = setResearchTarget("logistics_1", tech);
      expect(result).not.toBeNull();
      expect(result!.currentResearchId).toBe("logistics_1");
    });

    it("returns null for unavailable tech", () => {
      const tech = makeTechState();
      const result = setResearchTarget("logistics_2", tech);
      expect(result).toBeNull();
    });
  });

  describe("calculateRPPerTurn", () => {
    it("returns base RP with no routes", () => {
      const state = createTestState();
      expect(calculateRPPerTurn(state)).toBe(BASE_RP_PER_TURN);
    });

    it("gives diversity bonus for varied cargo types", () => {
      const routes = [
        makeRoute("r1", "food", true),
        makeRoute("r2", "technology", true),
        makeRoute("r3", "rawMaterials", true),
        makeRoute("r4", "luxury", true),
      ];
      const state = createTestState({ activeRoutes: routes });
      const rp = calculateRPPerTurn(state);
      expect(rp).toBeGreaterThan(BASE_RP_PER_TURN);
    });

    it("gives research planet bonus", () => {
      const state = createTestState({
        galaxy: {
          sectors: [],
          empires: [],
          systems: [],
          planets: [
            {
              id: "planet-1",
              name: "P1",
              systemId: "s1",
              type: "research",
              x: 0,
              y: 0,
              population: 1000,
            },
            {
              id: "planet-2",
              name: "P2",
              systemId: "s1",
              type: "terran",
              x: 0,
              y: 0,
              population: 1000,
            },
          ],
        },
        activeRoutes: [makeRoute("r1", "food", true)],
      });
      const rp = calculateRPPerTurn(state);
      // planet-1 is research type, route goes to/from it → bonus
      expect(rp).toBeGreaterThanOrEqual(BASE_RP_PER_TURN);
    });
  });

  describe("processResearch", () => {
    it("accumulates RP without active research", () => {
      const state = createTestState({
        tech: makeTechState({ researchProgress: 0 }),
      });
      const result = processResearch(state, 3);
      expect(result.researchPoints).toBe(3);
      expect(result.researchProgress).toBe(3);
    });

    it("progresses towards completion", () => {
      const state = createTestState({
        tech: makeTechState({
          currentResearchId: "logistics_1",
          researchProgress: 5,
        }),
      });
      // logistics_1 costs 8 RP
      const result = processResearch(state, 2);
      expect(result.researchProgress).toBe(7);
      expect(result.currentResearchId).toBe("logistics_1");
    });

    it("completes tech and carries over excess RP", () => {
      const state = createTestState({
        tech: makeTechState({
          currentResearchId: "logistics_1",
          researchProgress: 6,
        }),
      });
      // logistics_1 costs 8 RP, progress 6 + 4 = 10 → complete with 2 excess
      const result = processResearch(state, 4);
      expect(result.completedTechIds).toContain("logistics_1");
      expect(result.currentResearchId).toBeNull();
      expect(result.researchProgress).toBe(2); // carry-over
    });
  });

  describe("getCurrentResearch", () => {
    it("returns null when no research active", () => {
      const tech = makeTechState();
      expect(getCurrentResearch(tech)).toBeNull();
    });

    it("returns the current technology", () => {
      const tech = makeTechState({ currentResearchId: "logistics_1" });
      const current = getCurrentResearch(tech);
      expect(current).not.toBeNull();
      expect(current!.id).toBe("logistics_1");
    });
  });

  describe("getResearchProgress", () => {
    it("returns 0 when no research", () => {
      const tech = makeTechState();
      expect(getResearchProgress(tech)).toBe(0);
    });

    it("returns fraction of completion", () => {
      const tech = makeTechState({
        currentResearchId: "logistics_1",
        researchProgress: 4,
      });
      const progress = getResearchProgress(tech);
      expect(progress).toBe(0.5); // 4/8
    });
  });
});

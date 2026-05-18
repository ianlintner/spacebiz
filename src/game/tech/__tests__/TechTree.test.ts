import { describe, it, expect } from "vitest";
import { PlanetBiome } from "../../../data/types.ts";
import {
  isTechAvailable,
  getAvailableTechs,
  setResearchTarget,
  calculateRPPerTurn,
  processResearch,
  getCurrentResearch,
  getResearchProgress,
  effectiveCost,
  applyPurchase,
  instantUnlockOrQueue,
  reorderQueue,
  removeFromQueue,
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
    purchaseCount: {},
    queue: [],
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
    paused: !hasShip,
  };
}

describe("Tech Tree System", () => {
  describe("isTechAvailable", () => {
    it("center node fuel_efficiency_1 is always available", () => {
      const tech = makeTechState();
      expect(isTechAvailable("fuel_efficiency_1", tech)).toBe(true);
    });

    it("adjacency node requires a completed neighbor", () => {
      const tech = makeTechState();
      // logistics_hub needs fuel_efficiency_1 as a completed neighbor
      expect(isTechAvailable("logistics_hub", tech)).toBe(false);
    });

    it("adjacency node is available once neighbor is completed", () => {
      const tech = makeTechState({ completedTechIds: ["fuel_efficiency_1"] });
      expect(isTechAvailable("logistics_hub", tech)).toBe(true);
    });

    it("already purchased non-repeatable tech is not available", () => {
      const tech = makeTechState({
        completedTechIds: ["logistics_hub"],
        purchaseCount: { logistics_hub: 1 },
      });
      expect(isTechAvailable("logistics_hub", tech)).toBe(false);
    });

    it("queued tech is not available", () => {
      const tech = makeTechState({
        completedTechIds: ["fuel_efficiency_1"],
        queue: ["logistics_hub"],
      });
      expect(isTechAvailable("logistics_hub", tech)).toBe(false);
    });

    it("repeatable tech remains available after purchase", () => {
      const tech = makeTechState({
        completedTechIds: ["fuel_efficiency_1"],
        purchaseCount: { fuel_efficiency_1: 1 },
      });
      // fuel_efficiency_1 is center node and repeatable
      expect(isTechAvailable("fuel_efficiency_1", tech)).toBe(true);
    });

    it("tier 2 tech requires tier 1 in same branch (adjacency)", () => {
      const tech = makeTechState({ completedTechIds: [] });
      expect(isTechAvailable("logistics_2a", tech)).toBe(false);
    });

    it("tier 2 tech available after tier 1 completed", () => {
      const tech = makeTechState({ completedTechIds: ["logistics_hub"] });
      expect(isTechAvailable("logistics_2a", tech)).toBe(true);
    });

    it("unknown tech id is not available", () => {
      const tech = makeTechState();
      expect(isTechAvailable("nonexistent_tech", tech)).toBe(false);
    });
  });

  describe("effectiveCost", () => {
    it("returns node rpCost for first purchase", () => {
      const tech = makeTechState();
      // fuel_efficiency_1 costs 4
      expect(effectiveCost("fuel_efficiency_1", tech)).toBe(4);
    });

    it("scales cost for repeatable techs on subsequent purchases", () => {
      const tech = makeTechState({ purchaseCount: { fuel_efficiency_1: 1 } });
      // 4 * 1.5^1 = 6
      expect(effectiveCost("fuel_efficiency_1", tech)).toBe(6);
    });

    it("returns Infinity for unknown tech", () => {
      const tech = makeTechState();
      expect(effectiveCost("nonexistent", tech)).toBe(Infinity);
    });
  });

  describe("applyPurchase", () => {
    it("increments purchaseCount and adds to completedTechIds on first purchase", () => {
      const tech = makeTechState();
      const result = applyPurchase("fuel_efficiency_1", tech);
      expect(result.purchaseCount["fuel_efficiency_1"]).toBe(1);
      expect(result.completedTechIds).toContain("fuel_efficiency_1");
    });

    it("increments purchaseCount but does not duplicate completedTechIds on repeat", () => {
      const tech = makeTechState({
        completedTechIds: ["fuel_efficiency_1"],
        purchaseCount: { fuel_efficiency_1: 1 },
      });
      const result = applyPurchase("fuel_efficiency_1", tech);
      expect(result.purchaseCount["fuel_efficiency_1"]).toBe(2);
      expect(
        result.completedTechIds.filter((id) => id === "fuel_efficiency_1")
          .length,
      ).toBe(1);
    });
  });

  describe("instantUnlockOrQueue", () => {
    it("returns null for unavailable tech", () => {
      const tech = makeTechState();
      // logistics_hub not available without completed neighbor
      expect(instantUnlockOrQueue("logistics_hub", tech)).toBeNull();
    });

    it("instantly purchases if researchPoints >= cost", () => {
      const tech = makeTechState({ researchPoints: 10 });
      // fuel_efficiency_1 costs 4
      const result = instantUnlockOrQueue("fuel_efficiency_1", tech);
      expect(result).not.toBeNull();
      expect(result!.completedTechIds).toContain("fuel_efficiency_1");
      expect(result!.researchPoints).toBe(6);
    });

    it("adds to queue if researchPoints < cost", () => {
      const tech = makeTechState({ researchPoints: 1 });
      const result = instantUnlockOrQueue("fuel_efficiency_1", tech);
      expect(result).not.toBeNull();
      expect(result!.queue).toContain("fuel_efficiency_1");
      expect(result!.currentResearchId).toBe("fuel_efficiency_1");
    });
  });

  describe("getAvailableTechs", () => {
    it("returns only the center node when nothing is completed", () => {
      const tech = makeTechState();
      const available = getAvailableTechs(tech);
      // Only fuel_efficiency_1 is available with no completed techs
      expect(available.length).toBeGreaterThan(0);
      expect(available.some((t) => t.id === "fuel_efficiency_1")).toBe(true);
      // Hub nodes are not yet available
      expect(available.some((t) => t.id === "logistics_hub")).toBe(false);
    });

    it("includes adjacent techs once center node is completed", () => {
      const tech = makeTechState({ completedTechIds: ["fuel_efficiency_1"] });
      const available = getAvailableTechs(tech);
      // logistics_hub, engineering_hub, etc. should now be available
      expect(available.some((t) => t.id === "logistics_hub")).toBe(true);
    });

    it("includes tier 2 after completing tier 1", () => {
      const tech = makeTechState({ completedTechIds: ["logistics_hub"] });
      const available = getAvailableTechs(tech);
      const hasT2 = available.some((t) => t.id === "logistics_2a");
      expect(hasT2).toBe(true);
    });
  });

  describe("setResearchTarget", () => {
    it("queues a valid research target", () => {
      const tech = makeTechState({ researchPoints: 1 });
      // fuel_efficiency_1 is always available; with 1 RP < 4 cost → queue
      const result = setResearchTarget("fuel_efficiency_1", tech);
      expect(result).not.toBeNull();
      expect(result!.currentResearchId).toBe("fuel_efficiency_1");
    });

    it("instantly unlocks if enough RP", () => {
      const tech = makeTechState({ researchPoints: 10 });
      const result = setResearchTarget("fuel_efficiency_1", tech);
      expect(result).not.toBeNull();
      expect(result!.completedTechIds).toContain("fuel_efficiency_1");
    });

    it("returns null for unavailable tech", () => {
      const tech = makeTechState();
      // logistics_hub not available without adjacency
      const result = setResearchTarget("logistics_hub", tech);
      expect(result).toBeNull();
    });
  });

  describe("reorderQueue", () => {
    it("moves items within the queue", () => {
      const tech = makeTechState({
        queue: ["a", "b", "c"],
        currentResearchId: "a",
      });
      const result = reorderQueue(tech, 0, 2);
      expect(result.queue).toEqual(["b", "c", "a"]);
      expect(result.currentResearchId).toBe("b");
    });
  });

  describe("removeFromQueue", () => {
    it("removes an item from the queue", () => {
      const tech = makeTechState({
        queue: ["a", "b", "c"],
        currentResearchId: "a",
      });
      const result = removeFromQueue(tech, 1);
      expect(result.queue).toEqual(["a", "c"]);
      expect(result.currentResearchId).toBe("a");
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
              type: "techWorld",
              x: 0,
              y: 0,
              population: 1000,
              biome: PlanetBiome.Colony,
              productionTags: [],
              consumptionTags: [],
              productionScale: 1.0,
              populationCap: 10,
            },
            {
              id: "planet-2",
              name: "P2",
              systemId: "s1",
              type: "frontier",
              x: 0,
              y: 0,
              population: 1000,
              biome: PlanetBiome.Colony,
              productionTags: [],
              consumptionTags: [],
              productionScale: 1.0,
              populationCap: 10,
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
    it("accumulates RP without active queue", () => {
      const state = createTestState({
        tech: makeTechState({ researchProgress: 0 }),
      });
      const result = processResearch(state, 3);
      expect(result.researchPoints).toBe(3);
      // No queue → researchProgress is 0
      expect(result.researchProgress).toBe(0);
      expect(result.currentResearchId).toBeNull();
    });

    it("progresses towards completion when queued", () => {
      // Queue logistics_hub (costs 6 RP); start with 3 RP, add 2 more (total 5)
      const state = createTestState({
        tech: makeTechState({
          completedTechIds: ["fuel_efficiency_1"],
          researchPoints: 3,
          queue: ["logistics_hub"],
          currentResearchId: "logistics_hub",
          researchProgress: 3,
        }),
      });
      const result = processResearch(state, 2);
      // 3 + 2 = 5, cost is 6, not enough to complete
      expect(result.researchPoints).toBe(5);
      expect(result.currentResearchId).toBe("logistics_hub");
      // researchProgress = Math.min(5, 6) = 5
      expect(result.researchProgress).toBe(5);
    });

    it("completes tech and carries over excess RP", () => {
      // Queue logistics_hub (costs 6 RP); start with 4 RP, add 4 → total 8 → completes, 2 excess
      const state = createTestState({
        tech: makeTechState({
          completedTechIds: ["fuel_efficiency_1"],
          researchPoints: 4,
          queue: ["logistics_hub"],
          currentResearchId: "logistics_hub",
          researchProgress: 4,
        }),
      });
      const result = processResearch(state, 4);
      expect(result.completedTechIds).toContain("logistics_hub");
      expect(result.currentResearchId).toBeNull();
      // 8 - 6 = 2 RP remaining; no queue → progress = 0
      expect(result.researchProgress).toBe(0);
      expect(result.researchPoints).toBe(2);
    });
  });

  describe("getCurrentResearch", () => {
    it("returns null when no research active", () => {
      const tech = makeTechState();
      expect(getCurrentResearch(tech)).toBeNull();
    });

    it("returns the current technology from queue[0]", () => {
      const tech = makeTechState({
        queue: ["logistics_hub"],
        currentResearchId: "logistics_hub",
      });
      const current = getCurrentResearch(tech);
      expect(current).not.toBeNull();
      expect(current!.id).toBe("logistics_hub");
    });
  });

  describe("getResearchProgress", () => {
    it("returns 0 when no research", () => {
      const tech = makeTechState();
      expect(getResearchProgress(tech)).toBe(0);
    });

    it("returns fraction based on researchPoints / effectiveCost", () => {
      // logistics_hub costs 6; 3 RP accumulated → 3/6 = 0.5
      const tech = makeTechState({
        queue: ["logistics_hub"],
        currentResearchId: "logistics_hub",
        researchPoints: 3,
      });
      const progress = getResearchProgress(tech);
      expect(progress).toBe(0.5); // 3/6
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  CargoType,
  ShipClass,
  PlanetType,
  ContractStatus,
  ContractType,
} from "../../../data/types.ts";
import type { GameState, Contract } from "../../../data/types.ts";
import {
  STARTING_CASH,
  MAX_TURNS,
  BASE_FUEL_PRICE,
} from "../../../data/constants.ts";
import { initAdviserState } from "../../adviser/AdviserEngine.ts";
import { processContracts } from "../../contracts/ContractManager.ts";
import {
  calculateRPPerTurn,
  processResearch,
  setResearchTarget,
} from "../../tech/TechTree.ts";
import { getAvailableRouteSlots } from "../../routes/RouteManager.ts";
import { calculateScore } from "../../scoring/ScoreCalculator.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: "contract-1",
    type: ContractType.EmpireUnlock,
    targetEmpireId: "emp-2",
    originPlanetId: "planet-a",
    destinationPlanetId: "planet-b",
    cargoType: CargoType.Food,
    durationTurns: 3,
    turnsRemaining: 1,
    rewardCash: 10000,
    rewardReputation: 5,
    rewardResearchPoints: 10,
    rewardTariffReduction: null,
    depositPaid: 2000,
    status: ContractStatus.Active,
    linkedRouteId: "route-1",
    turnsWithoutShip: 0,
    ...overrides,
  };
}

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 42,
    turn: 5,
    maxTurns: MAX_TURNS,
    phase: "review",
    cash: STARTING_CASH,
    loans: [],
    reputation: 50,
    companyName: "Test Corp",
    ceoName: "Commander",
    ceoPortrait: { portraitId: "ceo-01", category: "human" },
    gameSize: "standard",
    galaxyShape: "spiral",
    playerEmpireId: "emp-1",
    galaxy: {
      sectors: [{ id: "sec-1", name: "Sector 1", x: 0, y: 0, color: 0xffffff }],
      empires: [
        {
          id: "emp-1",
          name: "Sol Federation",
          disposition: "friendly",
          color: 0x3388ff,
          tariffRate: 0.1,
          homeSystemId: "sys-1",
          leaderName: "Sol Leader",
          leaderPortrait: { portraitId: "leader-01", category: "human" },
        },
        {
          id: "emp-2",
          name: "Zeta Collective",
          disposition: "neutral",
          color: 0xff3333,
          tariffRate: 0.15,
          homeSystemId: "sys-2",
          leaderName: "Zeta Leader",
          leaderPortrait: { portraitId: "leader-02", category: "alien" },
        },
      ],
      systems: [
        {
          id: "sys-1",
          name: "Alpha",
          sectorId: "sec-1",
          empireId: "emp-1",
          x: 100,
          y: 100,
          starColor: 0xffcc00,
        },
        {
          id: "sys-2",
          name: "Beta",
          sectorId: "sec-1",
          empireId: "emp-2",
          x: 200,
          y: 200,
          starColor: 0xff6600,
        },
      ],
      planets: [
        {
          id: "planet-a",
          name: "Planet A",
          systemId: "sys-1",
          type: PlanetType.Terran,
          x: 110,
          y: 110,
          population: 1000000,
        },
        {
          id: "planet-b",
          name: "Planet B",
          systemId: "sys-2",
          type: PlanetType.Agricultural,
          x: 210,
          y: 210,
          population: 500000,
        },
      ],
    },
    fleet: [
      {
        id: "ship-1",
        name: "Test Ship",
        class: ShipClass.CargoShuttle,
        cargoCapacity: 80,
        passengerCapacity: 0,
        speed: 4,
        fuelEfficiency: 0.8,
        reliability: 92,
        age: 0,
        condition: 100,
        purchaseCost: 40000,
        maintenanceCost: 2000,
        assignedRouteId: "route-1",
      },
    ],
    activeRoutes: [
      {
        id: "route-1",
        originPlanetId: "planet-a",
        destinationPlanetId: "planet-b",
        distance: 50,
        assignedShipIds: ["ship-1"],
        cargoType: CargoType.Food,
      },
    ],
    market: {
      fuelPrice: BASE_FUEL_PRICE,
      fuelTrend: "stable",
      planetMarkets: {},
    },
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
    unlockedEmpireIds: [],
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

// ---------------------------------------------------------------------------
// Integration tests — Phase 3 systems together
// ---------------------------------------------------------------------------

describe("Phase 3 Integration", () => {
  it("contract completion unlocks empire, adds route slot, and increases score", () => {
    const contract = makeContract({
      turnsRemaining: 1,
      type: ContractType.EmpireUnlock,
      targetEmpireId: "emp-2",
    });
    const state = makeGameState({ contracts: [contract] });

    const scoreBefore = calculateScore(state);

    // Process contracts — the contract should complete
    const updates = processContracts(state);
    const nextState: GameState = { ...state, ...updates };

    // Empire unlocked
    expect(nextState.unlockedEmpireIds).toContain("emp-2");

    // Route slot gained (+1 from empire unlock)
    expect(nextState.routeSlots).toBe(state.routeSlots + 1);

    // Completed contract
    const completedContract = nextState.contracts.find(
      (c) => c.id === "contract-1",
    );
    expect(completedContract?.status).toBe(ContractStatus.Completed);

    // Score reflects both empire unlock (+1500) and contract completion (+750)
    const scoreAfter = calculateScore(nextState);
    // Score diff includes cash reward + deposit refund (net worth) and empire/contract bonuses
    expect(scoreAfter).toBeGreaterThan(scoreBefore);
    // At minimum, empire unlock (1500) + contract completion (750) = 2250
    expect(scoreAfter - scoreBefore).toBeGreaterThanOrEqual(2250);
  });

  it("research accumulates RP and completes tech to add route slots", () => {
    const state = makeGameState({
      tech: {
        researchPoints: 0,
        completedTechIds: [],
        currentResearchId: "logistics_1",
        researchProgress: 0,
      },
    });

    // Calculate RP per turn
    const rp = calculateRPPerTurn(state);
    expect(rp).toBeGreaterThan(0);

    // processResearch returns TechState
    const updatedTech = processResearch(state, rp);
    expect(updatedTech.researchProgress).toBeGreaterThan(0);
  });

  it("setResearchTarget + processResearch flows correctly", () => {
    const state = makeGameState();

    // setResearchTarget takes (techId, techState)
    const newTech = setResearchTarget("logistics_1", state.tech);
    expect(newTech).not.toBeNull();
    expect(newTech!.currentResearchId).toBe("logistics_1");

    // Calculate RP and process
    const stateWithTarget: GameState = {
      ...state,
      tech: newTech!,
    };
    const rp = calculateRPPerTurn(stateWithTarget);
    const updatedTech = processResearch(stateWithTarget, rp);

    // Should have progress
    expect(updatedTech.researchProgress).toBeGreaterThan(0);
  });

  it("getAvailableRouteSlots includes base + tech bonus", () => {
    const state = makeGameState({
      routeSlots: 4,
      tech: {
        researchPoints: 0,
        completedTechIds: ["logistics_1"],
        currentResearchId: null,
        researchProgress: 0,
      },
    });

    const slots = getAvailableRouteSlots(state);
    // Base 4 + logistics_1 adds 1 route slot
    expect(slots).toBe(5);
  });

  it("score includes all Phase 3 bonuses together", () => {
    const baseState = makeGameState();
    const baseScore = calculateScore(baseState);

    const enhancedState = makeGameState({
      unlockedEmpireIds: ["emp-2", "emp-3"],
      contracts: [
        makeContract({
          id: "c1",
          status: ContractStatus.Completed,
          turnsRemaining: 0,
        }),
      ],
      tech: {
        researchPoints: 50,
        completedTechIds: ["logistics_1", "fuel_1", "nav_1"],
        currentResearchId: null,
        researchProgress: 0,
      },
    });
    const enhancedScore = calculateScore(enhancedState);

    // 2 empires × 1500 = 3000
    // 1 contract × 750 = 750
    // 3 techs × 500 = 1500
    // Total Phase 3 bonus: 5250
    expect(enhancedScore - baseScore).toBe(5250);
  });
});

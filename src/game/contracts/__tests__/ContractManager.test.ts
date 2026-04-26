import { describe, it, expect } from "vitest";
import {
  acceptContract,
  abandonContract,
  processContracts,
} from "../ContractManager.ts";
import type { GameState, Contract, ActiveRoute } from "../../../data/types.ts";
import {
  ContractType,
  ContractStatus,
  CargoType,
} from "../../../data/types.ts";
import { initAdviserState } from "../../adviser/AdviserEngine.ts";
import { CONTRACT_UNASSIGNED_SHIP_LIMIT } from "../../../data/constants.ts";

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
    galaxy: {
      sectors: [],
      empires: [],
      systems: [
        {
          id: "system-1",
          name: "S1",
          sectorId: "sector-1",
          empireId: "empire-1",
          x: 0,
          y: 0,
          starColor: 0xffffff,
        },
        {
          id: "system-2",
          name: "S2",
          sectorId: "sector-1",
          empireId: "empire-1",
          x: 10,
          y: 0,
          starColor: 0xffffff,
        },
      ],
      planets: [
        {
          id: "planet-1",
          name: "P1",
          systemId: "system-1",
          type: "terran",
          x: 0,
          y: 0,
          population: 1000,
        },
        {
          id: "planet-2",
          name: "P2",
          systemId: "system-2",
          type: "industrial",
          x: 10,
          y: 0,
          population: 1000,
        },
      ],
    },
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

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: "contract-t3-1",
    type: ContractType.TradeAlliance,
    targetEmpireId: null,
    originPlanetId: "planet-1",
    destinationPlanetId: "planet-2",
    cargoType: CargoType.Food,
    durationTurns: 5,
    turnsRemaining: 5,
    rewardCash: 10000,
    rewardReputation: 5,
    rewardResearchPoints: 2,
    rewardTariffReduction: null,
    depositPaid: 2000,
    status: ContractStatus.Available,
    linkedRouteId: null,
    turnsWithoutShip: 0,
    ...overrides,
  };
}

describe("Contract Lifecycle", () => {
  describe("acceptContract", () => {
    it("accepts an available contract", () => {
      const contract = makeContract();
      const state = createTestState({
        contracts: [contract],
        cash: 100000,
      });

      const result = acceptContract("contract-t3-1", state);
      expect(result).not.toBeNull();
      expect(result!.cash).toBe(100000 - 2000); // deposit deducted
      expect(result!.contracts![0].status).toBe(ContractStatus.Active);
      expect(result!.contracts![0].linkedRouteId).toBeTruthy();
      expect(result!.activeRoutes).toHaveLength(1);
    });

    it("returns null for non-existent contract", () => {
      const state = createTestState();
      expect(acceptContract("nonexistent", state)).toBeNull();
    });

    it("returns null for non-available contract", () => {
      const contract = makeContract({ status: ContractStatus.Active });
      const state = createTestState({ contracts: [contract] });
      expect(acceptContract("contract-t3-1", state)).toBeNull();
    });
  });

  describe("abandonContract", () => {
    it("fails an active contract and applies penalty", () => {
      const contract = makeContract({
        status: ContractStatus.Active,
        linkedRouteId: "route-1",
      });
      const state = createTestState({ contracts: [contract] });

      const result = abandonContract("contract-t3-1", state);
      expect(result).not.toBeNull();
      expect(result!.contracts![0].status).toBe(ContractStatus.Failed);
      expect(result!.reputation).toBeLessThan(state.reputation);
    });

    it("returns null for non-active contract", () => {
      const contract = makeContract({ status: ContractStatus.Available });
      const state = createTestState({ contracts: [contract] });
      expect(abandonContract("contract-t3-1", state)).toBeNull();
    });
  });

  describe("processContracts", () => {
    it("ticks down turnsRemaining for active contracts with ships", () => {
      const contract = makeContract({
        status: ContractStatus.Active,
        linkedRouteId: "route-1",
        turnsRemaining: 3,
      });
      const route: ActiveRoute = {
        id: "route-1",
        originPlanetId: "planet-1",
        destinationPlanetId: "planet-2",
        distance: 10,
        cargoType: CargoType.Food,
        assignedShipIds: ["ship-1"],
      };
      const state = createTestState({
        contracts: [contract],
        activeRoutes: [route],
      });

      const result = processContracts(state);
      const updated = result.contracts![0];
      expect(updated.turnsRemaining).toBe(2);
      expect(updated.status).toBe(ContractStatus.Active);
    });

    it("completes a contract when turnsRemaining reaches zero", () => {
      const contract = makeContract({
        status: ContractStatus.Active,
        linkedRouteId: "route-1",
        turnsRemaining: 1,
        rewardCash: 10000,
        depositPaid: 2000,
      });
      const route: ActiveRoute = {
        id: "route-1",
        originPlanetId: "planet-1",
        destinationPlanetId: "planet-2",
        distance: 10,
        cargoType: CargoType.Food,
        assignedShipIds: ["ship-1"],
      };
      const state = createTestState({
        contracts: [contract],
        activeRoutes: [route],
        cash: 50000,
      });

      const result = processContracts(state);
      expect(result.contracts![0].status).toBe(ContractStatus.Completed);
      expect(result.cash).toBe(50000 + 10000 + 2000); // reward + deposit refund
    });

    it("increments turnsWithoutShip when no ship assigned", () => {
      const contract = makeContract({
        status: ContractStatus.Active,
        linkedRouteId: "route-1",
        turnsRemaining: 5,
        turnsWithoutShip: 0,
      });
      const route: ActiveRoute = {
        id: "route-1",
        originPlanetId: "planet-1",
        destinationPlanetId: "planet-2",
        distance: 10,
        cargoType: CargoType.Food,
        assignedShipIds: [], // no ship
      };
      const state = createTestState({
        contracts: [contract],
        activeRoutes: [route],
      });

      const result = processContracts(state);
      expect(result.contracts![0].turnsWithoutShip).toBe(1);
    });

    it("fails contract when turnsWithoutShip exceeds limit", () => {
      const contract = makeContract({
        status: ContractStatus.Active,
        linkedRouteId: "route-1",
        turnsRemaining: 5,
        turnsWithoutShip: CONTRACT_UNASSIGNED_SHIP_LIMIT - 1,
      });
      const route: ActiveRoute = {
        id: "route-1",
        originPlanetId: "planet-1",
        destinationPlanetId: "planet-2",
        distance: 10,
        cargoType: CargoType.Food,
        assignedShipIds: [], // no ship
      };
      const state = createTestState({
        contracts: [contract],
        activeRoutes: [route],
      });

      const result = processContracts(state);
      expect(result.contracts![0].status).toBe(ContractStatus.Failed);
    });

    it("fails contract when linked route is deleted", () => {
      const contract = makeContract({
        status: ContractStatus.Active,
        linkedRouteId: "deleted-route",
        turnsRemaining: 5,
      });
      const state = createTestState({
        contracts: [contract],
        activeRoutes: [], // route was deleted
      });

      const result = processContracts(state);
      expect(result.contracts![0].status).toBe(ContractStatus.Failed);
    });

    it("empire unlock contract adds empire and route slot on completion", () => {
      const contract = makeContract({
        type: ContractType.EmpireUnlock,
        targetEmpireId: "empire-2",
        status: ContractStatus.Active,
        linkedRouteId: "route-1",
        turnsRemaining: 1,
      });
      const route: ActiveRoute = {
        id: "route-1",
        originPlanetId: "planet-1",
        destinationPlanetId: "planet-2",
        distance: 10,
        cargoType: CargoType.Food,
        assignedShipIds: ["ship-1"],
      };
      const state = createTestState({
        contracts: [contract],
        activeRoutes: [route],
        routeSlots: 4,
        unlockedEmpireIds: ["empire-1"],
      });

      const result = processContracts(state);
      expect(result.unlockedEmpireIds).toContain("empire-2");
      expect(result.routeSlots).toBe(5); // +1 for empire unlock
    });
  });
});

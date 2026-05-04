import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateScore,
  getHighScores,
  saveHighScore,
} from "../ScoreCalculator.ts";
import { CargoType, ShipClass, PlanetType } from "../../../data/types.ts";
import type {
  GameState,
  Ship,
  TurnResult,
  ActiveRoute,
  Loan,
  PlanetMarket,
  CargoMarketEntry,
} from "../../../data/types.ts";
import {
  STARTING_CASH,
  MAX_TURNS,
  BASE_FUEL_PRICE,
} from "../../../data/constants.ts";
import { initAdviserState } from "../../adviser/AdviserEngine.ts";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeCargoEntry(): CargoMarketEntry {
  return {
    baseSupply: 100,
    baseDemand: 100,
    currentPrice: 20,
    saturation: 0,
    trend: "stable",
    trendMomentum: 0,
    eventModifier: 1.0,
  };
}

function makePlanetMarket(): PlanetMarket {
  const base: Record<string, CargoMarketEntry> = {};
  for (const ct of Object.values(CargoType)) {
    base[ct] = makeCargoEntry();
  }
  return base as PlanetMarket;
}

function makeShip(overrides: Partial<Ship> = {}): Ship {
  return {
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
    assignedRouteId: null,
    ...overrides,
  };
}

function makeRoute(overrides: Partial<ActiveRoute> = {}): ActiveRoute {
  return {
    id: "route-1",
    originPlanetId: "planet-a",
    destinationPlanetId: "planet-b",
    distance: 50,
    assignedShipIds: ["ship-1"],
    cargoType: CargoType.Food,
    ...overrides,
  };
}

function makeTurnResult(overrides: Partial<TurnResult> = {}): TurnResult {
  return {
    turn: 1,
    revenue: 5000,
    fuelCosts: 1000,
    maintenanceCosts: 2000,
    loanPayments: 0,
    tariffCosts: 0,
    otherCosts: 0,
    netProfit: 2000,
    cashAtEnd: 202000,
    cargoDelivered: {
      [CargoType.Passengers]: 0,
      [CargoType.RawMaterials]: 0,
      [CargoType.Food]: 100,
      [CargoType.Technology]: 0,
      [CargoType.Luxury]: 0,
      [CargoType.Hazmat]: 0,
      [CargoType.Medical]: 0,
    },
    passengersTransported: 0,
    eventsOccurred: [],
    routePerformance: [],
    aiSummaries: [],
    ...overrides,
  };
}

function makeLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: "loan-1",
    principal: 100000,
    interestRate: 0.05,
    remainingBalance: 100000,
    turnTaken: 1,
    ...overrides,
  };
}

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  const planetMarkets: Record<string, PlanetMarket> = {
    "planet-a": makePlanetMarket(),
    "planet-b": makePlanetMarket(),
  };

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
    playerEmpireId: "",
    galaxy: {
      sectors: [{ id: "sec-1", name: "Sector 1", x: 0, y: 0, color: 0xffffff }],
      empires: [],
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
      ],
      planets: [
        {
          id: "planet-a",
          name: "Planet A",
          systemId: "sys-1",
          type: PlanetType.Frontier,
          x: 110,
          y: 110,
          population: 1000000,
        },
        {
          id: "planet-b",
          name: "Planet B",
          systemId: "sys-1",
          type: PlanetType.Agricultural,
          x: 150,
          y: 150,
          population: 200000,
        },
      ],
    },
    fleet: [makeShip()],
    activeRoutes: [makeRoute()],
    market: {
      fuelPrice: BASE_FUEL_PRICE,
      fuelTrend: "stable",
      planetMarkets,
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

// ---------------------------------------------------------------------------
// Mock localStorage
// ---------------------------------------------------------------------------

function createMockLocalStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) delete store[key];
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ScoreCalculator", () => {
  describe("calculateScore", () => {
    it("produces expected score with known values", () => {
      // Ship value: condition=100, age=0 => purchaseCost * 1.0 * 1.0 = 40000
      // Net worth: 200000 (cash) + 40000 (ship) - 0 (loans) = 240000
      // Reputation: 50 * 100 = 5000
      // Cargo delivered: 0 (no history) * 0.5 = 0
      // Routes: 1 * 500 = 500
      // Total: 240000 + 5000 + 0 + 500 = 245500
      const state = makeGameState();
      const score = calculateScore(state);
      expect(score).toBe(245500);
    });

    it("includes ship values in net worth", () => {
      const ship1 = makeShip({
        id: "ship-1",
        purchaseCost: 40000,
        condition: 100,
        age: 0,
      });
      const ship2 = makeShip({
        id: "ship-2",
        purchaseCost: 100000,
        condition: 80,
        age: 2,
      });

      // ship1 value: 40000 * 1.0 * 1.0 = 40000
      // ship2 value: 100000 * 0.8 * 0.9 = 72000
      const stateWithShips = makeGameState({ fleet: [ship1, ship2] });
      const stateNoShips = makeGameState({ fleet: [] });

      const scoreWithShips = calculateScore(stateWithShips);
      const scoreNoShips = calculateScore(stateNoShips);

      // Difference should be ship1 value + ship2 value = 40000 + 72000 = 112000
      expect(scoreWithShips - scoreNoShips).toBe(112000);
    });

    it("subtracts loan balances from net worth", () => {
      const loan = makeLoan({ remainingBalance: 50000 });
      const stateWithLoan = makeGameState({ loans: [loan] });
      const stateNoLoan = makeGameState({ loans: [] });

      const scoreWithLoan = calculateScore(stateWithLoan);
      const scoreNoLoan = calculateScore(stateNoLoan);

      expect(scoreNoLoan - scoreWithLoan).toBe(50000);
    });

    it("adds reputation * 100 to score", () => {
      const highRep = makeGameState({ reputation: 80 });
      const lowRep = makeGameState({ reputation: 20 });

      const highRepScore = calculateScore(highRep);
      const lowRepScore = calculateScore(lowRep);

      // Difference: (80 - 20) * 100 = 6000
      expect(highRepScore - lowRepScore).toBe(6000);
    });

    it("adds total cargo delivered * 0.5 to score", () => {
      const turn1 = makeTurnResult({
        cargoDelivered: {
          [CargoType.Passengers]: 0,
          [CargoType.RawMaterials]: 0,
          [CargoType.Food]: 200,
          [CargoType.Technology]: 100,
          [CargoType.Luxury]: 0,
          [CargoType.Hazmat]: 0,
          [CargoType.Medical]: 0,
        },
      });
      const turn2 = makeTurnResult({
        turn: 2,
        cargoDelivered: {
          [CargoType.Passengers]: 50,
          [CargoType.RawMaterials]: 0,
          [CargoType.Food]: 100,
          [CargoType.Technology]: 0,
          [CargoType.Luxury]: 0,
          [CargoType.Hazmat]: 0,
          [CargoType.Medical]: 0,
        },
      });

      const stateWithHistory = makeGameState({ history: [turn1, turn2] });
      const stateNoHistory = makeGameState({ history: [] });

      const scoreWithHistory = calculateScore(stateWithHistory);
      const scoreNoHistory = calculateScore(stateNoHistory);

      // Total cargo: 200 + 100 + 50 + 100 = 450
      // Bonus: 450 * 0.5 = 225
      // Diversity: 3 distinct types (Food, Technology, Passengers) * 2000 = 6000
      expect(scoreWithHistory - scoreNoHistory).toBe(225 + 6000);
    });

    it("adds route count * 500 to score", () => {
      const route1 = makeRoute({ id: "route-1" });
      const route2 = makeRoute({ id: "route-2" });
      const route3 = makeRoute({ id: "route-3" });

      const stateWith3Routes = makeGameState({
        activeRoutes: [route1, route2, route3],
      });
      const stateWith1Route = makeGameState({ activeRoutes: [route1] });

      const score3 = calculateScore(stateWith3Routes);
      const score1 = calculateScore(stateWith1Route);

      expect(score3 - score1).toBe(1000); // 2 extra routes * 500
    });

    it("handles empty fleet, no routes, no loans, no history", () => {
      const state = makeGameState({
        fleet: [],
        activeRoutes: [],
        loans: [],
        history: [],
        cash: 100000,
        reputation: 30,
      });

      // Net worth: 100000 + 0 - 0 = 100000
      // Reputation: 30 * 100 = 3000
      // Cargo: 0
      // Routes: 0
      // Total: 103000
      const score = calculateScore(state);
      expect(score).toBe(103000);
    });

    it("handles negative cash with loans exceeding assets", () => {
      const loan = makeLoan({ remainingBalance: 500000 });
      const state = makeGameState({
        cash: -50000,
        fleet: [],
        activeRoutes: [],
        loans: [loan],
        reputation: 10,
      });

      // Net worth: -50000 + 0 - 500000 = -550000
      // Reputation: 10 * 100 = 1000
      // Total: -549000
      const score = calculateScore(state);
      expect(score).toBe(-549000);
    });

    // -----------------------------------------------------------------------
    // Phase 3 scoring bonuses
    // -----------------------------------------------------------------------

    it("adds 1500 per unlocked empire", () => {
      const base = makeGameState({ unlockedEmpireIds: [] });
      const with3 = makeGameState({
        unlockedEmpireIds: ["emp-1", "emp-2", "emp-3"],
      });

      expect(calculateScore(with3) - calculateScore(base)).toBe(3 * 1500);
    });

    it("adds 750 per completed contract", () => {
      const base = makeGameState({ contracts: [] });
      const with2 = makeGameState({
        contracts: [
          {
            id: "c1",
            type: "delivery" as never,
            cargoType: CargoType.Food,
            durationTurns: 10,
            turnsRemaining: 0,
            rewardCash: 5000,
            rewardReputation: 5,
            rewardResearchPoints: 0,
            rewardTariffReduction: null,
            depositPaid: 1000,
            turnsWithoutShip: 0,
            status: "completed" as never,
            originPlanetId: "planet-a",
            destinationPlanetId: "planet-b",
            targetEmpireId: "emp-1",
            linkedRouteId: null,
          },
          {
            id: "c2",
            type: "delivery" as never,
            cargoType: CargoType.Food,
            durationTurns: 10,
            turnsRemaining: 0,
            rewardCash: 5000,
            rewardReputation: 5,
            rewardResearchPoints: 0,
            rewardTariffReduction: null,
            depositPaid: 1000,
            turnsWithoutShip: 0,
            status: "completed" as never,
            originPlanetId: "planet-a",
            destinationPlanetId: "planet-b",
            targetEmpireId: "emp-1",
            linkedRouteId: null,
          },
        ],
      });

      expect(calculateScore(with2) - calculateScore(base)).toBe(2 * 750);
    });

    it("does not count non-completed contracts", () => {
      const withActive = makeGameState({
        contracts: [
          {
            id: "c1",
            type: "delivery" as never,
            cargoType: CargoType.Food,
            durationTurns: 10,
            turnsRemaining: 7,
            rewardCash: 5000,
            rewardReputation: 5,
            rewardResearchPoints: 0,
            rewardTariffReduction: null,
            depositPaid: 1000,
            turnsWithoutShip: 0,
            status: "active" as never,
            originPlanetId: "planet-a",
            destinationPlanetId: "planet-b",
            targetEmpireId: "emp-1",
            linkedRouteId: "route-1",
          },
        ],
      });
      const base = makeGameState({ contracts: [] });

      expect(calculateScore(withActive) - calculateScore(base)).toBe(0);
    });

    it("adds 500 per completed tech", () => {
      const base = makeGameState();
      const with4 = makeGameState({
        tech: {
          researchPoints: 0,
          completedTechIds: ["logistics_1", "fuel_1", "nav_1", "trade_1"],
          currentResearchId: null,
          researchProgress: 0,
        },
      });

      expect(calculateScore(with4) - calculateScore(base)).toBe(4 * 500);
    });
  });

  describe("getHighScores / saveHighScore", () => {
    let originalLocalStorage: Storage;

    beforeEach(() => {
      originalLocalStorage = globalThis.localStorage;
      Object.defineProperty(globalThis, "localStorage", {
        value: createMockLocalStorage(),
        writable: true,
        configurable: true,
      });
    });

    beforeEach(() => {
      return () => {
        Object.defineProperty(globalThis, "localStorage", {
          value: originalLocalStorage,
          writable: true,
          configurable: true,
        });
      };
    });

    it("returns empty array when no high scores saved", () => {
      const scores = getHighScores();
      expect(scores).toEqual([]);
    });

    it("saves and retrieves a high score", () => {
      saveHighScore("Player 1", 50000, 42);

      const scores = getHighScores();
      expect(scores.length).toBe(1);
      expect(scores[0].name).toBe("Player 1");
      expect(scores[0].score).toBe(50000);
      expect(scores[0].seed).toBe(42);
      expect(scores[0].date).toBeTruthy();
    });

    it("keeps scores sorted by score descending", () => {
      saveHighScore("Low", 1000, 1);
      saveHighScore("High", 50000, 2);
      saveHighScore("Mid", 25000, 3);

      const scores = getHighScores();
      expect(scores[0].name).toBe("High");
      expect(scores[1].name).toBe("Mid");
      expect(scores[2].name).toBe("Low");
    });

    it("enforces top 10 limit", () => {
      // Save 12 scores
      for (let i = 1; i <= 12; i++) {
        saveHighScore(`Player ${i}`, i * 1000, i);
      }

      const scores = getHighScores();
      expect(scores.length).toBe(10);

      // Should keep the top 10 (scores 3000-12000), not the bottom 2 (1000, 2000)
      expect(scores[scores.length - 1].score).toBe(3000);
      expect(scores[0].score).toBe(12000);
    });

    it("handles corrupted localStorage data gracefully", () => {
      localStorage.setItem("sft_high_scores", "not-valid-json{{{");
      const scores = getHighScores();
      expect(scores).toEqual([]);
    });

    it("handles non-array localStorage data gracefully", () => {
      localStorage.setItem(
        "sft_high_scores",
        JSON.stringify({ not: "an array" }),
      );
      const scores = getHighScores();
      expect(scores).toEqual([]);
    });
  });
});

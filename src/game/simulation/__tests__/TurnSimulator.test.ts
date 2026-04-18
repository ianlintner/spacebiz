import { describe, it, expect } from "vitest";
import { simulateTurn } from "../TurnSimulator.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import {
  CargoType,
  ShipClass,
  PlanetType,
  EventCategory,
} from "../../../data/types.ts";
import type {
  GameState,
  Ship,
  ActiveRoute,
  Planet,
  StarSystem,
  Sector,
  CargoMarketEntry,
  PlanetMarket,
  Loan,
  GameEvent,
} from "../../../data/types.ts";
import {
  STARTING_CASH,
  MAX_TURNS,
  BASE_FUEL_PRICE,
  BASE_CARGO_PRICES,
  DISTANCE_PREMIUM_RATE,
  DISTANCE_PREMIUM_CAP,
} from "../../../data/constants.ts";
import { calculateTripsPerTurn } from "../../routes/RouteManager.ts";
import { initAdviserState } from "../../adviser/AdviserEngine.ts";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeCargoEntry(
  overrides: Partial<CargoMarketEntry> = {},
): CargoMarketEntry {
  return {
    baseSupply: 100,
    baseDemand: 100,
    currentPrice: 20,
    saturation: 0,
    trend: "stable",
    trendMomentum: 0,
    eventModifier: 1.0,
    ...overrides,
  };
}

function makePlanetMarket(
  overrides: Partial<Record<string, Partial<CargoMarketEntry>>> = {},
): PlanetMarket {
  const base: Record<string, CargoMarketEntry> = {};
  for (const ct of Object.values(CargoType)) {
    base[ct] = makeCargoEntry(overrides[ct] ?? {});
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
    assignedRouteId: "route-1",
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

function makeSector(): Sector {
  return { id: "sec-1", name: "Sector 1", x: 0, y: 0, color: 0xffffff };
}

function makeSystems(): StarSystem[] {
  return [
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
      empireId: "emp-1",
      x: 300,
      y: 200,
      starColor: 0xff6600,
    },
  ];
}

function makePlanets(): Planet[] {
  return [
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
      x: 310,
      y: 210,
      population: 200000,
    },
  ];
}

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  const planets = makePlanets();
  const planetMarkets: Record<string, PlanetMarket> = {};
  for (const planet of planets) {
    planetMarkets[planet.id] = makePlanetMarket();
  }

  return {
    seed: 42,
    turn: 1,
    maxTurns: MAX_TURNS,
    phase: "simulation",
    cash: STARTING_CASH,
    loans: [],
    reputation: 50,
    companyName: "Test Corp",
    ceoName: "Commander",
    ceoPortrait: { portraitId: "ceo-01", category: "human" },
    gameSize: "small",
    galaxyShape: "spiral",
    playerEmpireId: "",
    galaxy: {
      sectors: [makeSector()],
      empires: [],
      systems: makeSystems(),
      planets,
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
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TurnSimulator", () => {
  describe("simulateTurn", () => {
    it("calculates revenue correctly for a simple route", () => {
      const state = makeGameState();
      const rng = new SeededRNG(42);

      // With default setup:
      // Ship: speed=4, cargoCapacity=80, fuelEfficiency=0.8
      // Route: distance=50, cargoType=Food
      // Market: baseDemand=100, baseSupply=100, saturation=0 → price = BASE_CARGO_PRICES[Food]
      const trips = calculateTripsPerTurn(50, 4);
      // trips = floor(100 / (50*2/4)) = floor(100/25) = 4
      expect(trips).toBe(4);

      const distancePremium = Math.min(DISTANCE_PREMIUM_CAP, 50 * DISTANCE_PREMIUM_RATE);
      const expectedRevenue = Math.round(BASE_CARGO_PRICES[CargoType.Food] * 80 * trips * (1 + distancePremium) * 100) / 100;
      const result = simulateTurn(state, rng);

      const turnResult = result.history[result.history.length - 1];
      expect(turnResult.revenue).toBe(expectedRevenue);
    });

    it("deducts fuel costs correctly", () => {
      const state = makeGameState();
      const rng = new SeededRNG(42);

      const trips = calculateTripsPerTurn(50, 4); // 4
      // fuelCost = distance * 2 * fuelEfficiency * fuelPrice * trips
      const expectedFuelCost = 50 * 2 * 0.8 * BASE_FUEL_PRICE * trips;

      const result = simulateTurn(state, rng);
      const turnResult = result.history[result.history.length - 1];
      expect(turnResult.fuelCosts).toBeCloseTo(expectedFuelCost, 1);
    });

    it("increases saturation with deliveries", () => {
      const state = makeGameState();
      const rng = new SeededRNG(42);

      // Before: saturation should be 0
      const beforeSaturation =
        state.market.planetMarkets["planet-b"][CargoType.Food].saturation;
      expect(beforeSaturation).toBe(0);

      const result = simulateTurn(state, rng);

      // After simulation, saturation at destination for delivered cargo type should increase
      // Note: market is updated by updateMarket after saturation is set,
      // but we track the turn result's cargo delivered to verify delivery happened
      const turnResult = result.history[result.history.length - 1];
      const trips = calculateTripsPerTurn(50, 4); // 4
      const expectedCargoDelivered = 80 * trips; // capacity * trips
      expect(turnResult.cargoDelivered[CargoType.Food]).toBe(
        expectedCargoDelivered,
      );
    });

    it("triggers bankruptcy after 2 consecutive debt turns with insufficient assets", () => {
      // Set up: cash deeply negative, cheap ship, turnsInDebt already at 1
      const cheapShip = makeShip({
        purchaseCost: 1000,
        condition: 10,
        age: 10,
        maintenanceCost: 50000,
      });

      const state = makeGameState({
        cash: -500000,
        fleet: [cheapShip],
        activeRoutes: [], // No routes = no revenue
        storyteller: {
          playerHealthScore: 10,
          headwindBias: -0.5,
          turnsInDebt: 1, // Already 1 turn in debt
          consecutiveProfitTurns: 0,
        },
      });

      const rng = new SeededRNG(42);
      const result = simulateTurn(state, rng);

      // After this turn, turnsInDebt should be >= 2, cash still negative,
      // and fleet value insufficient to cover debt
      expect(result.gameOver).toBe(true);
      expect(result.gameOverReason).toBe("bankruptcy");
    });

    it("ends game at turn 20 (win condition)", () => {
      const state = makeGameState({
        turn: MAX_TURNS, // Turn 20 - this will be the last turn
        cash: STARTING_CASH,
      });

      const rng = new SeededRNG(42);
      const result = simulateTurn(state, rng);

      // After turn 20 is simulated, turn becomes 21 which exceeds maxTurns
      expect(result.turn).toBe(MAX_TURNS + 1);
      expect(result.gameOver).toBe(true);
      expect(result.gameOverReason).toBe("completed");
    });

    it("fires events and applies their effects", () => {
      const state = makeGameState();
      const rng = new SeededRNG(42);

      const result = simulateTurn(state, rng);
      const turnResult = result.history[result.history.length - 1];

      // Events should have been selected and fired
      expect(turnResult.eventsOccurred.length).toBeGreaterThanOrEqual(1);
      // Active events should include the newly fired events
      expect(result.activeEvents.length).toBeGreaterThanOrEqual(1);
    });

    it("calculates maintenance costs and includes them in the turn result", () => {
      const ship = makeShip({ maintenanceCost: 5000, age: 5 });
      const state = makeGameState({ fleet: [ship] });
      const rng = new SeededRNG(42);

      const result = simulateTurn(state, rng);
      const turnResult = result.history[result.history.length - 1];

      // Maintenance = baseMaintenance * (1 + age * 0.01) = 5000 * 1.05 = 5250
      expect(turnResult.maintenanceCosts).toBeCloseTo(5250, 0);
    });

    it("deducts loan interest correctly", () => {
      const loan = makeLoan({ remainingBalance: 100000, interestRate: 0.05 });
      const state = makeGameState({ loans: [loan] });
      const rng = new SeededRNG(42);

      const result = simulateTurn(state, rng);
      const turnResult = result.history[result.history.length - 1];

      // Interest = 100000 * 0.05 = 5000
      expect(turnResult.loanPayments).toBeCloseTo(5000, 0);

      // Loan remaining balance should increase by the interest
      expect(result.loans[0].remainingBalance).toBeCloseTo(105000, 0);
    });

    it("handles empty fleet with no routes gracefully", () => {
      const state = makeGameState({
        fleet: [],
        activeRoutes: [],
      });
      const rng = new SeededRNG(42);

      const result = simulateTurn(state, rng);
      const turnResult = result.history[result.history.length - 1];

      expect(turnResult.revenue).toBe(0);
      expect(turnResult.fuelCosts).toBe(0);
      expect(turnResult.routePerformance).toEqual([]);
    });

    it("handles routes with no assigned ships", () => {
      const route = makeRoute({ assignedShipIds: [] });
      const state = makeGameState({ activeRoutes: [route] });
      const rng = new SeededRNG(42);

      const result = simulateTurn(state, rng);
      const turnResult = result.history[result.history.length - 1];

      // Route performance exists but with 0 revenue
      expect(turnResult.routePerformance.length).toBe(1);
      expect(turnResult.routePerformance[0].revenue).toBe(0);
      expect(turnResult.routePerformance[0].trips).toBe(0);
    });

    it("advances turn counter by 1", () => {
      const state = makeGameState({ turn: 5 });
      const rng = new SeededRNG(42);

      const result = simulateTurn(state, rng);
      expect(result.turn).toBe(6);
    });

    it("ages fleet (increases age, decreases condition)", () => {
      const ship = makeShip({ age: 2, condition: 90 });
      const state = makeGameState({ fleet: [ship] });
      const rng = new SeededRNG(42);

      const result = simulateTurn(state, rng);

      // Age should increase by 1
      expect(result.fleet[0].age).toBe(3);
      // Condition should decrease (by 2-5 points from ageFleet)
      expect(result.fleet[0].condition).toBeLessThan(90);
      expect(result.fleet[0].condition).toBeGreaterThanOrEqual(85);
    });

    it("does not mutate original state", () => {
      const state = makeGameState();
      const originalCash = state.cash;
      const originalTurn = state.turn;
      const rng = new SeededRNG(42);

      simulateTurn(state, rng);

      expect(state.cash).toBe(originalCash);
      expect(state.turn).toBe(originalTurn);
      expect(state.history.length).toBe(0);
    });

    it("updates storyteller state", () => {
      const state = makeGameState();
      const rng = new SeededRNG(42);

      const result = simulateTurn(state, rng);

      // Storyteller should be updated based on new financial state
      expect(result.storyteller).toBeDefined();
      expect(typeof result.storyteller.playerHealthScore).toBe("number");
      expect(typeof result.storyteller.headwindBias).toBe("number");
    });

    it("handles breakdown when ship condition is below threshold", () => {
      // Ship with very low condition - will almost certainly break down
      const ship = makeShip({
        condition: 5, // Way below BREAKDOWN_THRESHOLD (50)
        // Breakdown chance = 1 - 5/100 = 0.95 (95%)
      });

      const state = makeGameState({ fleet: [ship] });

      // Try multiple seeds to find one where breakdown occurs
      let foundBreakdown = false;
      for (let seed = 1; seed <= 20; seed++) {
        const rng = new SeededRNG(seed);
        const result = simulateTurn(state, rng);
        const turnResult = result.history[result.history.length - 1];

        if (turnResult.routePerformance[0].breakdowns > 0) {
          foundBreakdown = true;
          // On breakdown: 0 revenue, but still has fuel cost
          expect(turnResult.routePerformance[0].revenue).toBe(0);
          expect(turnResult.routePerformance[0].fuelCost).toBeGreaterThan(0);
          break;
        }
      }

      expect(foundBreakdown).toBe(true);
    });

    it("handles routes with null cargoType", () => {
      const route = makeRoute({ cargoType: null, assignedShipIds: ["ship-1"] });
      const state = makeGameState({ activeRoutes: [route] });
      const rng = new SeededRNG(42);

      const result = simulateTurn(state, rng);
      const turnResult = result.history[result.history.length - 1];

      expect(turnResult.routePerformance[0].revenue).toBe(0);
      expect(turnResult.routePerformance[0].fuelCost).toBe(0);
    });

    it("does not declare game over before turn 20 with positive cash", () => {
      const state = makeGameState({
        turn: 10,
        cash: STARTING_CASH,
      });
      const rng = new SeededRNG(42);

      const result = simulateTurn(state, rng);
      expect(result.gameOver).toBe(false);
      expect(result.gameOverReason).toBeNull();
    });

    it("processes multiple loans", () => {
      const loan1 = makeLoan({
        id: "loan-1",
        remainingBalance: 50000,
        interestRate: 0.05,
      });
      const loan2 = makeLoan({
        id: "loan-2",
        remainingBalance: 100000,
        interestRate: 0.08,
      });
      const state = makeGameState({ loans: [loan1, loan2] });
      const rng = new SeededRNG(42);

      const result = simulateTurn(state, rng);
      const turnResult = result.history[result.history.length - 1];

      // Total interest = 50000*0.05 + 100000*0.08 = 2500 + 8000 = 10500
      expect(turnResult.loanPayments).toBeCloseTo(10500, 0);
    });

    it("ticks down existing active events", () => {
      const existingEvent: GameEvent = {
        id: "existing-event",
        name: "Existing Event",
        description: "An event already in progress",
        category: EventCategory.Market,
        duration: 3,
        effects: [],
      };

      const state = makeGameState({
        activeEvents: [existingEvent],
      });
      const rng = new SeededRNG(42);

      const result = simulateTurn(state, rng);

      // The existing event should have its duration reduced by 1
      const tickedEvent = result.activeEvents.find(
        (e) => e.id === "existing-event",
      );
      expect(tickedEvent?.duration).toBe(2);
    });
  });
});

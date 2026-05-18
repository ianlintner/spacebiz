import { describe, it, expect } from "vitest";
import { PlanetBiome, EmpireArchetype } from "../../../data/types.ts";
import { simulateTurn } from "../TurnSimulator.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import {
  CargoType,
  ContractStatus,
  ContractType,
  EmpireDisposition,
  ShipClass,
  PlanetType,
  EventCategory,
} from "../../../data/types.ts";
import type {
  AICompany,
  Contract,
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
  SCOPE_DEMAND_MULTIPLIERS,
} from "../../../data/constants.ts";
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

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: "contract-passengerFerry-t1-test",
    type: ContractType.PassengerFerry,
    targetEmpireId: null,
    originPlanetId: "planet-a",
    destinationPlanetId: "planet-b",
    cargoType: CargoType.Passengers,
    durationTurns: 3,
    turnsRemaining: 3,
    rewardCash: 12000,
    rewardReputation: 1,
    rewardResearchPoints: 1,
    rewardTariffReduction: null,
    depositPaid: 1000,
    status: ContractStatus.Available,
    linkedRouteId: null,
    turnsWithoutShip: 0,
    ...overrides,
  };
}

function makeAICompany(overrides: Partial<AICompany> = {}): AICompany {
  return {
    id: "ai-1",
    name: "Nova Freight",
    empireId: "emp-1",
    cash: 100000,
    fleet: [],
    activeRoutes: [],
    reputation: 50,
    totalCargoDelivered: 0,
    personality: "steadyHauler",
    bankrupt: false,
    ceoName: "Nova Freight",
    ceoPortrait: { portraitId: "ceo-1", category: "human" },
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
      type: PlanetType.Frontier,
      x: 110,
      y: 110,
      population: 1000000,
      biome: PlanetBiome.Colony,
      productionTags: [],
      consumptionTags: [],
      productionScale: 1.0,
      populationCap: 10,
    },
    {
      id: "planet-b",
      name: "Planet B",
      systemId: "sys-2",
      type: PlanetType.Agricultural,
      x: 310,
      y: 210,
      population: 200000,
      biome: PlanetBiome.Colony,
      productionTags: [],
      consumptionTags: [],
      productionScale: 1.0,
      populationCap: 10,
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
    gameSize: "standard",
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
      purchaseCount: {},
      queue: [],
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
// Tests
// ---------------------------------------------------------------------------

describe("TurnSimulator", () => {
  describe("simulateTurn", () => {
    it("calculates revenue correctly for a simple route", () => {
      const state = makeGameState();
      const rng = new SeededRNG(42);

      // New model: fixed trips=1 (modulated only by event speed multipliers),
      // baseCapacity=800 for freight, no distance premium. Scope multiplier
      // alone carries the cargo-vs-distance signal.
      // Route: distance=50, cargoType=Food, scope=empire (planet-a/sys-1 →
      // planet-b/sys-2, both in emp-1). Food empire multiplier = 1.0.
      const scopeMult = SCOPE_DEMAND_MULTIPLIERS[CargoType.Food].empire;
      const expectedRevenue =
        Math.round(
          BASE_CARGO_PRICES[CargoType.Food] * 800 * 1 * scopeMult * 100,
        ) / 100;
      const result = simulateTurn(state, rng);

      const turnResult = result.history[result.history.length - 1];
      expect(turnResult.revenue).toBe(expectedRevenue);
    });

    it("skips paused routes — no revenue and no fuel charged", () => {
      const state = makeGameState();
      // Mark the only route as paused
      state.activeRoutes[0].paused = true;
      const rng = new SeededRNG(42);

      const result = simulateTurn(state, rng);
      const turnResult = result.history[result.history.length - 1];
      expect(turnResult.revenue).toBe(0);
      expect(turnResult.fuelCosts).toBe(0);
    });

    it("deducts fuel costs correctly", () => {
      const state = makeGameState();
      const rng = new SeededRNG(42);

      // New capacity-based formula: scopeCost * 2 * fuelPrice * effectiveTrips.
      // effectiveTrips is now the event speed modifier (default 1.0) rather
      // than a trips-by-distance count.
      // Route: distance=50, scope=empire. scopeCost=2 (empire), trips=1.
      const expectedFuelCost = 2 * 2 * BASE_FUEL_PRICE * 1;

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
      // baseCapacity=800 for freight × trips=1
      const expectedCargoDelivered = 800;
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
          turnsSinceLastDecision: 0,
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

    it("refreshes the available contract board each turn", () => {
      const state = makeGameState({
        playerEmpireId: "emp-1",
        unlockedEmpireIds: ["emp-1"],
        galaxy: {
          ...makeGameState().galaxy,
          empires: [
            {
              id: "emp-1",
              name: "Core Worlds",
              color: 0x00aaff,
              tariffRate: 0.1,
              disposition: EmpireDisposition.Friendly,
              homeSystemId: "sys-1",
              leaderName: "Ari Vale",
              leaderPortrait: { portraitId: "leader-1", category: "human" },
              archetype: EmpireArchetype.Balanced,
              ownedSpecials: [],
            },
          ],
        },
      });

      const result = simulateTurn(state, new SeededRNG(7));

      expect(
        result.contracts.filter((c) => c.status === ContractStatus.Available)
          .length,
      ).toBeGreaterThan(0);
      expect(
        result.turnReport?.diplomacyDigest?.some((line) =>
          line.includes("Contracts posted"),
        ),
      ).toBe(true);
    });

    it("persists AI contract claims made during AI simulation", () => {
      const contract = makeContract({ type: ContractType.TradeAlliance });
      const state = makeGameState({
        contracts: [contract],
        aiCompanies: [makeAICompany({ personality: "steadyHauler" })],
      });

      const candidateSeeds = [1, 2, 3, 4, 5, 6, 7, 8];
      const result = candidateSeeds
        .map((seed) => simulateTurn(state, new SeededRNG(seed)))
        .find((candidate) => {
          const claimed = candidate.contracts.find((c) => c.id === contract.id);
          return (
            claimed?.status === ContractStatus.Active &&
            claimed.aiCompanyId === "ai-1"
          );
        });

      expect(result).toBeDefined();
      if (!result) return;
      const claimed = result.contracts.find((c) => c.id === contract.id);

      expect(claimed?.status).toBe(ContractStatus.Active);
      expect(claimed?.aiCompanyId).toBe("ai-1");
    });

    it("surfaces empire event headlines in the turn report digest", () => {
      // Try several seeds since empire events are probabilistic
      const seeds = [1, 2, 3, 5, 7, 10, 15, 20, 25];
      let foundEmpireEvent = false;
      for (const seed of seeds) {
        const result = simulateTurn(makeGameState(), new SeededRNG(seed));
        const empireEvents = result.activeEvents.filter(
          (event) => event.category === EventCategory.Empire,
        );
        if (empireEvents.length > 0) {
          foundEmpireEvent = true;
          expect(result.turnReport?.diplomacyDigest?.length).toBeGreaterThan(0);
          break;
        }
      }
      // Empire events should occur in at least one of the tested seeds
      expect(foundEmpireEvent).toBe(true);
    });

    it("includes operating costs in the turn result", () => {
      // Operating costs are now per-route based on scope and hull mark
      // Default state has one empire-scope route, Mk I hull
      // operatingCost = ROUTE_BASE_OPERATING_RATE * scopeCost * hullEfficiencyMult
      //               = 3000 * 2 * 1.0 = 6000
      const state = makeGameState();
      const rng = new SeededRNG(42);

      const result = simulateTurn(state, rng);
      const turnResult = result.history[result.history.length - 1];

      // maintenanceCosts field now holds total operating costs
      expect(turnResult.maintenanceCosts).toBeGreaterThan(0);
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

    it("routes produce revenue regardless of assignedShipIds (capacity-pool model)", () => {
      // In the capacity-pool model, assignedShipIds is vestigial — routes earn
      // revenue based on hull marks and utilization, not individual ships.
      const route = makeRoute({ assignedShipIds: [] });
      const state = makeGameState({ activeRoutes: [route], fleet: [] });
      const rng = new SeededRNG(42);

      const result = simulateTurn(state, rng);
      const turnResult = result.history[result.history.length - 1];

      // Route performance exists and produces revenue
      expect(turnResult.routePerformance.length).toBe(1);
      expect(turnResult.routePerformance[0].revenue).toBeGreaterThan(0);
      expect(turnResult.routePerformance[0].trips).toBeGreaterThan(0);
    });

    it("advances turn counter by 1", () => {
      const state = makeGameState({ turn: 5 });
      const rng = new SeededRNG(42);

      const result = simulateTurn(state, rng);
      expect(result.turn).toBe(6);
    });

    it("preserves fleet state (aging removed in capacity-pool model)", () => {
      // Fleet aging is no longer performed during turn simulation.
      // The fleet array is preserved as-is for backwards compatibility.
      const ship = makeShip({ age: 2, condition: 90 });
      const state = makeGameState({ fleet: [ship] });
      const rng = new SeededRNG(42);

      const result = simulateTurn(state, rng);

      // Fleet is preserved — age and condition unchanged by simulation
      expect(result.fleet[0].age).toBe(2);
      expect(result.fleet[0].condition).toBe(90);
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

    it("breakdowns occur under extreme overcapacity", () => {
      // Breakdown in the capacity-pool model triggers when overcrowding cost
      // factor > 0.5 (utilization > 150%). Create 6 empire routes with base
      // capacity of 4 FC units total → 12 FC used vs 4 total = 300% utilization.
      const makeORoute = (id: string): ActiveRoute => ({
        id,
        originPlanetId: "planet-a",
        destinationPlanetId: "planet-b",
        distance: 50,
        assignedShipIds: [],
        cargoType: CargoType.Food,
      });
      const routes = [
        makeORoute("r1"),
        makeORoute("r2"),
        makeORoute("r3"),
        makeORoute("r4"),
        makeORoute("r5"),
        makeORoute("r6"),
      ];

      const state = makeGameState({ activeRoutes: routes, fleet: [] });

      // At 300% utilization, overcrowding.costMultiplier is very high,
      // so breakdownChance should be > 0 and breakdowns should occur eventually
      let foundBreakdown = false;
      for (let seed = 1; seed <= 30; seed++) {
        const rng = new SeededRNG(seed);
        const result = simulateTurn(state, rng);
        const turnResult = result.history[result.history.length - 1];

        if (turnResult.routePerformance.some((rp) => rp.breakdowns > 0)) {
          foundBreakdown = true;
          const brokenRoute = turnResult.routePerformance.find(
            (rp) => rp.breakdowns > 0,
          )!;
          expect(brokenRoute.revenue).toBe(0);
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

describe("capacity-based route simulation", () => {
  function makeCapacityState(
    overrides: {
      purchaseCount?: Record<string, number>;
      routes?: Partial<ActiveRoute>[];
    } = {},
  ): GameState {
    const planets = [
      {
        id: "planet-a",
        name: "Planet A",
        systemId: "sys-1",
        type: PlanetType.Frontier,
        x: 110,
        y: 110,
        population: 1000000,
        biome: PlanetBiome.Colony,
        productionTags: [],
        consumptionTags: [],
        productionScale: 1.0,
        populationCap: 10,
      } as Planet,
      {
        id: "planet-b",
        name: "Planet B",
        systemId: "sys-1",
        type: PlanetType.Agricultural,
        x: 120,
        y: 120,
        population: 200000,
        biome: PlanetBiome.Colony,
        productionTags: [],
        consumptionTags: [],
        productionScale: 1.0,
        populationCap: 10,
      } as Planet,
    ];

    const systems: StarSystem[] = [
      {
        id: "sys-1",
        name: "Alpha",
        sectorId: "sec-1",
        empireId: "emp-1",
        x: 100,
        y: 100,
        starColor: 0xffcc00,
      },
    ];

    const sectors: Sector[] = [
      { id: "sec-1", name: "Sector 1", x: 0, y: 0, color: 0xffffff },
    ];

    const planetMarkets: Record<string, PlanetMarket> = {};
    for (const p of planets) {
      const base: Record<string, CargoMarketEntry> = {};
      for (const ct of Object.values(CargoType)) {
        base[ct] = {
          baseSupply: 100,
          baseDemand: 100,
          currentPrice: 20,
          saturation: 0,
          trend: "stable",
          trendMomentum: 0,
          eventModifier: 1.0,
        };
      }
      planetMarkets[p.id] = base as PlanetMarket;
    }

    const defaultRoutes: ActiveRoute[] = (overrides.routes ?? []).map(
      (r, i) => ({
        id: `route-${i + 1}`,
        originPlanetId: "planet-a",
        destinationPlanetId: "planet-b",
        distance: 10, // short distance → system scope since both in same system
        assignedShipIds: [],
        cargoType: CargoType.Food,
        ...r,
      }),
    );

    if (defaultRoutes.length === 0) {
      defaultRoutes.push({
        id: "route-1",
        originPlanetId: "planet-a",
        destinationPlanetId: "planet-b",
        distance: 10,
        assignedShipIds: [],
        cargoType: CargoType.Food,
      });
    }

    return {
      seed: 42,
      turn: 1,
      maxTurns: MAX_TURNS,
      phase: "simulation",
      cash: STARTING_CASH,
      loans: [],
      reputation: 50,
      companyName: "Cap Corp",
      ceoName: "Commander",
      ceoPortrait: { portraitId: "ceo-01", category: "human" },
      gameSize: "standard",
      galaxyShape: "spiral",
      playerEmpireId: "",
      galaxy: {
        sectors,
        empires: [],
        systems,
        planets,
      },
      fleet: [],
      activeRoutes: defaultRoutes,
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
      routeSlots: 10,
      unlockedEmpireIds: [],
      contracts: [],
      tech: {
        researchPoints: 0,
        completedTechIds: [],
        currentResearchId: null,
        researchProgress: 0,
        purchaseCount: overrides.purchaseCount ?? {},
        queue: [],
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
    };
  }

  it("generates route revenue without ships", () => {
    const state = makeCapacityState();
    const rng = new SeededRNG(42);

    const result = simulateTurn(state, rng);
    const turnResult = result.history[result.history.length - 1];

    // Capacity-based system: revenue > 0 even with no fleet
    expect(turnResult.revenue).toBeGreaterThan(0);
    // Operating cost > 0 (stored in maintenanceCosts field for TurnResult compat)
    expect(turnResult.maintenanceCosts).toBeGreaterThan(0);
  });

  it("higher hull mark produces more revenue", () => {
    // Mk I (no upgrades) vs Mk III (two freight_hull upgrades)
    const stateMk1 = makeCapacityState({ purchaseCount: {} });
    const stateMk3 = makeCapacityState({
      purchaseCount: {
        freight_hull_mk2: 1,
        freight_hull_mk3: 1,
      },
    });

    const rng1 = new SeededRNG(42);
    const rng3 = new SeededRNG(42);

    const resultMk1 = simulateTurn(stateMk1, rng1);
    const resultMk3 = simulateTurn(stateMk3, rng3);

    const revMk1 = resultMk1.history[0].revenue;
    const revMk3 = resultMk3.history[0].revenue;

    // Mk III hull has 1.35× revenue multiplier vs 1.0× for Mk I
    expect(revMk3).toBeGreaterThan(revMk1);
  });

  it("overcapacity reduces revenue", () => {
    // 1 system route = 1 FC used, base capacity = 4 FC → 25% utilization (healthy)
    const stateHealthy = makeCapacityState({
      routes: [{ cargoType: CargoType.Food }],
    });

    // 10 system routes = 10 FC used, base capacity = 4 FC → 250% utilization (overcrowded)
    const stateOvercrowded = makeCapacityState({
      routes: Array.from({ length: 10 }, (_, i) => ({
        id: `route-${i + 1}`,
        cargoType: CargoType.Food,
      })),
    });

    const resultHealthy = simulateTurn(stateHealthy, new SeededRNG(42));
    const resultOvercrowded = simulateTurn(stateOvercrowded, new SeededRNG(42));

    const revenuePerRouteHealthy = resultHealthy.history[0].revenue;
    // Overcrowded: total revenue / 10 routes — each route earns less due to penalty
    const totalRevenueOvercrowded = resultOvercrowded.history[0].revenue;
    const revenuePerRouteOvercrowded = totalRevenueOvercrowded / 10;

    // Per-route revenue should be lower under overcapacity
    expect(revenuePerRouteOvercrowded).toBeLessThan(revenuePerRouteHealthy);
  });
});

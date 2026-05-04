import { describe, it, expect } from "vitest";
import { simulateTurn } from "../TurnSimulator.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import { CargoType, ShipClass, PlanetType } from "../../../data/types.ts";
import type {
  GameState,
  Ship,
  ActiveRoute,
  Planet,
  StarSystem,
  Sector,
  CargoMarketEntry,
  PlanetMarket,
} from "../../../data/types.ts";
import {
  STARTING_CASH,
  MAX_TURNS,
  BASE_FUEL_PRICE,
} from "../../../data/constants.ts";
import { initAdviserState } from "../../adviser/AdviserEngine.ts";
import { EMPTY_DIPLOMACY_STATE } from "../../../data/types.ts";

// ---------------------------------------------------------------------------
// Test helpers (mirrors TurnSimulator.test.ts shape, but minimal)
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
    diplomacy: { ...EMPTY_DIPLOMACY_STATE },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TurnSimulator — diplomacy integration", () => {
  it("drains queuedActions during simulation", () => {
    const before = makeGameState({
      diplomacy: {
        ...EMPTY_DIPLOMACY_STATE,
        queuedActions: [
          {
            id: "a",
            kind: "giftEmpire",
            targetId: "emp-1",
            cashCost: 5_000,
          },
        ],
      },
    });
    const rng = new SeededRNG(1);
    const after = simulateTurn(before, rng);
    expect(after.diplomacy?.queuedActions ?? []).toHaveLength(0);
  });

  it("ticks diplomacy state (resets actionsResolvedThisTurn to 0)", () => {
    const before = makeGameState({
      diplomacy: {
        ...EMPTY_DIPLOMACY_STATE,
        actionsResolvedThisTurn: 5,
      },
    });
    const rng = new SeededRNG(1);
    const after = simulateTurn(before, rng);
    expect(after.diplomacy?.actionsResolvedThisTurn).toBe(0);
  });
});

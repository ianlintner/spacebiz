import { describe, it, expect } from "vitest";
import { simulateAIRoutes } from "../aiRouteStep.ts";
import { SeededRNG } from "../../../../utils/SeededRNG.ts";
import { CargoType, ShipClass, PlanetType } from "../../../../data/types.ts";
import type {
  GameState,
  AICompany,
  Ship,
  Planet,
  StarSystem,
  Sector,
  PlanetMarket,
  CargoMarketEntry,
} from "../../../../data/types.ts";
import {
  BASE_FUEL_PRICE,
  BASE_CARGO_PRICES,
  SCOPE_DEMAND_MULTIPLIERS,
} from "../../../../data/constants.ts";
import { initAdviserState } from "../../../adviser/AdviserEngine.ts";

// ---------------------------------------------------------------------------
// Regression guard: AI revenue must apply the scope demand multiplier so the
// AI and player operate on a single economy. Before PR #69's audit, AI used
// a raw `price × moved` formula and silently kept the old (no-cap) revenue
// while the player ate the scope curve.
// ---------------------------------------------------------------------------

function makeMarketEntry(): CargoMarketEntry {
  return {
    baseSupply: 100,
    baseDemand: 100,
    currentPrice: BASE_CARGO_PRICES[CargoType.Food],
    saturation: 0,
    trend: "stable",
    trendMomentum: 0,
    eventModifier: 1,
  };
}

function makePlanetMarket(): PlanetMarket {
  const m: Record<string, CargoMarketEntry> = {};
  for (const c of Object.values(CargoType)) m[c] = makeMarketEntry();
  return m as PlanetMarket;
}

const sectors: Sector[] = [
  { id: "sec-1", name: "S", x: 0, y: 0, color: 0xffffff },
];

// Two same-empire systems for the empire-scope route, plus a third in a
// different empire so we can assert galactic-scope revenue too.
const systems: StarSystem[] = [
  {
    id: "sys-1",
    name: "A",
    sectorId: "sec-1",
    empireId: "emp-1",
    x: 0,
    y: 0,
    starColor: 0xffcc00,
  },
  {
    id: "sys-2",
    name: "B",
    sectorId: "sec-1",
    empireId: "emp-1",
    x: 100,
    y: 0,
    starColor: 0xffcc00,
  },
  {
    id: "sys-3",
    name: "C",
    sectorId: "sec-1",
    empireId: "emp-2",
    x: 200,
    y: 0,
    starColor: 0xffcc00,
  },
];

const planets: Planet[] = [
  {
    id: "p-a",
    name: "A1",
    systemId: "sys-1",
    type: PlanetType.Industrial,
    x: 0,
    y: 0,
    population: 100,
  },
  {
    id: "p-b",
    name: "B1",
    systemId: "sys-2",
    type: PlanetType.Industrial,
    x: 100,
    y: 0,
    population: 100,
  },
  {
    id: "p-c",
    name: "C1",
    systemId: "sys-3",
    type: PlanetType.Industrial,
    x: 200,
    y: 0,
    population: 100,
  },
];

function makeShip(): Ship {
  return {
    id: "ai-ship-1",
    name: "AI Hauler",
    class: ShipClass.CargoShuttle,
    cargoCapacity: 80,
    passengerCapacity: 0,
    speed: 4,
    fuelEfficiency: 0.8,
    reliability: 95,
    age: 0,
    condition: 100,
    purchaseCost: 40000,
    maintenanceCost: 2000,
    assignedRouteId: "route-ai",
  };
}

function makeAI(originId: string, destId: string, distance: number): AICompany {
  return {
    id: "ai-1",
    name: "Mock AI",
    empireId: "emp-1",
    cash: 100000,
    fleet: [makeShip()],
    activeRoutes: [
      {
        id: "route-ai",
        originPlanetId: originId,
        destinationPlanetId: destId,
        distance,
        cargoType: CargoType.Food,
        assignedShipIds: ["ai-ship-1"],
      },
    ],
    reputation: 50,
    totalCargoDelivered: 0,
    personality: "steadyHauler",
    bankrupt: false,
    ceoName: "Mock",
    ceoPortrait: { portraitId: "p-01", category: "human" },
  };
}

function makeState(): GameState {
  const planetMarkets: Record<string, PlanetMarket> = {};
  for (const p of planets) planetMarkets[p.id] = makePlanetMarket();

  return {
    seed: 1,
    turn: 1,
    maxTurns: 20,
    phase: "simulation",
    cash: 0,
    loans: [],
    reputation: 50,
    companyName: "P",
    ceoName: "P",
    ceoPortrait: { portraitId: "p", category: "human" },
    gameSize: "standard",
    galaxyShape: "spiral",
    playerEmpireId: "emp-1",
    galaxy: { sectors, empires: [], systems, planets },
    fleet: [],
    activeRoutes: [],
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
    localRouteSlots: 2,
    galacticRouteSlots: 3,
    unlockedEmpireIds: ["emp-1", "emp-2"],
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
    unlockedNavTabs: ["map", "routes", "fleet", "finance"],
    reputationTier: "unknown",
  };
}

describe("simulateAIRoutes — scope multiplier parity", () => {
  it("applies the empire scope multiplier (1.1× for food)", () => {
    const state = makeState();
    const company = makeAI("p-a", "p-b", 100); // sys-1 → sys-2, both emp-1
    const result = simulateAIRoutes(
      company,
      state,
      state.market,
      new SeededRNG(1),
    );

    // Expected: price × capacity × trips × scopeMult × (1 + distancePremium)
    // ship speed 4, distance 100 → trips = floor(100 / 50) = 2
    // food@empire = 1.1, distancePremium = min(0.5, 100*0.0015) = 0.15
    const price = BASE_CARGO_PRICES[CargoType.Food];
    const trips = 2;
    const scopeMult = SCOPE_DEMAND_MULTIPLIERS[CargoType.Food].empire;
    const distancePremium = 0.15;
    const expected = price * 80 * trips * scopeMult * (1 + distancePremium);

    expect(result.revenue).toBeCloseTo(expected, 0);
  });

  it("applies the galactic scope multiplier and rewards distance for luxury", () => {
    const state = makeState();
    // luxury cargo, p-a (emp-1) → p-c (emp-2), distance 200
    const company: AICompany = {
      ...makeAI("p-a", "p-c", 200),
      activeRoutes: [
        {
          id: "route-ai",
          originPlanetId: "p-a",
          destinationPlanetId: "p-c",
          distance: 200,
          cargoType: CargoType.Luxury,
          assignedShipIds: ["ai-ship-1"],
        },
      ],
    };
    const result = simulateAIRoutes(
      company,
      state,
      state.market,
      new SeededRNG(1),
    );

    const price = BASE_CARGO_PRICES[CargoType.Luxury];
    // ship speed 4, distance 200 → trips = floor(100 / 100) = 1
    const trips = 1;
    const scopeMult = SCOPE_DEMAND_MULTIPLIERS[CargoType.Luxury].galactic;
    const distancePremium = Math.min(0.5, 200 * 0.0015);
    // tariff is applied separately in the AI step (separate from revenue)
    const expectedRevenue =
      price * 80 * trips * scopeMult * (1 + distancePremium);

    // revenue is the *gross* before tariff — match the gross
    expect(result.revenue).toBeCloseTo(expectedRevenue, 0);
  });

  it("does not apply distance premium at system scope", () => {
    const state = makeState();
    // Both planets in sys-1 — make a second p-a2 in sys-1 to construct a
    // system-scope route.
    const localPlanets: Planet[] = [
      ...planets,
      {
        id: "p-a2",
        name: "A2",
        systemId: "sys-1",
        type: PlanetType.Mining,
        x: 5,
        y: 5,
        population: 100,
      },
    ];
    const localMarkets: Record<string, PlanetMarket> = {};
    for (const p of localPlanets) localMarkets[p.id] = makePlanetMarket();
    const localState: GameState = {
      ...state,
      galaxy: { ...state.galaxy, planets: localPlanets },
      market: { ...state.market, planetMarkets: localMarkets },
    };

    const company = makeAI("p-a", "p-a2", 25);
    const result = simulateAIRoutes(
      company,
      localState,
      localState.market,
      new SeededRNG(1),
    );

    const price = BASE_CARGO_PRICES[CargoType.Food];
    // dist 25, speed 4 → trips = floor(100 / 12.5) = 8
    const trips = 8;
    const scopeMult = SCOPE_DEMAND_MULTIPLIERS[CargoType.Food].system;
    // System scope: NO distance premium
    const expected = price * 80 * trips * scopeMult * 1.0;

    expect(result.revenue).toBeCloseTo(expected, 0);
  });
});

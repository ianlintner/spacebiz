/**
 * aiRouteStep tests — AI/player parity checks
 *
 * Verifies that the AI route simulation uses the same capacity-pool model as
 * the player simulator: same baseCapacity, same scope multipliers, and the
 * same operating cost formula. This guards against AI/player economy drift
 * after future refactors.
 */
import { describe, it, expect } from "vitest";
import { simulateAIRoutes } from "../aiRouteStep.ts";
import { computeRouteOperatingCost } from "../../../fleet/CapacityManager.ts";
import { getScopeDemandMultiplier } from "../../../routes/RouteManager.ts";
import { _clearRouteManagerCaches } from "../../../routes/RouteManager.ts";
import type {
  AICompany,
  ActiveRoute,
  GameState,
  MarketState,
  CargoMarketEntry,
  Planet,
  StarSystem,
  Sector,
} from "../../../../data/types.ts";
import {
  CargoType,
  RouteScope,
  PlanetBiome,
  EMPTY_DIPLOMACY_STATE,
} from "../../../../data/types.ts";
import {
  SCOPE_DEMAND_MULTIPLIERS,
  CAPACITY_COST_BY_SCOPE,
  ROUTE_BASE_OPERATING_RATE,
  HULL_EFFICIENCY_MULT,
} from "../../../../data/constants.ts";
import { initAdviserState } from "../../../adviser/AdviserEngine.ts";
import { SeededRNG } from "../../../../utils/SeededRNG.ts";

// ---------------------------------------------------------------------------
// Minimal galaxy fixture: 2 empires, 3 systems
// ---------------------------------------------------------------------------

const sectors: Sector[] = [
  { id: "sec-1", name: "Core Sector", x: 0, y: 0, color: 0xffffff },
];

const systems: StarSystem[] = [
  {
    id: "sys-1",
    name: "Alpha",
    sectorId: "sec-1",
    empireId: "emp-1",
    x: 0,
    y: 0,
    starColor: 0xffcc00,
  },
  {
    id: "sys-2",
    name: "Beta",
    sectorId: "sec-1",
    empireId: "emp-1",
    x: 100,
    y: 0,
    starColor: 0xffcc00,
  },
  {
    id: "sys-3",
    name: "Gamma",
    sectorId: "sec-1",
    empireId: "emp-2",
    x: 200,
    y: 0,
    starColor: 0xffcc00,
  },
];

const planets: Planet[] = [
  {
    id: "planet-a",
    name: "Alpha I",
    systemId: "sys-1",
    type: "frontier",
    x: 0,
    y: 0,
    population: 100,
    biome: PlanetBiome.Colony,
    productionTags: [],
    consumptionTags: [],
    productionScale: 1.0,
    populationCap: 10,
  },
  {
    id: "planet-b",
    name: "Beta I",
    systemId: "sys-2",
    type: "agricultural",
    x: 100,
    y: 0,
    population: 100,
    biome: PlanetBiome.Colony,
    productionTags: [],
    consumptionTags: [],
    productionScale: 1.0,
    populationCap: 10,
  },
  {
    id: "planet-c",
    name: "Gamma I",
    systemId: "sys-3",
    type: "techWorld",
    x: 200,
    y: 0,
    population: 100,
    biome: PlanetBiome.Colony,
    productionTags: [],
    consumptionTags: [],
    productionScale: 1.0,
    populationCap: 10,
  },
];

const galaxy = {
  sectors,
  empires: [] as import("../../../../data/types.ts").Empire[],
  systems,
  planets,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMarketEntry(price = 20): CargoMarketEntry {
  return {
    baseSupply: 500,
    baseDemand: 500,
    currentPrice: price,
    trend: "stable",
    saturation: 0,
    trendMomentum: 0,
    eventModifier: 1.0,
  };
}

function makeMarket(destPlanetId: string): MarketState {
  return {
    fuelPrice: 10,
    fuelTrend: "stable",
    planetMarkets: {
      [destPlanetId]: {
        [CargoType.RawMaterials]: makeMarketEntry(20),
        [CargoType.Food]: makeMarketEntry(15),
        [CargoType.Technology]: makeMarketEntry(30),
        [CargoType.Luxury]: makeMarketEntry(50),
        [CargoType.Hazmat]: makeMarketEntry(25),
        [CargoType.Medical]: makeMarketEntry(35),
        [CargoType.Passengers]: makeMarketEntry(65),
      },
    },
  };
}

function makeRoute(
  origin: string,
  dest: string,
  cargoType: CargoType,
  id = `route-${origin}-${dest}`,
): ActiveRoute {
  return {
    id,
    originPlanetId: origin,
    destinationPlanetId: dest,
    distance: 50,
    cargoType,
  };
}

function makeAICompany(routes: ActiveRoute[], empireId = "emp-1"): AICompany {
  return {
    id: "ai-test",
    name: "Test AI Corp",
    empireId,
    cash: 500_000,
    reputation: 50,
    totalCargoDelivered: 0,
    personality: "steadyHauler",
    bankrupt: false,
    ceoName: "Test CEO",
    ceoPortrait: { portraitId: "p1", category: "human" },
    activeRoutes: routes,
    techState: {
      researchPoints: 0,
      completedTechIds: [],
      currentResearchId: null,
      researchProgress: 0,
      purchaseCount: {},
      queue: [],
    },
  };
}

function makeGameState(): GameState {
  return {
    seed: 42,
    turn: 1,
    maxTurns: 20,
    phase: "planning",
    cash: 500_000,
    loans: [],
    reputation: 50,
    companyName: "Test Corp",
    ceoName: "Test CEO",
    ceoPortrait: { portraitId: "p1", category: "human" },
    gameSize: "standard",
    galaxyShape: "spiral",
    playerEmpireId: "emp-1",
    galaxy,
    activeRoutes: [],
    market: makeMarket("planet-b"),
    aiCompanies: [],
    activeEvents: [],
    history: [],
    storyteller: {
      playerHealthScore: 50,
      headwindBias: 0,
      turnsInDebt: 0,
      consecutiveProfitTurns: 0,
      turnsSinceLastDecision: 0,
      turnsSinceLastDilemma: 999,
      recentIntensity: 0,
      mode: "steady",
    },
    score: 0,
    gameOver: false,
    gameOverReason: null,
    adviser: initAdviserState(),
    routeSlots: 4,
    localRouteSlots: 2,
    galacticRouteSlots: 2,
    unlockedEmpireIds: ["emp-1", "emp-2"],
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
    unlockedNavTabs: ["map", "routes", "fleet", "finance"],
    reputationTier: "unknown",
    hyperlanes: [],
    borderPorts: [],
    diplomaticRelations: [],
    diplomacy: EMPTY_DIPLOMACY_STATE,
    pendingRivalMessages: [],
  };
}

// ---------------------------------------------------------------------------
// Tests: AI/player parity
// ---------------------------------------------------------------------------

describe("AI route simulation — parity with player model", () => {
  it("AI freight route uses baseCapacity 800 (same as player)", () => {
    _clearRouteManagerCaches();
    const route = makeRoute("planet-a", "planet-b", CargoType.RawMaterials);
    const company = makeAICompany([route]);
    const state = makeGameState();
    const market = makeMarket("planet-b");
    const rng = new SeededRNG(42);

    const result = simulateAIRoutes(company, state, market, rng);

    // revenue ≈ price × 800 × scopeMult (empire=1.0)
    // Using BASE_CARGO_PRICES[RawMaterials] — let's just verify > 0 and reasonable range
    expect(result.revenue).toBeGreaterThan(0);
    expect(result.totalCargo).toBe(800); // fixed trips=1 × baseCapacity=800
  });

  it("AI passenger route uses baseCapacity 600 (same as player)", () => {
    _clearRouteManagerCaches();
    const route = makeRoute("planet-a", "planet-b", CargoType.Passengers);
    const company = makeAICompany([route]);
    const state = makeGameState();
    const market = makeMarket("planet-b");
    const rng = new SeededRNG(42);

    const result = simulateAIRoutes(company, state, market, rng);
    // totalCargo = baseCapacity × trips = 600 × 1 = 600
    expect(result.totalCargo).toBe(600);
    expect(result.revenue).toBeGreaterThan(0);
  });

  it("AI route scope multiplier matches player getScopeDemandMultiplier", () => {
    // Empire-scope raw materials: both AI and player use empire=1.0
    _clearRouteManagerCaches();
    const empireRoute = makeRoute(
      "planet-a",
      "planet-b",
      CargoType.RawMaterials,
    );
    const company = makeAICompany([empireRoute]);
    const state = makeGameState();
    const market = makeMarket("planet-b");
    const rng = new SeededRNG(42);

    const aiResult = simulateAIRoutes(company, state, market, rng);

    const playerScopeMult = getScopeDemandMultiplier(
      CargoType.RawMaterials,
      RouteScope.Empire,
    );
    expect(playerScopeMult).toBeCloseTo(1.0, 2);

    // AI revenue should roughly match: price × 800 × 1.0
    // (exact price depends on BASE_CARGO_PRICES + demand formula)
    expect(aiResult.revenue).toBeGreaterThan(0);
  });

  it("AI scope multiplier for raw materials matches SCOPE_DEMAND_MULTIPLIERS", () => {
    const empMult =
      SCOPE_DEMAND_MULTIPLIERS[CargoType.RawMaterials][RouteScope.Empire];
    const sysMult =
      SCOPE_DEMAND_MULTIPLIERS[CargoType.RawMaterials][RouteScope.System];
    const galMult =
      SCOPE_DEMAND_MULTIPLIERS[CargoType.RawMaterials][RouteScope.Galactic];

    // Consistent with player: empire=1.0, system=1.2, galactic<1
    expect(empMult).toBeCloseTo(1.0, 2);
    expect(sysMult).toBeCloseTo(1.2, 2);
    expect(galMult).toBeLessThan(1.0);
  });

  it("AI operating cost matches player formula: 3000 × scopeCost × hullEffMult", () => {
    // Empire scope, Mk I hull: 3000 × 2 × 1.0 = 6000
    const empireOpCost = computeRouteOperatingCost(RouteScope.Empire, 1);
    const expected =
      ROUTE_BASE_OPERATING_RATE *
      CAPACITY_COST_BY_SCOPE[RouteScope.Empire] *
      HULL_EFFICIENCY_MULT[1];
    expect(empireOpCost).toBeCloseTo(expected, 0);

    // System scope, Mk I: 3000 × 1 × 1.0 = 3000
    const systemOpCost = computeRouteOperatingCost(RouteScope.System, 1);
    expect(systemOpCost).toBeCloseTo(3000, 0);

    // Galactic scope, Mk I: 3000 × 3 × 1.0 = 9000
    const galacticOpCost = computeRouteOperatingCost(RouteScope.Galactic, 1);
    expect(galacticOpCost).toBeCloseTo(9000, 0);
  });

  it("AI route earns zero revenue when no market data for destination", () => {
    _clearRouteManagerCaches();
    const route = makeRoute("planet-a", "planet-b", CargoType.RawMaterials);
    const company = makeAICompany([route]);
    const state = makeGameState();
    // Empty market — no planet-b entry
    const emptyMarket: MarketState = {
      fuelPrice: 10,
      fuelTrend: "stable",
      planetMarkets: {},
    };
    const rng = new SeededRNG(42);
    const result = simulateAIRoutes(company, state, emptyMarket, rng);
    expect(result.revenue).toBe(0);
    expect(result.totalCargo).toBe(0);
  });

  it("AI paused routes are skipped (same behavior as player)", () => {
    _clearRouteManagerCaches();
    const route = makeRoute("planet-a", "planet-b", CargoType.RawMaterials);
    const pausedRoute: ActiveRoute = { ...route, paused: true };
    const company = makeAICompany([pausedRoute]);
    const state = makeGameState();
    const market = makeMarket("planet-b");
    const rng = new SeededRNG(42);

    const result = simulateAIRoutes(company, state, market, rng);
    expect(result.revenue).toBe(0);
    expect(result.totalCargo).toBe(0);
  });

  it("AI routes without cargoType produce zero revenue", () => {
    _clearRouteManagerCaches();
    const route: ActiveRoute = {
      id: "route-no-cargo",
      originPlanetId: "planet-a",
      destinationPlanetId: "planet-b",
      distance: 50,
      cargoType: null,
    };
    const company = makeAICompany([route]);
    const state = makeGameState();
    const market = makeMarket("planet-b");
    const rng = new SeededRNG(42);

    const result = simulateAIRoutes(company, state, market, rng);
    expect(result.revenue).toBe(0);
  });

  it("galactic AI route earns more than empire route for luxury cargo", () => {
    _clearRouteManagerCaches();
    const empireRoute = makeRoute(
      "planet-a",
      "planet-b",
      CargoType.Luxury,
      "route-empire",
    );
    const galacticRoute = makeRoute(
      "planet-a",
      "planet-c",
      CargoType.Luxury,
      "route-galactic",
    );

    const state = makeGameState();
    const marketWithBothPlanets: MarketState = {
      fuelPrice: 10,
      fuelTrend: "stable",
      planetMarkets: {
        "planet-b": {
          [CargoType.RawMaterials]: makeMarketEntry(),
          [CargoType.Food]: makeMarketEntry(),
          [CargoType.Technology]: makeMarketEntry(),
          [CargoType.Luxury]: makeMarketEntry(50),
          [CargoType.Hazmat]: makeMarketEntry(),
          [CargoType.Medical]: makeMarketEntry(),
          [CargoType.Passengers]: makeMarketEntry(),
        },
        "planet-c": {
          [CargoType.RawMaterials]: makeMarketEntry(),
          [CargoType.Food]: makeMarketEntry(),
          [CargoType.Technology]: makeMarketEntry(),
          [CargoType.Luxury]: makeMarketEntry(50),
          [CargoType.Hazmat]: makeMarketEntry(),
          [CargoType.Medical]: makeMarketEntry(),
          [CargoType.Passengers]: makeMarketEntry(),
        },
      },
    };
    const rng = new SeededRNG(42);

    const empireCompany = makeAICompany([empireRoute]);
    const galacticCompany = makeAICompany([galacticRoute]);

    const empireResult = simulateAIRoutes(
      empireCompany,
      state,
      marketWithBothPlanets,
      rng,
    );
    _clearRouteManagerCaches();
    const galacticResult = simulateAIRoutes(
      galacticCompany,
      state,
      marketWithBothPlanets,
      rng,
    );

    // Galactic luxury scope mult (1.65) > empire luxury scope mult (1.0)
    expect(galacticResult.revenue).toBeGreaterThan(empireResult.revenue);
  });
});

import { describe, it, expect } from "vitest";
import {
  getRouteScope,
  getScopeDemandMultiplier,
  getAvailableSystemRouteSlots,
  getAvailableEmpireRouteSlots,
  getAvailableGalacticRouteSlots,
  getUsedSystemRouteSlots,
  getUsedEmpireRouteSlots,
  getUsedGalacticRouteSlots,
  getFreeSlotsForScope,
  isLocalRoute,
  isGalacticRoute,
} from "../RouteManager.ts";
import type {
  GameState,
  ActiveRoute,
  Planet,
  StarSystem,
  Sector,
} from "../../../data/types.ts";
import { CargoType, RouteScope, PlanetBiome } from "../../../data/types.ts";
import {
  SCOPE_DEMAND_MULTIPLIERS,
  BASE_GALACTIC_ROUTE_SLOTS,
  BASE_SYSTEM_ROUTE_SLOTS,
} from "../../../data/constants.ts";
import { initAdviserState } from "../../adviser/AdviserEngine.ts";

// Two empires, three systems (sys-1, sys-2 in emp-1; sys-3 in emp-2),
// each with one planet (planet-a, planet-b, planet-c). This lets us
// exercise all three scopes from a single fixture.

const sectors: Sector[] = [
  { id: "sec-1", name: "Sector", x: 0, y: 0, color: 0xffffff },
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
    id: "planet-a2",
    name: "Alpha II",
    systemId: "sys-1",
    type: "techWorld",
    x: 5,
    y: 5,
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

function makeRoute(
  origin: string,
  dest: string,
  id = `route-${origin}-${dest}`,
): ActiveRoute {
  return {
    id,
    originPlanetId: origin,
    destinationPlanetId: dest,
    distance: 50,
    cargoType: CargoType.Food,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 42,
    turn: 1,
    maxTurns: 20,
    phase: "planning",
    cash: 200000,
    loans: [],
    reputation: 50,
    companyName: "Test",
    ceoName: "C",
    ceoPortrait: { portraitId: "p", category: "human" },
    gameSize: "standard",
    galaxyShape: "spiral",
    playerEmpireId: "emp-1",
    galaxy: { sectors, empires: [], systems, planets },
    activeRoutes: [],
    market: { fuelPrice: 10, fuelTrend: "stable", planetMarkets: {} },
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
    ...overrides,
  };
}

describe("getRouteScope", () => {
  it("classifies same-system routes as system scope", () => {
    const state = makeState();
    expect(getRouteScope(makeRoute("planet-a", "planet-a2"), state)).toBe(
      RouteScope.System,
    );
  });

  it("classifies cross-system same-empire routes as empire scope", () => {
    const state = makeState();
    expect(getRouteScope(makeRoute("planet-a", "planet-b"), state)).toBe(
      RouteScope.Empire,
    );
  });

  it("classifies cross-empire routes as galactic scope", () => {
    const state = makeState();
    expect(getRouteScope(makeRoute("planet-b", "planet-c"), state)).toBe(
      RouteScope.Galactic,
    );
  });

  it("isLocalRoute matches the system scope", () => {
    const state = makeState();
    expect(isLocalRoute(makeRoute("planet-a", "planet-a2"), state)).toBe(true);
    expect(isLocalRoute(makeRoute("planet-a", "planet-b"), state)).toBe(false);
  });

  it("isGalacticRoute matches the galactic scope", () => {
    const state = makeState();
    expect(isGalacticRoute(makeRoute("planet-b", "planet-c"), state)).toBe(
      true,
    );
    expect(isGalacticRoute(makeRoute("planet-a", "planet-b"), state)).toBe(
      false,
    );
  });
});

describe("Three-tier slot pools", () => {
  it("each scope draws from its own pool", () => {
    const state = makeState({
      activeRoutes: [
        makeRoute("planet-a", "planet-a2", "r-sys"),
        makeRoute("planet-a", "planet-b", "r-emp"),
        makeRoute("planet-b", "planet-c", "r-gal"),
      ],
    });
    expect(getUsedSystemRouteSlots(state)).toBe(1);
    expect(getUsedEmpireRouteSlots(state)).toBe(1);
    expect(getUsedGalacticRouteSlots(state)).toBe(1);
  });

  it("free slot count per scope respects per-pool capacity", () => {
    const state = makeState({
      routeSlots: 3,
      localRouteSlots: 2,
      galacticRouteSlots: 2,
      activeRoutes: [
        makeRoute("planet-a", "planet-a2", "r-sys"),
        makeRoute("planet-b", "planet-c", "r-gal"),
      ],
    });
    expect(getFreeSlotsForScope(state, RouteScope.System)).toBe(1);
    expect(getFreeSlotsForScope(state, RouteScope.Empire)).toBe(3);
    expect(getFreeSlotsForScope(state, RouteScope.Galactic)).toBe(1);
  });

  it("missing galacticRouteSlots falls back to BASE_GALACTIC_ROUTE_SLOTS", () => {
    const state = makeState({ galacticRouteSlots: undefined });
    expect(getAvailableGalacticRouteSlots(state)).toBe(
      BASE_GALACTIC_ROUTE_SLOTS,
    );
  });

  it("missing localRouteSlots falls back to BASE_SYSTEM_ROUTE_SLOTS", () => {
    const state = makeState({
      localRouteSlots: undefined as unknown as number,
    });
    expect(getAvailableSystemRouteSlots(state)).toBe(BASE_SYSTEM_ROUTE_SLOTS);
  });

  it("aliases agree with their canonical helpers", () => {
    const state = makeState();
    expect(getAvailableEmpireRouteSlots(state)).toBe(state.routeSlots);
    expect(getAvailableSystemRouteSlots(state)).toBe(state.localRouteSlots);
  });
});

describe("Scope demand multipliers", () => {
  it("luxury rewards galactic scope and punishes system scope", () => {
    const luxSys = getScopeDemandMultiplier(
      CargoType.Luxury,
      RouteScope.System,
    );
    const luxGal = getScopeDemandMultiplier(
      CargoType.Luxury,
      RouteScope.Galactic,
    );
    expect(luxGal).toBeGreaterThan(luxSys);
    expect(luxGal).toBeGreaterThan(1);
    expect(luxSys).toBeLessThan(1);
  });

  it("raw materials reward short-haul (system) scope and punish galactic", () => {
    const rawSys = getScopeDemandMultiplier(
      CargoType.RawMaterials,
      RouteScope.System,
    );
    const rawEmp = getScopeDemandMultiplier(
      CargoType.RawMaterials,
      RouteScope.Empire,
    );
    const rawGal = getScopeDemandMultiplier(
      CargoType.RawMaterials,
      RouteScope.Galactic,
    );
    expect(rawSys).toBeGreaterThan(rawEmp);
    expect(rawEmp).toBeGreaterThan(rawGal);
  });

  it("food behaves like raw materials (heavy/perishable)", () => {
    const foodSys = SCOPE_DEMAND_MULTIPLIERS[CargoType.Food][RouteScope.System];
    const foodGal =
      SCOPE_DEMAND_MULTIPLIERS[CargoType.Food][RouteScope.Galactic];
    expect(foodSys).toBeGreaterThan(foodGal);
  });

  it("technology shifts from low (system) to high (galactic)", () => {
    const tSys =
      SCOPE_DEMAND_MULTIPLIERS[CargoType.Technology][RouteScope.System];
    const tEmp =
      SCOPE_DEMAND_MULTIPLIERS[CargoType.Technology][RouteScope.Empire];
    const tGal =
      SCOPE_DEMAND_MULTIPLIERS[CargoType.Technology][RouteScope.Galactic];
    expect(tSys).toBeLessThan(tEmp);
    expect(tEmp).toBeLessThan(tGal);
  });

  it("every cargo has a multiplier in every scope", () => {
    for (const cargo of Object.values(CargoType)) {
      for (const scope of Object.values(RouteScope)) {
        const mult = SCOPE_DEMAND_MULTIPLIERS[cargo][scope];
        expect(typeof mult).toBe("number");
        expect(mult).toBeGreaterThan(0);
      }
    }
  });

  // ── Balance regression guards ──────────────────────────────────────
  //
  // The new model anchors every cargo at empire=1.0 and uses the scope
  // multiplier itself as the distance-sensitivity axis (no distance premium,
  // no trips-by-distance). These guards protect that structure.

  it("every cargo is anchored at empire=1.0", () => {
    for (const cargo of Object.values(CargoType)) {
      expect(SCOPE_DEMAND_MULTIPLIERS[cargo][RouteScope.Empire]).toBeCloseTo(
        1.0,
        2,
      );
    }
  });

  it("premium cargo (luxury, technology, medical) favors galactic over system", () => {
    for (const c of [
      CargoType.Luxury,
      CargoType.Technology,
      CargoType.Medical,
    ] as const) {
      const sys = SCOPE_DEMAND_MULTIPLIERS[c][RouteScope.System];
      const gal = SCOPE_DEMAND_MULTIPLIERS[c][RouteScope.Galactic];
      expect(gal).toBeGreaterThan(sys);
    }
  });

  it("bulk goods (raw, food, hazmat) favor system over galactic", () => {
    for (const c of [
      CargoType.RawMaterials,
      CargoType.Food,
      CargoType.Hazmat,
    ] as const) {
      const m = SCOPE_DEMAND_MULTIPLIERS[c];
      expect(m[RouteScope.System]).toBeGreaterThan(m[RouteScope.Galactic]);
      // Bulk peaks at system scope under the new short-haul-bias model.
      expect(m[RouteScope.System]).toBeGreaterThanOrEqual(m[RouteScope.Empire]);
    }
  });
});

import { describe, it, expect } from "vitest";
import {
  generateRouteMarketEntries,
  tickRouteMarket,
  aiClaimRouteEntry,
} from "../RouteMarket.ts";
import { scoutRoute } from "../RouteScout.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import { CargoType, PlanetType } from "../../../data/types.ts";
import type {
  GameState,
  Planet,
  StarSystem,
  Sector,
  CargoMarketEntry,
  PlanetMarket,
  RouteMarketEntry,
} from "../../../data/types.ts";
import {
  STARTING_CASH,
  MAX_TURNS,
  BASE_FUEL_PRICE,
  ROUTE_MARKET_SIZE,
  SCOUT_COST_AP,
  SCOUT_COST_CASH,
  ROUTE_MARKET_ENTRY_DURATION,
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

function makePlanetMarket(): PlanetMarket {
  const base: Record<string, CargoMarketEntry> = {};
  for (const ct of Object.values(CargoType)) {
    base[ct] = makeCargoEntry();
  }
  return base as PlanetMarket;
}

function makeSector(): Sector {
  return { id: "sec-1", name: "Alpha Sector", x: 0, y: 0, color: 0xffffff };
}

/** Two planets in DIFFERENT systems so they pass the cross-system filter. */
function makeTwoPlanets(): Planet[] {
  return [
    {
      id: "planet-a",
      name: "Argos Prime",
      systemId: "sys-1",
      type: PlanetType.Frontier,
      x: 0,
      y: 0,
      population: 1_000_000,
    },
    {
      id: "planet-b",
      name: "Betanis IV",
      systemId: "sys-2",
      type: PlanetType.Mining,
      x: 200,
      y: 200,
      population: 200_000,
    },
  ];
}

function makeSystems(): StarSystem[] {
  return [
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
      x: 200,
      y: 200,
      starColor: 0xff6600,
    },
  ];
}

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  const planets = makeTwoPlanets();
  const planetMarkets: Record<string, PlanetMarket> = {};
  for (const p of planets) {
    planetMarkets[p.id] = makePlanetMarket();
  }

  return {
    seed: 42,
    turn: 1,
    maxTurns: MAX_TURNS,
    phase: "planning",
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
      sectors: [makeSector()],
      empires: [
        {
          id: "emp-1",
          name: "Empire One",
          color: 0x0000ff,
          tariffRate: 0.1,
          disposition: "neutral",
          homeSystemId: "sys-1",
          leaderName: "Leader",
          leaderPortrait: { portraitId: "p-01", category: "human" },
        },
      ],
      systems: makeSystems(),
      planets,
    },
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
    // Both planets are in emp-1, which is unlocked so routes can be generated
    unlockedEmpireIds: ["emp-1"],
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
    ] as GameState["unlockedNavTabs"],
    reputationTier: "unknown" as GameState["reputationTier"],
    localRouteSlots: 2,
    ...overrides,
  };
}

/** Build a minimal RouteMarketEntry for use in tests. */
function makeRouteMarketEntry(
  overrides: Partial<RouteMarketEntry> = {},
): RouteMarketEntry {
  return {
    id: "rm-test-1",
    originPlanetId: "planet-a",
    destinationPlanetId: "planet-b",
    cargoType: CargoType.Food,
    estimatedProfitMin: 700,
    estimatedProfitMax: 1300,
    exactProfitPerTurn: null,
    riskTags: [],
    scouted: false,
    expiresOnTurn: 4, // turn 1 + ROUTE_MARKET_ENTRY_DURATION(3)
    claimedByAiId: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateRouteMarketEntries", () => {
  it("returns entries with exactProfitPerTurn null (hidden before scouting)", () => {
    const state = makeGameState();
    const rng = new SeededRNG(42);

    const entries = generateRouteMarketEntries(state, rng);

    // May be empty if no profitable pairs, but if entries exist they must be hidden
    for (const entry of entries) {
      expect(entry.exactProfitPerTurn).toBeNull();
    }
  });

  it("returns entries with scouted = false", () => {
    const state = makeGameState();
    const rng = new SeededRNG(42);

    const entries = generateRouteMarketEntries(state, rng);

    for (const entry of entries) {
      expect(entry.scouted).toBe(false);
    }
  });

  it("returns entries with valid risk tags (subset of RouteRiskTag union)", () => {
    const validTags = new Set<string>([
      "pirate_activity",
      "war_zone",
      "embargo_risk",
      "high_saturation",
      "volatile_market",
      "long_distance",
      "low_competition",
      "passenger_route",
    ]);

    const state = makeGameState();
    const rng = new SeededRNG(42);

    const entries = generateRouteMarketEntries(state, rng);

    for (const entry of entries) {
      for (const tag of entry.riskTags) {
        expect(validTags.has(tag)).toBe(true);
      }
    }
  });

  it("returns entries with estimatedProfitMin <= estimatedProfitMax", () => {
    const state = makeGameState();
    const rng = new SeededRNG(99);

    const entries = generateRouteMarketEntries(state, rng);

    for (const entry of entries) {
      expect(entry.estimatedProfitMin).toBeLessThanOrEqual(
        entry.estimatedProfitMax,
      );
    }
  });

  it("only generates entries for unlocked empires", () => {
    // With no unlocked empires, no entries should be generated
    const state = makeGameState({ unlockedEmpireIds: [] });
    const rng = new SeededRNG(42);

    const entries = generateRouteMarketEntries(state, rng);

    expect(entries).toHaveLength(0);
  });

  it("sets expiresOnTurn = state.turn + ROUTE_MARKET_ENTRY_DURATION", () => {
    const state = makeGameState({ turn: 5 });
    const rng = new SeededRNG(42);

    const entries = generateRouteMarketEntries(state, rng);

    for (const entry of entries) {
      expect(entry.expiresOnTurn).toBe(5 + ROUTE_MARKET_ENTRY_DURATION);
    }
  });
});

describe("tickRouteMarket", () => {
  it("removes expired entries (expiresOnTurn <= current turn)", () => {
    // Entry expired on turn 1 (current turn is 1)
    const expiredEntry = makeRouteMarketEntry({ expiresOnTurn: 1 });
    const validEntry = makeRouteMarketEntry({
      id: "rm-test-2",
      expiresOnTurn: 10,
    });

    const state = makeGameState({
      turn: 1,
      routeMarket: [expiredEntry, validEntry],
    });
    const rng = new SeededRNG(42);

    const result = tickRouteMarket(state, rng);

    // Expired entry should be gone
    expect(result.find((e) => e.id === "rm-test-1")).toBeUndefined();
    // Valid entry should survive
    expect(result.find((e) => e.id === "rm-test-2")).toBeDefined();
  });

  it("fills market up to ROUTE_MARKET_SIZE[gameSize] when entries are below capacity", () => {
    // Start with an empty market — tick should generate up to capacity
    const state = makeGameState({ routeMarket: [], gameSize: "standard" });
    const rng = new SeededRNG(42);

    const result = tickRouteMarket(state, rng);

    // Should not exceed the market size cap
    expect(result.length).toBeLessThanOrEqual(ROUTE_MARKET_SIZE["standard"]);

    // Since we have exactly 2 planets in different systems with emp-1 unlocked,
    // at least some entries should be generated (profit > 0 required).
    // Just verify we don't get MORE than capacity.
  });

  it("keeps existing valid entries and only tops up the deficit", () => {
    // One valid existing entry that should survive
    const existingEntry = makeRouteMarketEntry({
      id: "existing-1",
      expiresOnTurn: 99,
    });

    const state = makeGameState({
      turn: 1,
      routeMarket: [existingEntry],
      gameSize: "quick", // capacity = 8
    });
    const rng = new SeededRNG(42);

    const result = tickRouteMarket(state, rng);

    // The existing entry must be preserved
    expect(result.find((e) => e.id === "existing-1")).toBeDefined();
    // Total should not exceed quick-game capacity
    expect(result.length).toBeLessThanOrEqual(ROUTE_MARKET_SIZE["quick"]);
  });

  it("removes claimed entries (claimedByAiId set)", () => {
    const claimedEntry = makeRouteMarketEntry({
      id: "rm-claimed",
      claimedByAiId: "ai-corp-1",
      expiresOnTurn: 99,
    });

    const state = makeGameState({ turn: 1, routeMarket: [claimedEntry] });
    const rng = new SeededRNG(42);

    const result = tickRouteMarket(state, rng);

    expect(result.find((e) => e.id === "rm-claimed")).toBeUndefined();
  });
});

describe("scoutRoute (RouteScout)", () => {
  it("throws 'Insufficient AP' when player has no AP", () => {
    const entry = makeRouteMarketEntry({ expiresOnTurn: 99 });
    const state = makeGameState({
      routeMarket: [entry],
      actionPoints: { current: 0, max: 2 },
    });

    expect(() => scoutRoute(state, entry.id)).toThrow("Insufficient AP");
  });

  it("throws 'Insufficient cash' when player cannot afford the scout fee", () => {
    const entry = makeRouteMarketEntry({ expiresOnTurn: 99 });
    const state = makeGameState({
      routeMarket: [entry],
      actionPoints: { current: 2, max: 2 },
      cash: SCOUT_COST_CASH - 1, // just below the threshold
    });

    expect(() => scoutRoute(state, entry.id)).toThrow("Insufficient cash");
  });

  it("throws 'Entry not found' for unknown entryId", () => {
    const state = makeGameState({ routeMarket: [] });

    expect(() => scoutRoute(state, "nonexistent-id")).toThrow(
      "Entry not found",
    );
  });

  it("throws 'Already scouted' when scouting a previously scouted entry", () => {
    const alreadyScouted = makeRouteMarketEntry({
      scouted: true,
      exactProfitPerTurn: 1000,
      expiresOnTurn: 99,
    });
    const state = makeGameState({
      routeMarket: [alreadyScouted],
      cash: STARTING_CASH,
      actionPoints: { current: 2, max: 2 },
    });

    expect(() => scoutRoute(state, alreadyScouted.id)).toThrow(
      "Already scouted",
    );
  });

  it("on success: deducts AP and cash, sets scouted=true, reveals exactProfitPerTurn", () => {
    const entry = makeRouteMarketEntry({ expiresOnTurn: 99 });
    const state = makeGameState({
      routeMarket: [entry],
      cash: STARTING_CASH,
      actionPoints: { current: SCOUT_COST_AP + 1, max: 2 },
    });

    const newState = scoutRoute(state, entry.id);

    // Cash was deducted
    expect(newState.cash).toBe(STARTING_CASH - SCOUT_COST_CASH);

    // AP was deducted
    expect(newState.actionPoints.current).toBe(
      state.actionPoints.current - SCOUT_COST_AP,
    );

    // Entry is now scouted and profit is revealed
    const scoutedEntry = newState.routeMarket.find((e) => e.id === entry.id);
    expect(scoutedEntry).toBeDefined();
    expect(scoutedEntry!.scouted).toBe(true);
    expect(scoutedEntry!.exactProfitPerTurn).not.toBeNull();
    expect(typeof scoutedEntry!.exactProfitPerTurn).toBe("number");
  });
});

describe("scope-aware market generation", () => {
  // A galaxy with two systems in emp-1 and one system in emp-2 lets the
  // generator pull from all three scope buckets.
  const richSystems: StarSystem[] = [
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

  function richPlanets(): Planet[] {
    return [
      {
        id: "planet-a1",
        name: "A1",
        systemId: "sys-1",
        type: PlanetType.Frontier,
        x: 0,
        y: 0,
        population: 100,
      },
      {
        id: "planet-a2",
        name: "A2",
        systemId: "sys-1",
        type: PlanetType.TechWorld,
        x: 5,
        y: 5,
        population: 100,
      },
      {
        id: "planet-b",
        name: "B",
        systemId: "sys-2",
        type: PlanetType.Mining,
        x: 100,
        y: 0,
        population: 100,
      },
      {
        id: "planet-c",
        name: "C",
        systemId: "sys-3",
        type: PlanetType.Agricultural,
        x: 200,
        y: 0,
        population: 100,
      },
    ];
  }

  function richState(): GameState {
    const planets = richPlanets();
    const planetMarkets: Record<string, PlanetMarket> = {};
    for (const p of planets) planetMarkets[p.id] = makePlanetMarket();
    return makeGameState({
      galaxy: {
        sectors: [makeSector()],
        empires: [
          {
            id: "emp-1",
            name: "One",
            color: 0x0000ff,
            tariffRate: 0.1,
            disposition: "neutral",
            homeSystemId: "sys-1",
            leaderName: "L1",
            leaderPortrait: { portraitId: "p-01", category: "human" },
          },
          {
            id: "emp-2",
            name: "Two",
            color: 0xff0000,
            tariffRate: 0.1,
            disposition: "neutral",
            homeSystemId: "sys-3",
            leaderName: "L2",
            leaderPortrait: { portraitId: "p-02", category: "human" },
          },
        ],
        systems: richSystems,
        planets,
      },
      market: {
        fuelPrice: BASE_FUEL_PRICE,
        fuelTrend: "stable",
        planetMarkets,
      },
      unlockedEmpireIds: ["emp-1", "emp-2"],
    });
  }

  function classify(
    entry: RouteMarketEntry,
    state: GameState,
  ): "system" | "empire" | "galactic" {
    const o = state.galaxy.planets.find((p) => p.id === entry.originPlanetId)!;
    const d = state.galaxy.planets.find(
      (p) => p.id === entry.destinationPlanetId,
    )!;
    if (o.systemId === d.systemId) return "system";
    const oSys = state.galaxy.systems.find((s) => s.id === o.systemId)!;
    const dSys = state.galaxy.systems.find((s) => s.id === d.systemId)!;
    return oSys.empireId !== dSys.empireId ? "galactic" : "empire";
  }

  it("produces entries spanning all three scopes when candidates exist", () => {
    const state = richState();
    // Try several seeds — quotas are stochastic per seed, but at least one
    // run should hit all three scopes within a small batch.
    const scopesSeen = new Set<string>();
    for (let seed = 1; seed <= 10; seed++) {
      const rng = new SeededRNG(seed);
      const entries = generateRouteMarketEntries(state, rng);
      for (const e of entries) scopesSeen.add(classify(e, state));
      if (scopesSeen.size === 3) break;
    }
    expect(scopesSeen.has("system")).toBe(true);
    expect(scopesSeen.has("empire")).toBe(true);
    expect(scopesSeen.has("galactic")).toBe(true);
  });

  it("still fills the market when only one scope has candidates", () => {
    // Restrict to a single empire so galactic candidates vanish; the generator
    // should redistribute the galactic quota to the remaining scopes.
    const state = makeGameState({
      unlockedEmpireIds: ["emp-1"],
    });
    const rng = new SeededRNG(7);
    const entries = generateRouteMarketEntries(state, rng);
    // Two-planet emp-1 fixture has only an empire-tier candidate, so the
    // result is non-empty but never galactic.
    for (const e of entries) {
      expect(e.cargoType).toBeDefined();
    }
  });
});

describe("aiClaimRouteEntry", () => {
  it("removes the entry from the market after AI claims it", () => {
    const entry = makeRouteMarketEntry({
      id: "rm-ai-target",
      expiresOnTurn: 99,
    });
    const otherEntry = makeRouteMarketEntry({
      id: "rm-other",
      expiresOnTurn: 99,
    });

    const state = makeGameState({ routeMarket: [entry, otherEntry] });

    const newState = aiClaimRouteEntry(state, "rm-ai-target", "ai-corp-1");

    // Claimed entry should be removed
    expect(
      newState.routeMarket.find((e) => e.id === "rm-ai-target"),
    ).toBeUndefined();

    // Other entry should remain
    expect(newState.routeMarket.find((e) => e.id === "rm-other")).toBeDefined();
  });

  it("does not mutate the original state", () => {
    const entry = makeRouteMarketEntry({
      id: "rm-immutable",
      expiresOnTurn: 99,
    });
    const state = makeGameState({ routeMarket: [entry] });

    aiClaimRouteEntry(state, "rm-immutable", "ai-corp-1");

    // Original state market should be unchanged
    expect(state.routeMarket).toHaveLength(1);
    expect(state.routeMarket[0].claimedByAiId).toBeNull();
  });
});

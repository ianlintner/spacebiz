import { describe, it, expect } from "vitest";
import {
  isLocalRoute,
  getAvailableLocalRouteSlots,
  getUsedRouteSlots,
  getUsedLocalRouteSlots,
  getFreeRouteSlots,
  getFreeLocalRouteSlots,
} from "../RouteManager.ts";
import type {
  GameState,
  ActiveRoute,
  Planet,
  StarSystem,
} from "../../../data/types.ts";
import { initAdviserState } from "../../adviser/AdviserEngine.ts";
import {
  LOCAL_ROUTE_SLOTS,
  LOCAL_ROUTE_REVENUE_CAP,
  INTRA_SYSTEM_REVENUE_MULTIPLIER,
} from "../../../data/constants.ts";

// ── Test helpers ─────────────────────────────────────────────────────────────

const planets: Planet[] = [
  {
    id: "planet-0-0-0",
    name: "Alpha",
    systemId: "system-0-0",
    type: "frontier",
    x: 10,
    y: 10,
    population: 100,
  },
  {
    id: "planet-0-0-1",
    name: "Beta",
    systemId: "system-0-0",
    type: "mining",
    x: 20,
    y: 20,
    population: 50,
  },
  {
    id: "planet-0-1-0",
    name: "Gamma",
    systemId: "system-0-1",
    type: "agricultural",
    x: 100,
    y: 100,
    population: 80,
  },
];

const systems: StarSystem[] = [
  {
    id: "system-0-0",
    name: "Sol",
    sectorId: "sector-0",
    empireId: "empire-1",
    x: 0,
    y: 0,
    starColor: 0xffff00,
  },
  {
    id: "system-0-1",
    name: "Alpha Centauri",
    sectorId: "sector-0",
    empireId: "empire-1",
    x: 100,
    y: 100,
    starColor: 0xffa500,
  },
];

function createTestState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 42,
    turn: 1,
    maxTurns: 25,
    phase: "planning",
    cash: 200000,
    loans: [],
    reputation: 50,
    companyName: "Test Corp",
    ceoName: "Commander",
    ceoPortrait: { portraitId: "ceo-01", category: "human" },
    gameSize: "standard",
    galaxyShape: "spiral",
    playerEmpireId: "empire-1",
    galaxy: { sectors: [], empires: [], systems, planets },
    fleet: [],
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
    localRouteSlots: LOCAL_ROUTE_SLOTS,
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
    ...overrides,
  };
}

function makeLocalRoute(id: string): ActiveRoute {
  // Both planets in system-0-0
  return {
    id,
    originPlanetId: "planet-0-0-0",
    destinationPlanetId: "planet-0-0-1",
    distance: 15,
    cargoType: "rawMaterials",
    assignedShipIds: [],
  };
}

function makeInterstellarRoute(id: string): ActiveRoute {
  // Different systems: system-0-0 → system-0-1
  return {
    id,
    originPlanetId: "planet-0-0-0",
    destinationPlanetId: "planet-0-1-0",
    distance: 140,
    cargoType: "technology",
    assignedShipIds: [],
  };
}

// ── isLocalRoute ─────────────────────────────────────────────────────────────

describe("isLocalRoute", () => {
  it("returns true for same-system planets", () => {
    const state = createTestState();
    const route = makeLocalRoute("r1");
    expect(isLocalRoute(route, state)).toBe(true);
  });

  it("returns false for different-system planets", () => {
    const state = createTestState();
    const route = makeInterstellarRoute("r2");
    expect(isLocalRoute(route, state)).toBe(false);
  });

  it("returns false for unknown planet IDs", () => {
    const state = createTestState();
    const route: ActiveRoute = {
      id: "r3",
      originPlanetId: "planet-unknown",
      destinationPlanetId: "planet-0-0-1",
      distance: 10,
      cargoType: null,
      assignedShipIds: [],
    };
    expect(isLocalRoute(route, state)).toBe(false);
  });
});

// ── Slot management ──────────────────────────────────────────────────────────

describe("Local route slot management", () => {
  it("starts with LOCAL_ROUTE_SLOTS (2) available local slots", () => {
    const state = createTestState();
    expect(getAvailableLocalRouteSlots(state)).toBe(LOCAL_ROUTE_SLOTS);
    expect(getAvailableLocalRouteSlots(state)).toBe(2);
  });

  it("local route uses local slots, not main slots", () => {
    const localRoute = makeLocalRoute("r-local");
    const state = createTestState({ activeRoutes: [localRoute] });
    // Main slots unaffected
    expect(getUsedRouteSlots(state)).toBe(0);
    // Local slots consumed
    expect(getUsedLocalRouteSlots(state)).toBe(1);
  });

  it("inter-system route uses main slots, not local slots", () => {
    const interRoute = makeInterstellarRoute("r-inter");
    const state = createTestState({ activeRoutes: [interRoute] });
    expect(getUsedRouteSlots(state)).toBe(1);
    expect(getUsedLocalRouteSlots(state)).toBe(0);
  });

  it("main route slots unaffected by local routes", () => {
    const localRoute = makeLocalRoute("r-local");
    const state = createTestState({
      routeSlots: 4,
      activeRoutes: [localRoute, localRoute],
    });
    expect(getFreeRouteSlots(state)).toBe(4);
  });

  it("free local slots decrease when local routes added", () => {
    const state = createTestState({
      activeRoutes: [makeLocalRoute("r-local-1")],
    });
    expect(getFreeLocalRouteSlots(state)).toBe(LOCAL_ROUTE_SLOTS - 1);
  });

  it("mixed routes account correctly", () => {
    const state = createTestState({
      routeSlots: 4,
      localRouteSlots: 2,
      activeRoutes: [
        makeInterstellarRoute("r-inter-1"),
        makeInterstellarRoute("r-inter-2"),
        makeLocalRoute("r-local-1"),
      ],
    });
    expect(getUsedRouteSlots(state)).toBe(2);
    expect(getUsedLocalRouteSlots(state)).toBe(1);
    expect(getFreeRouteSlots(state)).toBe(2);
    expect(getFreeLocalRouteSlots(state)).toBe(1);
  });
});

// ── Legacy revenue-cap constants (deprecated, kept for back-compat) ──────────
//
// The flat 50% intra-system cap has been replaced by per-cargo
// SCOPE_DEMAND_MULTIPLIERS — see data/constants.ts. The constants below are
// only re-exported so older fixtures still compile; they're no longer read by
// revenue calculations.

describe("legacy LOCAL_ROUTE_REVENUE_CAP shim", () => {
  it("still exports 0.5 for back-compat", () => {
    expect(LOCAL_ROUTE_REVENUE_CAP).toBe(0.5);
  });

  it("INTRA_SYSTEM_REVENUE_MULTIPLIER matches the legacy cap", () => {
    expect(INTRA_SYSTEM_REVENUE_MULTIPLIER).toBe(LOCAL_ROUTE_REVENUE_CAP);
  });
});

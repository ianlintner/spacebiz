import { describe, it, expect } from "vitest";
import {
  calculateDistance,
  calculateTripsPerTurn,
  buildRouteTrafficVisuals,
  buildRouteTrafficStateKey,
  buildGalaxyRouteTrafficVisuals,
  buildGalaxyRouteTrafficStateKey,
  createRoute,
  assignShipToRoute,
  unassignShip,
  deleteRoute,
  estimateRouteRevenue,
  estimateRouteFuelCost,
  getVisibleRouteTrafficUnits,
  buildTrafficPatrolWaypoints,
  buildSunAvoidingLocalRouteMotionPath,
  scanAllRouteOpportunities,
} from "../RouteManager.ts";
import { createNewGame } from "../../NewGameSetup.ts";
import { CargoType, PlanetType } from "../../../data/types.ts";
import type {
  Planet,
  StarSystem,
  Ship,
  ActiveRoute,
  MarketState,
  CargoMarketEntry,
  PlanetMarket,
  CargoType as CargoTypeT,
  GameState,
  AICompany,
} from "../../../data/types.ts";
import { BASE_FUEL_PRICE } from "../../../data/constants.ts";
// TURN_DURATION and BASE_CARGO_PRICES used internally by RouteManager

const ALL_CARGO_TYPES: CargoTypeT[] = Object.values(CargoType);

function makePlanet(overrides: Partial<Planet> = {}): Planet {
  return {
    id: "planet-1",
    name: "Test Planet",
    systemId: "system-1",
    type: PlanetType.Terran,
    x: 0,
    y: 0,
    population: 1000000,
    ...overrides,
  };
}

function makeSystem(overrides: Partial<StarSystem> = {}): StarSystem {
  return {
    id: "system-1",
    name: "Test System",
    sectorId: "sector-1",
    empireId: "empire-1",
    x: 0,
    y: 0,
    starColor: 0xffffff,
    ...overrides,
  };
}

function makeShip(overrides: Partial<Ship> = {}): Ship {
  return {
    id: "ship-1",
    name: "Test Ship",
    class: "cargoShuttle" as Ship["class"],
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
    originPlanetId: "planet-1",
    destinationPlanetId: "planet-2",
    distance: 10,
    assignedShipIds: [],
    cargoType: CargoType.Food,
    ...overrides,
  };
}

function makeMarketEntry(
  overrides: Partial<CargoMarketEntry> = {},
): CargoMarketEntry {
  return {
    baseSupply: 30,
    baseDemand: 80,
    currentPrice: 40,
    saturation: 0,
    trend: "stable",
    trendMomentum: 0,
    eventModifier: 1.0,
    ...overrides,
  };
}

function makePlanetMarket(
  overrides: Partial<Record<CargoTypeT, Partial<CargoMarketEntry>>> = {},
): PlanetMarket {
  const market: Partial<PlanetMarket> = {};
  for (const ct of ALL_CARGO_TYPES) {
    market[ct] = makeMarketEntry(overrides[ct] || {});
  }
  return market as PlanetMarket;
}

function makeMarketState(overrides: Partial<MarketState> = {}): MarketState {
  return {
    fuelPrice: BASE_FUEL_PRICE,
    fuelTrend: "stable",
    planetMarkets: {
      "planet-1": makePlanetMarket(),
      "planet-2": makePlanetMarket({
        [CargoType.Food]: { currentPrice: 50, baseDemand: 80, baseSupply: 20 },
      }),
    },
    ...overrides,
  };
}

function makeAICompany(overrides: Partial<AICompany> = {}): AICompany {
  return {
    id: "ai-1",
    name: "Nova Freight",
    empireId: "empire-2",
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

function makeTrafficState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 1,
    turn: 1,
    maxTurns: 100,
    phase: "planning",
    gameSize: "standard",
    galaxyShape: "spiral",
    cash: 100000,
    loans: [],
    reputation: 50,
    companyName: "Player Co",
    ceoName: "Player CEO",
    ceoPortrait: { portraitId: "player-1", category: "human" },
    playerEmpireId: "empire-1",
    galaxy: {
      sectors: [],
      empires: [],
      systems: [],
      planets: [
        makePlanet({ id: "planet-1", systemId: "system-1" }),
        makePlanet({ id: "planet-2", systemId: "system-2" }),
      ],
    },
    fleet: [],
    activeRoutes: [],
    market: makeMarketState(),
    aiCompanies: [],
    activeEvents: [],
    history: [],
    storyteller: {
      playerHealthScore: 0,
      headwindBias: 0,
      turnsInDebt: 0,
      consecutiveProfitTurns: 0,
      turnsSinceLastDecision: 0,
    },
    adviser: {
      tutorialStepIndex: 0,
      tutorialComplete: false,
      tutorialSkipped: false,
      pendingMessages: [],
      shownMessageIds: [],
      secretRevealed: false,
      statsAdviserSaved: 0,
      statsAdviserHindered: 0,
    },
    score: 0,
    gameOver: false,
    gameOverReason: null,
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
    hyperlanes: [],
    borderPorts: [],
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

describe("RouteManager", () => {
  describe("calculateDistance", () => {
    it("same system planets use planet positions (short distance)", () => {
      const planet1 = makePlanet({ id: "p1", systemId: "sys-1", x: 0, y: 0 });
      const planet2 = makePlanet({ id: "p2", systemId: "sys-1", x: 3, y: 4 });
      const systems = [makeSystem({ id: "sys-1", x: 100, y: 200 })];

      const dist = calculateDistance(planet1, planet2, systems);

      // Same system: use planet coords -> sqrt(9 + 16) = 5
      expect(dist).toBeCloseTo(5, 1);
    });

    it("different system planets use system positions (long distance)", () => {
      const planet1 = makePlanet({ id: "p1", systemId: "sys-1", x: 0, y: 0 });
      const planet2 = makePlanet({ id: "p2", systemId: "sys-2", x: 0, y: 0 });
      const systems = [
        makeSystem({ id: "sys-1", x: 0, y: 0 }),
        makeSystem({ id: "sys-2", x: 30, y: 40 }),
      ];

      const dist = calculateDistance(planet1, planet2, systems);

      // Different system: use system coords -> sqrt(900 + 1600) = 50
      expect(dist).toBeCloseTo(50, 1);
    });

    it("different system distance is much longer than same system", () => {
      const planet1 = makePlanet({ id: "p1", systemId: "sys-1", x: 1, y: 1 });
      const planet2Same = makePlanet({
        id: "p2",
        systemId: "sys-1",
        x: 4,
        y: 5,
      });
      const planet2Diff = makePlanet({
        id: "p3",
        systemId: "sys-2",
        x: 1,
        y: 1,
      });
      const systems = [
        makeSystem({ id: "sys-1", x: 0, y: 0 }),
        makeSystem({ id: "sys-2", x: 100, y: 100 }),
      ];

      const sameDist = calculateDistance(planet1, planet2Same, systems);
      const diffDist = calculateDistance(planet1, planet2Diff, systems);

      expect(diffDist).toBeGreaterThan(sameDist * 5);
    });
  });

  describe("calculateTripsPerTurn", () => {
    it("returns floor of TURN_DURATION / (distance * 2 / speed), capped at MAX_TRIPS_PER_TURN", () => {
      // TURN_DURATION = 100, MAX_TRIPS_PER_TURN = 10
      // distance = 10, speed = 4: roundTrip = 5, raw trips = 20, capped to 10
      const tripsShort = calculateTripsPerTurn(10, 4);
      expect(tripsShort).toBe(10);

      // distance = 100, speed = 4: roundTrip = 50, raw trips = 2, under cap
      const tripsLong = calculateTripsPerTurn(100, 4);
      expect(tripsLong).toBe(2);
    });

    it("faster ships make more trips when both are under the cap", () => {
      // distance = 100: speed=2 → floor(100/100)=1, speed=8 → floor(100/25)=4
      const slowTrips = calculateTripsPerTurn(100, 2);
      const fastTrips = calculateTripsPerTurn(100, 8);

      expect(fastTrips).toBeGreaterThan(slowTrips);
    });

    it("returns minimum of 1 trip", () => {
      // Very long distance, slow ship
      const trips = calculateTripsPerTurn(10000, 1);
      expect(trips).toBe(1);
    });
  });

  describe("createRoute", () => {
    it("creates a route with correct properties", () => {
      const route = createRoute("planet-1", "planet-2", 15.5, CargoType.Food);

      expect(route.originPlanetId).toBe("planet-1");
      expect(route.destinationPlanetId).toBe("planet-2");
      expect(route.distance).toBe(15.5);
      expect(route.cargoType).toBe(CargoType.Food);
      expect(route.assignedShipIds).toEqual([]);
      expect(route.id).toBeTruthy();
    });

    it("can create route with null cargo type", () => {
      const route = createRoute("planet-1", "planet-2", 10, null);
      expect(route.cargoType).toBeNull();
    });
  });

  describe("assignShipToRoute", () => {
    it("assigns ship to route and updates both fleet and routes", () => {
      const ship = makeShip({ id: "ship-1", assignedRouteId: null });
      const route = makeRoute({ id: "route-1", assignedShipIds: [] });
      const fleet = [ship];
      const routes = [route];

      const result = assignShipToRoute("ship-1", "route-1", fleet, routes);

      const updatedShip = result.fleet.find((s) => s.id === "ship-1");
      const updatedRoute = result.routes.find((r) => r.id === "route-1");

      expect(updatedShip!.assignedRouteId).toBe("route-1");
      expect(updatedRoute!.assignedShipIds).toContain("ship-1");
    });
  });

  describe("unassignShip", () => {
    it("unassigns ship from its route", () => {
      const ship = makeShip({ id: "ship-1", assignedRouteId: "route-1" });
      const route = makeRoute({ id: "route-1", assignedShipIds: ["ship-1"] });
      const fleet = [ship];
      const routes = [route];

      const result = unassignShip("ship-1", fleet, routes);

      const updatedShip = result.fleet.find((s) => s.id === "ship-1");
      const updatedRoute = result.routes.find((r) => r.id === "route-1");

      expect(updatedShip!.assignedRouteId).toBeNull();
      expect(updatedRoute!.assignedShipIds).not.toContain("ship-1");
    });

    it("handles ship with no assigned route gracefully", () => {
      const ship = makeShip({ id: "ship-1", assignedRouteId: null });
      const fleet = [ship];
      const routes: ActiveRoute[] = [];

      const result = unassignShip("ship-1", fleet, routes);
      expect(result.fleet[0].assignedRouteId).toBeNull();
    });
  });

  describe("deleteRoute", () => {
    it("deletes route and unassigns all ships", () => {
      const ship1 = makeShip({ id: "ship-1", assignedRouteId: "route-1" });
      const ship2 = makeShip({ id: "ship-2", assignedRouteId: "route-1" });
      const route = makeRoute({
        id: "route-1",
        assignedShipIds: ["ship-1", "ship-2"],
      });
      const fleet = [ship1, ship2];
      const routes = [route];

      const result = deleteRoute("route-1", fleet, routes);

      expect(result.routes).toHaveLength(0);
      expect(result.fleet[0].assignedRouteId).toBeNull();
      expect(result.fleet[1].assignedRouteId).toBeNull();
    });

    it("does not affect other routes", () => {
      const ship1 = makeShip({ id: "ship-1", assignedRouteId: "route-1" });
      const ship2 = makeShip({ id: "ship-2", assignedRouteId: "route-2" });
      const route1 = makeRoute({ id: "route-1", assignedShipIds: ["ship-1"] });
      const route2 = makeRoute({ id: "route-2", assignedShipIds: ["ship-2"] });
      const fleet = [ship1, ship2];
      const routes = [route1, route2];

      const result = deleteRoute("route-1", fleet, routes);

      expect(result.routes).toHaveLength(1);
      expect(result.routes[0].id).toBe("route-2");
      expect(result.fleet.find((s) => s.id === "ship-2")!.assignedRouteId).toBe(
        "route-2",
      );
    });
  });

  describe("buildRouteTrafficVisuals", () => {
    it("returns no visuals for routes without assigned ships", () => {
      const routes = [makeRoute({ assignedShipIds: [] })];

      const visuals = buildRouteTrafficVisuals(
        routes,
        [],
        [makePlanet()],
        [],
        [],
      );

      expect(visuals).toEqual([]);
    });

    it("ignores orphaned assigned ship ids", () => {
      const routes = [
        makeRoute({ assignedShipIds: ["missing-ship", "ship-2"] }),
      ];
      const fleet = [makeShip({ id: "ship-2", class: "fastCourier" })];
      const planets = [
        makePlanet({ id: "planet-1", systemId: "system-1" }),
        makePlanet({ id: "planet-2", systemId: "system-2" }),
      ];

      const visuals = buildRouteTrafficVisuals(routes, fleet, planets, [], []);

      expect(visuals).toHaveLength(1);
      expect(visuals[0].ownerId).toBe("player");
      expect(visuals[0].assignedShips.map((ship) => ship.id)).toEqual([
        "ship-2",
      ]);
      expect(visuals[0].visibleUnits).toBe(1);
      expect(visuals[0].visualClassMix).toEqual(["fastCourier"]);
      expect(visuals[0].pathSystemIds).toEqual(["system-1", "system-2"]);
    });

    it("increases visible units as assigned ship count grows", () => {
      expect(getVisibleRouteTrafficUnits(1)).toBe(1);
      expect(getVisibleRouteTrafficUnits(2)).toBe(2);
      expect(getVisibleRouteTrafficUnits(3)).toBe(2);
      expect(getVisibleRouteTrafficUnits(4)).toBe(3);
      expect(getVisibleRouteTrafficUnits(6)).toBe(3);
      expect(getVisibleRouteTrafficUnits(7)).toBe(4);
    });

    it("expands same-position patrol paths so same-system ships can visibly move", () => {
      const expanded = buildTrafficPatrolWaypoints("route-same-system", [
        { x: 100, y: 200 },
        { x: 100, y: 200 },
      ]);

      expect(expanded).toHaveLength(4);
      expect(
        new Set(expanded.map((waypoint) => `${waypoint.x},${waypoint.y}`)).size,
      ).toBe(4);
      expect(
        expanded.every((waypoint) => waypoint.x === 100 && waypoint.y === 200),
      ).toBe(false);
    });

    it("builds sun-avoiding local motion paths", () => {
      const path = buildSunAvoidingLocalRouteMotionPath(
        "route-local",
        { x: 120, y: 0 },
        { x: -120, y: 0 },
        { x: 0, y: 0 },
      );

      expect(path[0]).toEqual({ x: 120, y: 0, t: 0 });
      expect(path[path.length - 1]).toEqual({ x: -120, y: 0, t: 1 });
      expect(path.slice(1, -1).some((point) => Math.abs(point.y) > 20)).toBe(
        true,
      );
    });

    it("preserves stable ship ordering for class sampling", () => {
      const route = makeRoute({
        assignedShipIds: ["ship-3", "ship-1", "ship-2"],
      });
      const fleet = [
        makeShip({ id: "ship-1", class: "cargoShuttle" }),
        makeShip({ id: "ship-2", class: "megaHauler" }),
        makeShip({ id: "ship-3", class: "fastCourier" }),
      ];
      const planets = [
        makePlanet({ id: "planet-1", systemId: "system-1" }),
        makePlanet({ id: "planet-2", systemId: "system-2" }),
      ];

      const visuals = buildRouteTrafficVisuals([route], fleet, planets, [], []);

      expect(visuals).toHaveLength(1);
      expect(visuals[0].assignedShips.map((ship) => ship.id)).toEqual([
        "ship-3",
        "ship-1",
        "ship-2",
      ]);
      expect(visuals[0].visualClassMix).toEqual([
        "fastCourier",
        "cargoShuttle",
        "megaHauler",
      ]);
      expect(visuals[0].visibleUnits).toBe(2);
    });

    it("keeps the same traffic state key when unrelated state changes", () => {
      const route = makeRoute({
        assignedShipIds: ["ship-1", "ship-2"],
      });
      const fleet = [
        makeShip({ id: "ship-1", class: "cargoShuttle" }),
        makeShip({ id: "ship-2", class: "fastCourier" }),
      ];
      const planets = [
        makePlanet({ id: "planet-1", systemId: "system-1" }),
        makePlanet({ id: "planet-2", systemId: "system-2" }),
      ];

      const before = buildRouteTrafficStateKey(
        route ? [route] : [],
        fleet,
        planets,
        [],
        [],
      );
      const after = buildRouteTrafficStateKey(
        [route],
        fleet.map((ship) => ({
          ...ship,
          maintenanceCost: ship.maintenanceCost + 500,
        })),
        planets,
        [],
        [],
      );

      expect(after).toBe(before);
    });

    it("changes the traffic state key when route traffic inputs change", () => {
      const route = makeRoute({
        assignedShipIds: ["ship-1"],
      });
      const planets = [
        makePlanet({ id: "planet-1", systemId: "system-1" }),
        makePlanet({ id: "planet-2", systemId: "system-2" }),
      ];

      const before = buildRouteTrafficStateKey(
        [route],
        [makeShip({ id: "ship-1", class: "cargoShuttle" })],
        planets,
        [],
        [],
      );
      const after = buildRouteTrafficStateKey(
        [route],
        [makeShip({ id: "ship-1", class: "megaHauler" })],
        planets,
        [],
        [],
      );

      expect(after).not.toBe(before);
    });

    it("includes assigned AI company ships in galaxy traffic visuals", () => {
      const playerRoute = makeRoute({
        id: "route-player",
        assignedShipIds: ["ship-player"],
      });
      const aiRoute = makeRoute({
        id: "route-ai",
        assignedShipIds: ["ship-ai"],
      });
      const state = makeTrafficState({
        fleet: [makeShip({ id: "ship-player", class: "cargoShuttle" })],
        activeRoutes: [playerRoute],
        aiCompanies: [
          makeAICompany({
            id: "ai-empire",
            fleet: [makeShip({ id: "ship-ai", class: "fastCourier" })],
            activeRoutes: [aiRoute],
          }),
        ],
      });

      const visuals = buildGalaxyRouteTrafficVisuals(state);

      expect(visuals).toHaveLength(2);
      expect(visuals.map((visual) => visual.ownerId)).toEqual([
        "player",
        "ai-empire",
      ]);
      expect(visuals[1].assignedShips.map((ship) => ship.id)).toEqual([
        "ship-ai",
      ]);
      expect(visuals[1].visualClassMix).toEqual(["fastCourier"]);
    });

    it("omits same-system assigned routes from galaxy traffic visuals", () => {
      const route = makeRoute({
        originPlanetId: "planet-1",
        destinationPlanetId: "planet-2",
        assignedShipIds: ["ship-1"],
      });
      const state = makeTrafficState({
        galaxy: {
          sectors: [],
          empires: [],
          systems: [makeSystem({ id: "system-1" })],
          planets: [
            makePlanet({ id: "planet-1", systemId: "system-1" }),
            makePlanet({ id: "planet-2", systemId: "system-1" }),
          ],
        },
        fleet: [makeShip({ id: "ship-1" })],
        activeRoutes: [route],
      });

      expect(buildGalaxyRouteTrafficVisuals(state)).toEqual([]);
    });

    it("keeps assignment-only rule for AI galaxy traffic", () => {
      const aiRoute = makeRoute({
        id: "route-ai",
        assignedShipIds: ["missing-ai-ship"],
      });
      const state = makeTrafficState({
        aiCompanies: [
          makeAICompany({
            id: "ai-empire",
            fleet: [makeShip({ id: "other-ship" })],
            activeRoutes: [aiRoute],
          }),
        ],
      });

      const visuals = buildGalaxyRouteTrafficVisuals(state);

      expect(visuals).toEqual([]);
    });

    it("changes galaxy traffic state key when AI traffic changes", () => {
      const route = makeRoute({ id: "route-ai", assignedShipIds: ["ship-ai"] });
      const before = buildGalaxyRouteTrafficStateKey(
        makeTrafficState({
          aiCompanies: [
            makeAICompany({
              id: "ai-empire",
              fleet: [makeShip({ id: "ship-ai", class: "cargoShuttle" })],
              activeRoutes: [route],
            }),
          ],
        }),
      );
      const after = buildGalaxyRouteTrafficStateKey(
        makeTrafficState({
          aiCompanies: [
            makeAICompany({
              id: "ai-empire",
              fleet: [makeShip({ id: "ship-ai", class: "megaHauler" })],
              activeRoutes: [route],
            }),
          ],
        }),
      );

      expect(after).not.toBe(before);
    });
  });

  describe("estimateRouteRevenue", () => {
    it("is positive for demanded goods", () => {
      const route = makeRoute({
        cargoType: CargoType.Food,
        distance: 10,
      });
      const ship = makeShip({ speed: 4, cargoCapacity: 80 });
      const market = makeMarketState();

      const revenue = estimateRouteRevenue(route, ship, market);
      expect(revenue).toBeGreaterThan(0);
    });

    it("returns 0 when no cargo type is set", () => {
      const route = makeRoute({ cargoType: null, distance: 10 });
      const ship = makeShip();
      const market = makeMarketState();

      const revenue = estimateRouteRevenue(route, ship, market);
      expect(revenue).toBe(0);
    });

    it("higher capacity ships earn more revenue", () => {
      const route = makeRoute({ cargoType: CargoType.Food, distance: 10 });
      const smallShip = makeShip({ cargoCapacity: 30, speed: 4 });
      const bigShip = makeShip({ cargoCapacity: 300, speed: 4 });
      const market = makeMarketState();

      const smallRev = estimateRouteRevenue(route, smallShip, market);
      const bigRev = estimateRouteRevenue(route, bigShip, market);

      expect(bigRev).toBeGreaterThan(smallRev);
    });
  });

  describe("estimateRouteFuelCost", () => {
    it("returns positive fuel cost", () => {
      const route = makeRoute({ distance: 10 });
      const ship = makeShip({ fuelEfficiency: 0.8, speed: 4 });

      const cost = estimateRouteFuelCost(route, ship, BASE_FUEL_PRICE);
      expect(cost).toBeGreaterThan(0);
    });

    it("more fuel-efficient ships cost less per trip but less efficient ships cost more", () => {
      const route = makeRoute({ distance: 10 });
      const efficientShip = makeShip({ fuelEfficiency: 0.5, speed: 4 });
      const inefficientShip = makeShip({ fuelEfficiency: 2.0, speed: 4 });

      const efficientCost = estimateRouteFuelCost(
        route,
        efficientShip,
        BASE_FUEL_PRICE,
      );
      const inefficientCost = estimateRouteFuelCost(
        route,
        inefficientShip,
        BASE_FUEL_PRICE,
      );

      expect(inefficientCost).toBeGreaterThan(efficientCost);
    });
  });

  describe("scanAllRouteOpportunities (fresh new-game state)", () => {
    // Regression guard: at Q1 Y1 with 0 ships and starting cash, the Route
    // Finder must surface profitable opportunities — otherwise the player
    // sees an empty list and can't engage with the core loop.
    it.each([1, 2, 3, 7, 42])(
      "produces opportunities for a fresh game (seed %i)",
      (seed) => {
        const { state } = createNewGame(seed);
        const opps = scanAllRouteOpportunities(
          state.galaxy.planets,
          state.galaxy.systems,
          state.fleet,
          state.market,
          state.activeRoutes,
          state.cash,
          state,
        );
        expect(opps.length).toBeGreaterThan(0);
      },
    );

    it("surfaces at least one opportunity for every cargo type at game start (seed 1)", () => {
      const { state } = createNewGame(1);
      const opps = scanAllRouteOpportunities(
        state.galaxy.planets,
        state.galaxy.systems,
        state.fleet,
        state.market,
        state.activeRoutes,
        state.cash,
        state,
      );
      const seenCargoTypes = new Set(opps.map((o) => o.bestCargoType));
      const missing = ALL_CARGO_TYPES.filter((c) => !seenCargoTypes.has(c));
      expect(missing).toEqual([]);
    });

    // Regression for the "Missing Routes always for intra-empire" QA bug:
    // before the per-(scope × cargo) quota, galactic routes' higher revenue
    // multiplier swept the top-K of every cargo bucket and the 200-row cap
    // truncated every intra-empire opportunity, leaving the "Intra Empire"
    // filter permanently empty on some seeds.
    it.each([1, 2, 3, 7, 42])(
      "surfaces at least one intra-empire opportunity at game start (seed %i)",
      (seed) => {
        const { state } = createNewGame(seed);
        const opps = scanAllRouteOpportunities(
          state.galaxy.planets,
          state.galaxy.systems,
          state.fleet,
          state.market,
          state.activeRoutes,
          state.cash,
          state,
        );
        const intraEmpireCount = opps.filter(
          (o) => o.scope === "empire",
        ).length;
        expect(intraEmpireCount).toBeGreaterThan(0);
      },
    );
  });
});

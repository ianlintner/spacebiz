import { describe, it, expect } from "vitest";
import { selectEvents, applyEventEffects, tickEvents } from "../EventEngine.ts";
import type { GalaxyInfo } from "../EventEngine.ts";
import { SeededRNG } from "../../../utils/SeededRNG.ts";
import {
  EventCategory,
  CargoType,
  PlanetType,
  ShipClass,
} from "../../../data/types.ts";
import type {
  StorytellerState,
  GameState,
  GameEvent,
  Planet,
  StarSystem,
  ActiveRoute,
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

function makeGalaxy(): GalaxyInfo {
  const systems: StarSystem[] = [
    {
      id: "sys-alpha",
      name: "Alpha Centauri",
      sectorId: "sec-1",
      empireId: "emp-1",
      x: 100,
      y: 100,
      starColor: 0xffcc00,
    },
    {
      id: "sys-beta",
      name: "Beta Eridani",
      sectorId: "sec-1",
      empireId: "emp-1",
      x: 300,
      y: 200,
      starColor: 0xff6600,
    },
  ];

  const planets: Planet[] = [
    {
      id: "planet-a1",
      name: "New Terra",
      systemId: "sys-alpha",
      type: PlanetType.Terran,
      x: 120,
      y: 110,
      population: 1_000_000,
    },
    {
      id: "planet-a2",
      name: "Ironhold",
      systemId: "sys-alpha",
      type: PlanetType.Mining,
      x: 140,
      y: 130,
      population: 50_000,
    },
    {
      id: "planet-b1",
      name: "Harvest Prime",
      systemId: "sys-beta",
      type: PlanetType.Agricultural,
      x: 310,
      y: 210,
      population: 200_000,
    },
  ];

  return { systems, planets };
}

function makeRoutes(): ActiveRoute[] {
  return [
    {
      id: "route-001",
      originPlanetId: "planet-a1",
      destinationPlanetId: "planet-b1",
      distance: 250,
      assignedShipIds: ["ship-1"],
      cargoType: CargoType.Food,
    },
  ];
}

function makeStorytellerNeutral(): StorytellerState {
  return {
    playerHealthScore: 50,
    headwindBias: 0,
    turnsInDebt: 0,
    consecutiveProfitTurns: 0,
  };
}

function makeMinimalGameState(): GameState {
  const galaxy = makeGalaxy();
  const planetMarkets: GameState["market"]["planetMarkets"] = {};
  for (const planet of galaxy.planets) {
    const cargoTypes = Object.values(CargoType);
    const market: Record<
      string,
      {
        baseSupply: number;
        baseDemand: number;
        currentPrice: number;
        saturation: number;
        trend: "stable";
        trendMomentum: number;
        eventModifier: number;
      }
    > = {};
    for (const ct of cargoTypes) {
      market[ct] = {
        baseSupply: 100,
        baseDemand: 100,
        currentPrice: 20,
        saturation: 0,
        trend: "stable",
        trendMomentum: 0,
        eventModifier: 0,
      };
    }
    planetMarkets[planet.id] =
      market as GameState["market"]["planetMarkets"][string];
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
    gameSize: "small",
    galaxyShape: "spiral",
    playerEmpireId: "",
    galaxy: {
      sectors: [{ id: "sec-1", name: "Sector 1", x: 0, y: 0, color: 0xffffff }],
      empires: [],
      systems: galaxy.systems,
      planets: galaxy.planets,
    },
    fleet: [
      {
        id: "ship-1",
        name: "Shuttle Alpha",
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
      },
    ],
    activeRoutes: makeRoutes(),
    market: {
      fuelPrice: BASE_FUEL_PRICE,
      fuelTrend: "stable",
      planetMarkets,
    },
    aiCompanies: [],
    activeEvents: [],
    history: [],
    storyteller: makeStorytellerNeutral(),
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
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EventEngine", () => {
  describe("selectEvents", () => {
    it("returns between 1 and 3 events", () => {
      const rng = new SeededRNG(42);
      const galaxy = makeGalaxy();
      const routes = makeRoutes();
      const storyteller = makeStorytellerNeutral();

      const events = selectEvents(rng, storyteller, galaxy, routes);
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events.length).toBeLessThanOrEqual(3);
    });

    it("events have non-empty ids", () => {
      const rng = new SeededRNG(123);
      const galaxy = makeGalaxy();
      const routes = makeRoutes();
      const storyteller = makeStorytellerNeutral();

      const events = selectEvents(rng, storyteller, galaxy, routes);
      for (const event of events) {
        expect(event.id).toBeTruthy();
        expect(event.id.length).toBeGreaterThan(0);
      }
    });

    it("events have concrete targetIds (not empty) for effects that need them", () => {
      const galaxy = makeGalaxy();
      const routes = makeRoutes();
      const storyteller = makeStorytellerNeutral();

      // Run several rounds to ensure we get events with targetable effects
      for (let seed = 1; seed <= 20; seed++) {
        const localRng = new SeededRNG(seed);
        const events = selectEvents(localRng, storyteller, galaxy, routes);
        for (const event of events) {
          for (const effect of event.effects) {
            if (
              effect.type === "modifyDemand" ||
              effect.type === "modifySpeed" ||
              effect.type === "blockRoute" ||
              effect.type === "blockPassengers"
            ) {
              expect(effect.targetId).toBeTruthy();
            }
          }
        }
      }
    });

    it("is deterministic for the same seed", () => {
      const galaxy = makeGalaxy();
      const routes = makeRoutes();
      const storyteller = makeStorytellerNeutral();

      const rng1 = new SeededRNG(777);
      const events1 = selectEvents(rng1, storyteller, galaxy, routes);

      const rng2 = new SeededRNG(777);
      const events2 = selectEvents(rng2, storyteller, galaxy, routes);

      expect(events1.length).toBe(events2.length);
      for (let i = 0; i < events1.length; i++) {
        expect(events1[i].name).toBe(events2[i].name);
        expect(events1[i].category).toBe(events2[i].category);
        expect(events1[i].description).toBe(events2[i].description);
      }
    });

    it("different seeds produce different results", () => {
      const galaxy = makeGalaxy();
      const routes = makeRoutes();
      const storyteller = makeStorytellerNeutral();

      // Collect event names from many seeds to ensure variety
      const allNames = new Set<string>();
      for (let seed = 1; seed <= 50; seed++) {
        const rng = new SeededRNG(seed);
        const events = selectEvents(rng, storyteller, galaxy, routes);
        for (const event of events) {
          allNames.add(event.name);
        }
      }
      // With 20 templates and 50 seeds, we should see variety
      expect(allNames.size).toBeGreaterThan(5);
    });

    it("events have valid categories", () => {
      const rng = new SeededRNG(55);
      const galaxy = makeGalaxy();
      const routes = makeRoutes();
      const storyteller = makeStorytellerNeutral();

      const validCategories = Object.values(EventCategory);
      const events = selectEvents(rng, storyteller, galaxy, routes);
      for (const event of events) {
        expect(validCategories).toContain(event.category);
      }
    });
  });

  describe("applyEventEffects", () => {
    it("modifyCash changes cash balance", () => {
      const state = makeMinimalGameState();
      const event: GameEvent = {
        id: "test-cash-1",
        name: "Cash Bonus",
        description: "Test",
        category: EventCategory.Opportunity,
        duration: 1,
        effects: [{ type: "modifyCash", value: 20000 }],
      };

      const newState = applyEventEffects(event, state);
      expect(newState.cash).toBe(state.cash + 20000);
    });

    it("modifyReputation adjusts reputation", () => {
      const state = makeMinimalGameState();
      const event: GameEvent = {
        id: "test-rep-1",
        name: "Rep Boost",
        description: "Test",
        category: EventCategory.Flavor,
        duration: 1,
        effects: [{ type: "modifyReputation", value: 5 }],
      };

      const newState = applyEventEffects(event, state);
      expect(newState.reputation).toBe(55);
    });

    it("modifyReputation clamps to 0-100", () => {
      const state = { ...makeMinimalGameState(), reputation: 98 };
      const event: GameEvent = {
        id: "test-rep-2",
        name: "Rep Boost Max",
        description: "Test",
        category: EventCategory.Flavor,
        duration: 1,
        effects: [{ type: "modifyReputation", value: 10 }],
      };

      const newState = applyEventEffects(event, state);
      expect(newState.reputation).toBe(100);
    });

    it("modifyPrice without cargoType changes fuel price", () => {
      const state = makeMinimalGameState();
      const event: GameEvent = {
        id: "test-fuel-1",
        name: "Fuel Change",
        description: "Test",
        category: EventCategory.Market,
        duration: 2,
        effects: [{ type: "modifyPrice", value: 0.4 }],
      };

      const newState = applyEventEffects(event, state);
      expect(newState.market.fuelPrice).toBeCloseTo(BASE_FUEL_PRICE * 1.4);
    });

    it("modifyDemand updates eventModifier on target planet market", () => {
      const state = makeMinimalGameState();
      const event: GameEvent = {
        id: "test-demand-1",
        name: "Demand Surge",
        description: "Test",
        category: EventCategory.Market,
        duration: 2,
        effects: [
          {
            type: "modifyDemand",
            targetId: "planet-a1",
            cargoType: CargoType.Food,
            value: 0.8,
          },
        ],
      };

      const newState = applyEventEffects(event, state);
      expect(
        newState.market.planetMarkets["planet-a1"][CargoType.Food]
          .eventModifier,
      ).toBeCloseTo(0.8);
    });

    it("does not mutate original state", () => {
      const state = makeMinimalGameState();
      const originalCash = state.cash;
      const event: GameEvent = {
        id: "test-mutate-1",
        name: "Cash Bonus",
        description: "Test",
        category: EventCategory.Opportunity,
        duration: 1,
        effects: [{ type: "modifyCash", value: 50000 }],
      };

      applyEventEffects(event, state);
      expect(state.cash).toBe(originalCash);
    });
  });

  describe("tickEvents", () => {
    it("reduces duration by 1", () => {
      const events: GameEvent[] = [
        {
          id: "e1",
          name: "Test",
          description: "Test",
          category: EventCategory.Market,
          duration: 3,
          effects: [],
        },
        {
          id: "e2",
          name: "Test 2",
          description: "Test",
          category: EventCategory.Hazard,
          duration: 1,
          effects: [],
        },
      ];

      const ticked = tickEvents(events);
      expect(ticked.length).toBe(1);
      expect(ticked[0].id).toBe("e1");
      expect(ticked[0].duration).toBe(2);
    });

    it("removes expired events (duration reaches 0)", () => {
      const events: GameEvent[] = [
        {
          id: "e1",
          name: "Expiring",
          description: "Test",
          category: EventCategory.Market,
          duration: 1,
          effects: [],
        },
      ];

      const ticked = tickEvents(events);
      expect(ticked.length).toBe(0);
    });

    it("handles empty event list", () => {
      const ticked = tickEvents([]);
      expect(ticked).toEqual([]);
    });

    it("does not mutate original events", () => {
      const events: GameEvent[] = [
        {
          id: "e1",
          name: "Test",
          description: "Test",
          category: EventCategory.Market,
          duration: 3,
          effects: [],
        },
      ];

      tickEvents(events);
      expect(events[0].duration).toBe(3);
    });

    it("keeps events with duration > 1 after tick", () => {
      const events: GameEvent[] = [
        {
          id: "e1",
          name: "Long Event",
          description: "Test",
          category: EventCategory.Market,
          duration: 5,
          effects: [],
        },
        {
          id: "e2",
          name: "Short Event",
          description: "Test",
          category: EventCategory.Hazard,
          duration: 2,
          effects: [],
        },
        {
          id: "e3",
          name: "Expiring Event",
          description: "Test",
          category: EventCategory.Flavor,
          duration: 1,
          effects: [],
        },
      ];

      const ticked = tickEvents(events);
      expect(ticked.length).toBe(2);
      expect(ticked.find((e) => e.id === "e1")?.duration).toBe(4);
      expect(ticked.find((e) => e.id === "e2")?.duration).toBe(1);
      expect(ticked.find((e) => e.id === "e3")).toBeUndefined();
    });
  });
});

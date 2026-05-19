import { describe, it, expect } from "vitest";
import { calculateRouteRP, getCargoMult } from "../DeliveryRP.ts";
import type {
  ActiveRoute,
  GameState,
  Planet,
  StarSystem,
} from "../../../data/types.ts";

function makePlanet(id: string, systemId: string, x = 0, y = 0): Planet {
  return {
    id,
    name: id,
    systemId,
    type: "agricultural",
    x,
    y,
    population: 1000,
    biome: "temperate",
    productionTags: [],
    consumptionTags: [],
    productionScale: 1.0,
    populationCap: 10000,
  } as unknown as Planet;
}

function makeSystem(
  id: string,
  empireId: string | null,
  x = 0,
  y = 0,
): StarSystem {
  return {
    id,
    name: id,
    x,
    y,
    empireId: empireId ?? "",
    sectorId: "sector1",
    starColor: 0xffffff,
  } as unknown as StarSystem;
}

function makeState(planets: Planet[], systems: StarSystem[]): GameState {
  return {
    galaxy: { planets, systems, empires: [], sectors: [] },
    hyperlanes: [],
    borderPorts: [],
  } as unknown as GameState;
}

function makeRoute(
  originId: string,
  destinationId: string,
  cargo: string,
): ActiveRoute {
  return {
    id: `${originId}-${destinationId}`,
    originPlanetId: originId,
    destinationPlanetId: destinationId,
    cargoType: cargo as ActiveRoute["cargoType"],
    paused: false,
    distance: 0,
    charterId: undefined,
  } as ActiveRoute;
}

describe("getCargoMult", () => {
  it("returns 0.7 for rawMaterials and food", () => {
    expect(getCargoMult("rawMaterials")).toBe(0.7);
    expect(getCargoMult("food")).toBe(0.7);
  });

  it("returns 1.0 for manufactured cargo (medical, hazmat, passengers)", () => {
    expect(getCargoMult("medical")).toBe(1.0);
    expect(getCargoMult("hazmat")).toBe(1.0);
    expect(getCargoMult("passengers")).toBe(1.0);
  });

  it("returns 1.5 for luxury", () => {
    expect(getCargoMult("luxury")).toBe(1.5);
  });

  it("returns 2.0 for technology", () => {
    expect(getCargoMult("technology")).toBe(2.0);
  });
});

describe("calculateRouteRP", () => {
  it("returns 0 for paused routes", () => {
    const p1 = makePlanet("p1", "s1");
    const p2 = makePlanet("p2", "s1", 5, 0);
    const s1 = makeSystem("s1", "e1");
    const state = makeState([p1, p2], [s1]);
    const route: ActiveRoute = {
      ...makeRoute("p1", "p2", "food"),
      paused: true,
    };

    expect(calculateRouteRP(route, 3, state)).toBe(0);
  });

  it("computes RP for a short domestic food route", () => {
    // distance 5 → distanceMult clamp(0.5, 2.0, 5/10) = 0.5
    // cargo food = 0.7, domestic (same empire) = 1.0, trips = 2
    // 0.15 * 0.7 * 0.5 * 1.0 * 2 = 0.105
    const p1 = makePlanet("p1", "s1", 0, 0);
    const p2 = makePlanet("p2", "s1", 5, 0);
    const s1 = makeSystem("s1", "e1");
    const state = makeState([p1, p2], [s1]);
    const route = makeRoute("p1", "p2", "food");

    expect(calculateRouteRP(route, 2, state)).toBeCloseTo(0.105, 3);
  });

  it("computes RP for a long inter-empire tech route", () => {
    // distance 50 (clamped to 2.0), cargo tech = 2.0, inter-empire = 1.5, trips = 3
    // 0.15 * 2.0 * 2.0 * 1.5 * 3 = 2.7
    const p1 = makePlanet("p1", "s1", 0, 0);
    const p2 = makePlanet("p2", "s2", 50, 0);
    const s1 = makeSystem("s1", "e1", 0, 0);
    const s2 = makeSystem("s2", "e2", 50, 0);
    const state = makeState([p1, p2], [s1, s2]);
    const route = makeRoute("p1", "p2", "technology");

    expect(calculateRouteRP(route, 3, state)).toBeCloseTo(2.7, 3);
  });

  it("floors distanceMult at 0.5 for very-short routes", () => {
    // distance 1 → distanceMult would be 0.1 → clamped to 0.5
    const p1 = makePlanet("p1", "s1", 0, 0);
    const p2 = makePlanet("p2", "s1", 1, 0);
    const s1 = makeSystem("s1", "e1");
    const state = makeState([p1, p2], [s1]);
    const route = makeRoute("p1", "p2", "food");

    // 0.15 * 0.7 * 0.5 * 1.0 * 1 = 0.0525
    expect(calculateRouteRP(route, 1, state)).toBeCloseTo(0.0525, 4);
  });

  it("caps distanceMult at 2.0 for very-long routes", () => {
    const p1 = makePlanet("p1", "s1", 0, 0);
    const p2 = makePlanet("p2", "s2", 1000, 0);
    const s1 = makeSystem("s1", "e1", 0, 0);
    const s2 = makeSystem("s2", "e1", 1000, 0);
    const state = makeState([p1, p2], [s1, s2]);
    const route = makeRoute("p1", "p2", "food");

    // distanceMult capped at 2.0 (not 100)
    // 0.15 * 0.7 * 2.0 * 1.0 * 1 = 0.21
    expect(calculateRouteRP(route, 1, state)).toBeCloseTo(0.21, 3);
  });

  it("returns 0 for trips <= 0", () => {
    const p1 = makePlanet("p1", "s1");
    const p2 = makePlanet("p2", "s1", 5, 0);
    const s1 = makeSystem("s1", "e1");
    const state = makeState([p1, p2], [s1]);
    const route = makeRoute("p1", "p2", "food");

    expect(calculateRouteRP(route, 0, state)).toBe(0);
  });

  it("returns 0 when route has null cargoType", () => {
    const p1 = makePlanet("p1", "s1", 0, 0);
    const p2 = makePlanet("p2", "s1", 5, 0);
    const s1 = makeSystem("s1", "e1");
    const state = makeState([p1, p2], [s1]);
    const route = {
      ...makeRoute("p1", "p2", "food"),
      cargoType: null,
    } as ActiveRoute;
    expect(calculateRouteRP(route, 3, state)).toBe(0);
  });

  it("returns 0 when origin planet is missing from state", () => {
    const p2 = makePlanet("p2", "s1", 5, 0);
    const s1 = makeSystem("s1", "e1");
    const state = makeState([p2], [s1]); // no p1
    const route = makeRoute("p1", "p2", "food");
    expect(calculateRouteRP(route, 1, state)).toBe(0);
  });

  it("returns 0 when destination planet is missing from state", () => {
    const p1 = makePlanet("p1", "s1", 0, 0);
    const s1 = makeSystem("s1", "e1");
    const state = makeState([p1], [s1]); // no p2
    const route = makeRoute("p1", "p2", "food");
    expect(calculateRouteRP(route, 1, state)).toBe(0);
  });
});

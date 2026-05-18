import { describe, it, expect } from "vitest";
import {
  getInputCargo,
  getOutputCargo,
  getActiveProducers,
} from "../IndustryChain.ts";
import {
  PlanetType,
  CargoType,
  PlanetBiome,
  type GoodTag,
} from "../../../data/types.ts";
import type { Planet, ActiveRoute } from "../../../data/types.ts";

function makePlanet(
  id: string,
  systemId: string,
  type: Planet["type"],
  opts: {
    productionTags?: GoodTag[];
    consumptionTags?: GoodTag[];
  } = {},
): Planet {
  return {
    id,
    name: id,
    systemId,
    type,
    x: 0,
    y: 0,
    population: 100000,
    biome: PlanetBiome.Colony,
    productionTags: opts.productionTags ?? [],
    consumptionTags: opts.consumptionTags ?? [],
    productionScale: 1.0,
    populationCap: 10,
  };
}

function makeRoute(
  id: string,
  destPlanetId: string,
  cargoType: ActiveRoute["cargoType"],
  paused = false,
): ActiveRoute {
  return {
    id,
    originPlanetId: "origin-1",
    destinationPlanetId: destPlanetId,
    distance: 100,
    cargoType,
    paused,
  };
}

describe("getInputCargo", () => {
  it("returns the first consumption tag", () => {
    const p = makePlanet("p", "s", PlanetType.TechWorld, {
      consumptionTags: [CargoType.RawMaterials],
    });
    expect(getInputCargo(p)).toBe(CargoType.RawMaterials);
  });

  it("returns null when there are no consumption tags", () => {
    const p = makePlanet("p", "s", PlanetType.Agricultural);
    expect(getInputCargo(p)).toBeNull();
  });
});

describe("getOutputCargo", () => {
  it("returns the first production tag", () => {
    const p = makePlanet("p", "s", PlanetType.TechWorld, {
      productionTags: [CargoType.Technology],
    });
    expect(getOutputCargo(p)).toBe(CargoType.Technology);
  });

  it("returns null when there are no production tags", () => {
    const p = makePlanet("p", "s", PlanetType.CoreWorld);
    expect(getOutputCargo(p)).toBeNull();
  });
});

describe("getActiveProducers", () => {
  it("marks a TechWorld as active when a Raw route delivers to its system", () => {
    const techPlanet = makePlanet("tech-1", "sys-1", PlanetType.TechWorld, {
      consumptionTags: [CargoType.RawMaterials],
    });
    const otherPlanet = makePlanet("other-1", "sys-2", PlanetType.Mining);
    const rawRoute = makeRoute("r1", "tech-1", CargoType.RawMaterials);

    const result = getActiveProducers([techPlanet, otherPlanet], [rawRoute]);
    expect(result.has("tech-1")).toBe(true);
    expect(result.has("other-1")).toBe(false);
  });

  it("activates via system-level delivery (route targets other planet in same system)", () => {
    const techPlanet = makePlanet("tech-1", "sys-1", PlanetType.TechWorld, {
      consumptionTags: [CargoType.RawMaterials],
    });
    const sisterPlanet = makePlanet("sister-1", "sys-1", PlanetType.Frontier);
    const rawRoute = makeRoute("r1", "sister-1", CargoType.RawMaterials);

    const result = getActiveProducers([techPlanet, sisterPlanet], [rawRoute]);
    expect(result.has("tech-1")).toBe(true);
  });

  it("does NOT activate when the input route is paused", () => {
    const techPlanet = makePlanet("tech-1", "sys-1", PlanetType.TechWorld, {
      consumptionTags: [CargoType.RawMaterials],
    });
    const pausedRoute = makeRoute("r1", "tech-1", CargoType.RawMaterials, true);

    const result = getActiveProducers([techPlanet], [pausedRoute]);
    expect(result.has("tech-1")).toBe(false);
  });

  it("does NOT activate with wrong cargo type", () => {
    const techPlanet = makePlanet("tech-1", "sys-1", PlanetType.TechWorld, {
      consumptionTags: [CargoType.RawMaterials],
    });
    const foodRoute = makeRoute("r1", "tech-1", CargoType.Food);

    const result = getActiveProducers([techPlanet], [foodRoute]);
    expect(result.has("tech-1")).toBe(false);
  });

  it("returns empty set when no routes", () => {
    const techPlanet = makePlanet("tech-1", "sys-1", PlanetType.TechWorld, {
      consumptionTags: [CargoType.RawMaterials],
    });
    const result = getActiveProducers([techPlanet], []);
    expect(result.size).toBe(0);
  });

  it("activates multiple producers in the same system with one route", () => {
    const tech1 = makePlanet("tech-1", "sys-1", PlanetType.TechWorld, {
      consumptionTags: [CargoType.RawMaterials],
    });
    const tech2 = makePlanet("tech-2", "sys-1", PlanetType.TechWorld, {
      consumptionTags: [CargoType.RawMaterials],
    });
    const rawRoute = makeRoute("r1", "tech-1", CargoType.RawMaterials);

    const result = getActiveProducers([tech1, tech2], [rawRoute]);
    expect(result.has("tech-1")).toBe(true);
    expect(result.has("tech-2")).toBe(true);
  });

  it("planets without consumption tags are never added to activeProducers", () => {
    const core = makePlanet("core-1", "sys-1", PlanetType.CoreWorld);
    const frontier = makePlanet("front-1", "sys-1", PlanetType.Frontier);
    const anyRoute = makeRoute("r1", "core-1", CargoType.Food);

    const result = getActiveProducers([core, frontier], [anyRoute]);
    expect(result.size).toBe(0);
  });
});

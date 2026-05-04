import { describe, it, expect } from "vitest";
import {
  getInputCargo,
  getOutputCargo,
  getActiveProducers,
} from "../IndustryChain.ts";
import { PlanetType, CargoType } from "../../../data/types.ts";
import type { Planet, ActiveRoute } from "../../../data/types.ts";

function makePlanet(
  id: string,
  systemId: string,
  type: Planet["type"],
): Planet {
  return { id, name: id, systemId, type, x: 0, y: 0, population: 100000 };
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
    assignedShipIds: [],
    cargoType,
    paused,
  };
}

describe("getInputCargo", () => {
  it("returns RawMaterials for TechWorld", () => {
    expect(getInputCargo(PlanetType.TechWorld)).toBe(CargoType.RawMaterials);
  });

  it("returns Passengers for Manufacturing", () => {
    expect(getInputCargo(PlanetType.Manufacturing)).toBe(CargoType.Passengers);
  });

  it("returns Food for LuxuryWorld", () => {
    expect(getInputCargo(PlanetType.LuxuryWorld)).toBe(CargoType.Food);
  });

  it("returns null for Agricultural (no input)", () => {
    expect(getInputCargo(PlanetType.Agricultural)).toBeNull();
  });

  it("returns null for CoreWorld (consumer)", () => {
    expect(getInputCargo(PlanetType.CoreWorld)).toBeNull();
  });

  it("returns null for Mining (no input)", () => {
    expect(getInputCargo(PlanetType.Mining)).toBeNull();
  });

  it("returns null for Frontier (no input)", () => {
    expect(getInputCargo(PlanetType.Frontier)).toBeNull();
  });
});

describe("getOutputCargo", () => {
  it("returns Technology for TechWorld", () => {
    expect(getOutputCargo(PlanetType.TechWorld)).toBe(CargoType.Technology);
  });

  it("returns Food for Agricultural", () => {
    expect(getOutputCargo(PlanetType.Agricultural)).toBe(CargoType.Food);
  });

  it("returns null for CoreWorld (no output)", () => {
    expect(getOutputCargo(PlanetType.CoreWorld)).toBeNull();
  });

  it("returns RawMaterials for Mining (Hazmat is secondary)", () => {
    expect(getOutputCargo(PlanetType.Mining)).toBe(CargoType.RawMaterials);
  });

  it("returns Medical for Manufacturing", () => {
    expect(getOutputCargo(PlanetType.Manufacturing)).toBe(CargoType.Medical);
  });

  it("returns Luxury for LuxuryWorld", () => {
    expect(getOutputCargo(PlanetType.LuxuryWorld)).toBe(CargoType.Luxury);
  });

  it("returns null for Frontier (no output)", () => {
    expect(getOutputCargo(PlanetType.Frontier)).toBeNull();
  });
});

describe("getActiveProducers", () => {
  it("marks a TechWorld as active when a Raw route delivers to its system", () => {
    const techPlanet = makePlanet("tech-1", "sys-1", PlanetType.TechWorld);
    const otherPlanet = makePlanet("other-1", "sys-2", PlanetType.Mining);
    const rawRoute = makeRoute("r1", "tech-1", CargoType.RawMaterials);

    const result = getActiveProducers([techPlanet, otherPlanet], [rawRoute]);
    expect(result.has("tech-1")).toBe(true);
    expect(result.has("other-1")).toBe(false);
  });

  it("activates via system-level delivery (route targets other planet in same system)", () => {
    const techPlanet = makePlanet("tech-1", "sys-1", PlanetType.TechWorld);
    const sisterPlanet = makePlanet("sister-1", "sys-1", PlanetType.Frontier);
    const rawRoute = makeRoute("r1", "sister-1", CargoType.RawMaterials);

    const result = getActiveProducers([techPlanet, sisterPlanet], [rawRoute]);
    expect(result.has("tech-1")).toBe(true);
  });

  it("does NOT activate when the input route is paused", () => {
    const techPlanet = makePlanet("tech-1", "sys-1", PlanetType.TechWorld);
    const pausedRoute = makeRoute("r1", "tech-1", CargoType.RawMaterials, true);

    const result = getActiveProducers([techPlanet], [pausedRoute]);
    expect(result.has("tech-1")).toBe(false);
  });

  it("does NOT activate with wrong cargo type", () => {
    const techPlanet = makePlanet("tech-1", "sys-1", PlanetType.TechWorld);
    const foodRoute = makeRoute("r1", "tech-1", CargoType.Food);

    const result = getActiveProducers([techPlanet], [foodRoute]);
    expect(result.has("tech-1")).toBe(false);
  });

  it("returns empty set when no routes", () => {
    const techPlanet = makePlanet("tech-1", "sys-1", PlanetType.TechWorld);
    const result = getActiveProducers([techPlanet], []);
    expect(result.size).toBe(0);
  });

  it("activates multiple producers in the same system with one route", () => {
    const tech1 = makePlanet("tech-1", "sys-1", PlanetType.TechWorld);
    const tech2 = makePlanet("tech-2", "sys-1", PlanetType.TechWorld);
    const rawRoute = makeRoute("r1", "tech-1", CargoType.RawMaterials);

    const result = getActiveProducers([tech1, tech2], [rawRoute]);
    expect(result.has("tech-1")).toBe(true);
    expect(result.has("tech-2")).toBe(true);
  });

  it("consumer planets (CoreWorld, Frontier) are never added to activeProducers", () => {
    const core = makePlanet("core-1", "sys-1", PlanetType.CoreWorld);
    const frontier = makePlanet("front-1", "sys-1", PlanetType.Frontier);
    const anyRoute = makeRoute("r1", "core-1", CargoType.Food);

    const result = getActiveProducers([core, frontier], [anyRoute]);
    expect(result.size).toBe(0);
  });
});

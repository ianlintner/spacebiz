import { describe, it, expect } from "vitest";
import { generateGalaxy } from "../GalaxyGenerator.ts";
import { PlanetType } from "../../data/types.ts";

const ALL_PLANET_TYPES = Object.values(PlanetType);

describe("GalaxyGenerator", () => {
  it("same seed produces same galaxy (deterministic)", () => {
    const galaxy1 = generateGalaxy(42);
    const galaxy2 = generateGalaxy(42);

    expect(galaxy1.sectors.length).toBe(galaxy2.sectors.length);
    expect(galaxy1.systems.length).toBe(galaxy2.systems.length);
    expect(galaxy1.planets.length).toBe(galaxy2.planets.length);

    for (let i = 0; i < galaxy1.sectors.length; i++) {
      expect(galaxy1.sectors[i]).toEqual(galaxy2.sectors[i]);
    }
    for (let i = 0; i < galaxy1.systems.length; i++) {
      expect(galaxy1.systems[i]).toEqual(galaxy2.systems[i]);
    }
    for (let i = 0; i < galaxy1.planets.length; i++) {
      expect(galaxy1.planets[i]).toEqual(galaxy2.planets[i]);
    }
  });

  it("generates 4 sectors (small map)", () => {
    for (const seed of [1, 42, 100, 999, 7777]) {
      const galaxy = generateGalaxy(seed);
      expect(galaxy.sectors.length).toBe(4);
    }
  });

  it("generates 4-5 systems per sector (small map)", () => {
    const galaxy = generateGalaxy(42);
    for (const sector of galaxy.sectors) {
      const systemsInSector = galaxy.systems.filter(
        (s) => s.sectorId === sector.id,
      );
      expect(systemsInSector.length).toBeGreaterThanOrEqual(4);
      expect(systemsInSector.length).toBeLessThanOrEqual(5);
    }
  });

  it("generates 1-3 planets per system", () => {
    const galaxy = generateGalaxy(42);
    for (const system of galaxy.systems) {
      const planetsInSystem = galaxy.planets.filter(
        (p) => p.systemId === system.id,
      );
      expect(planetsInSystem.length).toBeGreaterThanOrEqual(1);
      expect(planetsInSystem.length).toBeLessThanOrEqual(3);
    }
  });

  it("all planets have valid PlanetType", () => {
    const galaxy = generateGalaxy(42);
    for (const planet of galaxy.planets) {
      expect(ALL_PLANET_TYPES).toContain(planet.type);
    }
  });

  it("every system has at least 1 planet", () => {
    const galaxy = generateGalaxy(42);
    for (const system of galaxy.systems) {
      const planetsInSystem = galaxy.planets.filter(
        (p) => p.systemId === system.id,
      );
      expect(planetsInSystem.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("total planets in expected range (16-60)", () => {
    for (const seed of [1, 42, 100, 999, 7777]) {
      const galaxy = generateGalaxy(seed);
      expect(galaxy.planets.length).toBeGreaterThanOrEqual(16);
      expect(galaxy.planets.length).toBeLessThanOrEqual(60);
    }
  });

  it("every planet type exists somewhere in the galaxy", () => {
    const galaxy = generateGalaxy(42);
    const typesPresent = new Set(galaxy.planets.map((p) => p.type));
    for (const pt of ALL_PLANET_TYPES) {
      expect(typesPresent.has(pt)).toBe(true);
    }
  });

  it("sector IDs follow expected format", () => {
    const galaxy = generateGalaxy(42);
    galaxy.sectors.forEach((sector, i) => {
      expect(sector.id).toBe(`sector-${i}`);
    });
  });

  it("system IDs follow expected format", () => {
    const galaxy = generateGalaxy(42);
    for (const system of galaxy.systems) {
      expect(system.id).toMatch(/^system-\d+-\d+$/);
    }
  });

  it("planet IDs follow expected format", () => {
    const galaxy = generateGalaxy(42);
    for (const planet of galaxy.planets) {
      expect(planet.id).toMatch(/^planet-\d+-\d+-\d+$/);
    }
  });

  it("sectors are positioned within 0-2400 x 0-1600 range", () => {
    const galaxy = generateGalaxy(42);
    for (const sector of galaxy.sectors) {
      expect(sector.x).toBeGreaterThanOrEqual(0);
      expect(sector.x).toBeLessThanOrEqual(2400);
      expect(sector.y).toBeGreaterThanOrEqual(0);
      expect(sector.y).toBeLessThanOrEqual(1600);
    }
  });

  it("different seeds produce different galaxies", () => {
    const galaxy1 = generateGalaxy(100);
    const galaxy2 = generateGalaxy(200);
    // At least some names should differ
    const names1 = galaxy1.planets.map((p) => p.name);
    const names2 = galaxy2.planets.map((p) => p.name);
    expect(names1).not.toEqual(names2);
  });

  it("all planets have positive population", () => {
    const galaxy = generateGalaxy(42);
    for (const planet of galaxy.planets) {
      expect(planet.population).toBeGreaterThan(0);
    }
  });
});

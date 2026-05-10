import { describe, it, expect } from "vitest";
import { generateGalaxy } from "../GalaxyGenerator.ts";
import { PlanetType, GalaxyShape, HyperlaneDensity } from "../../data/types.ts";

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

  it("generates 8 sectors (small map)", () => {
    for (const seed of [1, 42, 100, 999, 7777]) {
      const galaxy = generateGalaxy(seed);
      expect(galaxy.sectors.length).toBe(8);
    }
  });

  it("every empire has at least one system (spiral pipeline)", () => {
    const galaxy = generateGalaxy(42);
    for (const sector of galaxy.sectors) {
      const systemsInSector = galaxy.systems.filter(
        (s) => s.sectorId === sector.id,
      );
      // Spiral k-means clustering produces variable cluster sizes — every
      // empire/sector still gets at least one system after rebalancing.
      expect(systemsInSector.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("generates 0-3 planets per system (barren systems allowed)", () => {
    const galaxy = generateGalaxy(42);
    for (const system of galaxy.systems) {
      const planetsInSystem = galaxy.planets.filter(
        (p) => p.systemId === system.id,
      );
      expect(planetsInSystem.length).toBeGreaterThanOrEqual(0);
      expect(planetsInSystem.length).toBeLessThanOrEqual(3);
    }
  });

  it("all planets have valid PlanetType", () => {
    const galaxy = generateGalaxy(42);
    for (const planet of galaxy.planets) {
      expect(ALL_PLANET_TYPES).toContain(planet.type);
    }
  });

  it("most systems have at least 1 planet (some barren transit nodes allowed)", () => {
    const galaxy = generateGalaxy(42);
    let inhabited = 0;
    for (const system of galaxy.systems) {
      const planetsInSystem = galaxy.planets.filter(
        (p) => p.systemId === system.id,
      );
      if (planetsInSystem.length > 0) inhabited++;
    }
    // Weighted distribution targets ~70% inhabited systems.
    expect(inhabited / galaxy.systems.length).toBeGreaterThan(0.5);
  });

  it("total planets in expected range (250-700)", () => {
    // Standard preset: 8 empires × 30–40 systems × weighted 0–3 planets
    // (avg ~1.6) gives ~380–510 planets typical, with seed variance.
    for (const seed of [1, 42, 100, 999, 7777]) {
      const galaxy = generateGalaxy(seed);
      expect(galaxy.planets.length).toBeGreaterThanOrEqual(250);
      expect(galaxy.planets.length).toBeLessThanOrEqual(700);
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

  it("hyperlanes avoid extreme long-distance connections", () => {
    for (const seed of [7, 42, 99, 777, 2026]) {
      const galaxy = generateGalaxy(
        seed,
        "epic",
        GalaxyShape.Spiral,
        HyperlaneDensity.Medium,
      );
      const distances = galaxy.hyperlanes
        .map((h) => h.distance)
        .sort((a, b) => a - b);
      const max = distances[distances.length - 1] ?? 1;

      const xs = galaxy.systems.map((s) => s.x);
      const ys = galaxy.systems.map((s) => s.y);
      const width = Math.max(...xs) - Math.min(...xs);
      const height = Math.max(...ys) - Math.min(...ys);
      const galaxyDiagonal = Math.sqrt(width * width + height * height);

      // Prevent giant cross-map links while allowing occasional strategic shortcuts.
      expect(max).toBeLessThanOrEqual(galaxyDiagonal * 0.42);
    }
  });

  it("hyperlane edges are planar (no crossing hyperlanes)", () => {
    const galaxy = generateGalaxy(
      42,
      "standard",
      GalaxyShape.Spiral,
      HyperlaneDensity.Medium,
    );
    const sysById = new Map(galaxy.systems.map((s) => [s.id, s]));
    const segs = galaxy.hyperlanes.map((hl) => ({
      x1: sysById.get(hl.systemA)!.x,
      y1: sysById.get(hl.systemA)!.y,
      x2: sysById.get(hl.systemB)!.x,
      y2: sysById.get(hl.systemB)!.y,
    }));
    for (let i = 0; i < segs.length; i++) {
      for (let j = i + 1; j < segs.length; j++) {
        const a = segs[i];
        const b = segs[j];
        // Skip adjacent segments (share an endpoint)
        if (
          (a.x1 === b.x1 && a.y1 === b.y1) ||
          (a.x1 === b.x2 && a.y1 === b.y2) ||
          (a.x2 === b.x1 && a.y2 === b.y1) ||
          (a.x2 === b.x2 && a.y2 === b.y2)
        )
          continue;
        function cross(ax: number, ay: number, bx: number, by: number) {
          return ax * by - ay * bx;
        }
        const d1 = cross(b.x2 - b.x1, b.y2 - b.y1, a.x1 - b.x1, a.y1 - b.y1);
        const d2 = cross(b.x2 - b.x1, b.y2 - b.y1, a.x2 - b.x1, a.y2 - b.y1);
        const d3 = cross(a.x2 - a.x1, a.y2 - a.y1, b.x1 - a.x1, b.y1 - a.y1);
        const d4 = cross(a.x2 - a.x1, a.y2 - a.y1, b.x2 - a.x1, b.y2 - a.y1);
        const crosses =
          ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
          ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
        expect(crosses).toBe(false);
      }
    }
  });

  it("hyperlane network stays corridor-like instead of web-like", () => {
    for (const seed of [13, 42, 101, 500, 9001]) {
      const galaxy = generateGalaxy(
        seed,
        "epic",
        GalaxyShape.Ring,
        HyperlaneDensity.Medium,
      );

      const systemCount = galaxy.systems.length;
      const edgeCount = galaxy.hyperlanes.length;
      const averageDegree = (2 * edgeCount) / Math.max(systemCount, 1);

      // Dense enough to navigate, sparse enough to feel like hyperlane corridors.
      expect(averageDegree).toBeGreaterThanOrEqual(2.0);
      expect(averageDegree).toBeLessThanOrEqual(3.8);
    }
  });

  it("galaxy remains fully connected after chokepoint pruning", () => {
    for (const seed of [1, 42, 100]) {
      const galaxy = generateGalaxy(seed);
      const adj = new Map<string, string[]>();
      for (const hl of galaxy.hyperlanes) {
        if (!adj.has(hl.systemA)) adj.set(hl.systemA, []);
        if (!adj.has(hl.systemB)) adj.set(hl.systemB, []);
        adj.get(hl.systemA)!.push(hl.systemB);
        adj.get(hl.systemB)!.push(hl.systemA);
      }
      const start = galaxy.systems[0].id;
      const visited = new Set([start]);
      const queue = [start];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        for (const nb of adj.get(cur) ?? []) {
          if (!visited.has(nb)) {
            visited.add(nb);
            queue.push(nb);
          }
        }
      }
      expect(visited.size).toBe(galaxy.systems.length);
    }
  });

  it("empire border hyperlanes are limited to chokepoint max (Medium = 2), with connectivity repair", () => {
    for (const seed of [1, 42, 100]) {
      const galaxy = generateGalaxy(
        seed,
        "standard",
        GalaxyShape.Spiral,
        HyperlaneDensity.Medium,
      );
      const sysById = new Map(galaxy.systems.map((s) => [s.id, s]));
      const crossCount = new Map<string, number>();
      for (const hl of galaxy.hyperlanes) {
        const empA = sysById.get(hl.systemA)!.empireId;
        const empB = sysById.get(hl.systemB)!.empireId;
        if (empA === empB) continue;
        const key = empA < empB ? `${empA}|${empB}` : `${empB}|${empA}`;
        crossCount.set(key, (crossCount.get(key) ?? 0) + 1);
      }
      // Most pairs must respect the chokepoint limit; a small number of pairs
      // may have one extra lane restored by the connectivity repair pass.
      const violators = [...crossCount.values()].filter((c) => c > 2);
      // No pair should ever have more than maxPerPair + 1 lanes
      for (const count of crossCount.values()) {
        expect(count).toBeLessThanOrEqual(3);
      }
      // The vast majority of pairs must be at or under the chokepoint limit
      const total = crossCount.size;
      expect(violators.length).toBeLessThanOrEqual(Math.ceil(total * 0.1));
    }
  });
});

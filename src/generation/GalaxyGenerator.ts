import { SeededRNG } from "../utils/SeededRNG.ts";
import { NameGenerator } from "./NameGenerator.ts";
import { PlanetType } from "../data/types.ts";
import type {
  Sector,
  StarSystem,
  Planet,
  PlanetType as PlanetTypeT,
} from "../data/types.ts";

export interface GalaxyData {
  sectors: Sector[];
  systems: StarSystem[];
  planets: Planet[];
}

// Planet type weights by orbital zone (inner / middle / outer)
const INNER_WEIGHTS: [PlanetTypeT, number][] = [
  [PlanetType.Mining, 35],
  [PlanetType.Industrial, 30],
  [PlanetType.Terran, 10],
  [PlanetType.Agricultural, 5],
  [PlanetType.Research, 10],
  [PlanetType.Resort, 5],
  [PlanetType.HubStation, 5],
];

const MIDDLE_WEIGHTS: [PlanetTypeT, number][] = [
  [PlanetType.Terran, 30],
  [PlanetType.Agricultural, 25],
  [PlanetType.Research, 20],
  [PlanetType.Industrial, 10],
  [PlanetType.Mining, 5],
  [PlanetType.Resort, 5],
  [PlanetType.HubStation, 5],
];

const OUTER_WEIGHTS: [PlanetTypeT, number][] = [
  [PlanetType.Resort, 25],
  [PlanetType.HubStation, 25],
  [PlanetType.Research, 15],
  [PlanetType.Terran, 10],
  [PlanetType.Agricultural, 10],
  [PlanetType.Mining, 10],
  [PlanetType.Industrial, 5],
];

const ALL_PLANET_TYPES: PlanetTypeT[] = Object.values(PlanetType);

function weightedPick(
  rng: SeededRNG,
  weights: [PlanetTypeT, number][],
): PlanetTypeT {
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng.next() * total;
  for (const [type, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return weights[weights.length - 1][0];
}

const SECTOR_COLORS = [0x4488cc, 0xcc6644, 0x66cc88, 0xbb88cc, 0xcccc44];
const STAR_COLORS = [
  0xffffee, 0xffcc88, 0xff8866, 0x88aaff, 0xffffff, 0xffaa44,
];

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function generateSectorCenters(
  rng: SeededRNG,
  count: number,
  bounds: Bounds,
): Array<{ x: number; y: number }> {
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const radiusX = (bounds.maxX - bounds.minX) * 0.3;
  const radiusY = (bounds.maxY - bounds.minY) * 0.25;
  const startAngle = rng.nextFloat(0, Math.PI * 2);
  const centers: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < count; i++) {
    const base = startAngle + (i / count) * Math.PI * 2;
    const jitter = rng.nextFloat(-0.22, 0.22);
    const angle = base + jitter;
    const x = clamp(
      cx + Math.cos(angle) * radiusX + rng.nextFloat(-30, 30),
      bounds.minX,
      bounds.maxX,
    );
    const y = clamp(
      cy + Math.sin(angle) * radiusY + rng.nextFloat(-24, 24),
      bounds.minY,
      bounds.maxY,
    );
    centers.push({ x, y });
  }

  return centers;
}

function generateSystemPoints(
  rng: SeededRNG,
  count: number,
  centerX: number,
  centerY: number,
  bounds: Bounds,
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const localRadiusX = 125;
  const localRadiusY = 95;
  const minDist = 56;

  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      const angle = rng.nextFloat(0, Math.PI * 2);
      const radial = Math.sqrt(rng.next()) * 0.95 + 0.05;
      const px = clamp(
        centerX + Math.cos(angle) * localRadiusX * radial,
        bounds.minX,
        bounds.maxX,
      );
      const py = clamp(
        centerY + Math.sin(angle) * localRadiusY * radial,
        bounds.minY,
        bounds.maxY,
      );

      const overlaps = points.some((p) => {
        const dx = p.x - px;
        const dy = p.y - py;
        return dx * dx + dy * dy < minDist * minDist;
      });
      if (!overlaps) {
        points.push({ x: px, y: py });
        placed = true;
        break;
      }
    }

    if (!placed) {
      const fallbackAngle = (i / Math.max(count, 1)) * Math.PI * 2;
      points.push({
        x: clamp(
          centerX + Math.cos(fallbackAngle) * localRadiusX * 0.7,
          bounds.minX,
          bounds.maxX,
        ),
        y: clamp(
          centerY + Math.sin(fallbackAngle) * localRadiusY * 0.7,
          bounds.minY,
          bounds.maxY,
        ),
      });
    }
  }

  return points;
}

export function generateGalaxy(seed: number): GalaxyData {
  const rng = new SeededRNG(seed);
  const nameGen = new NameGenerator(rng);

  const sectors: Sector[] = [];
  const systems: StarSystem[] = [];
  const planets: Planet[] = [];

  const numSectors = rng.nextInt(2, 3);
  const mapBounds: Bounds = {
    minX: 80,
    maxX: 980,
    minY: 70,
    maxY: 630,
  };
  const sectorCenters = generateSectorCenters(rng, numSectors, mapBounds);

  // Position sectors across the coordinate space
  for (let si = 0; si < numSectors; si++) {
    const sectorX = sectorCenters[si].x;
    const sectorY = sectorCenters[si].y;
    const sector: Sector = {
      id: `sector-${si}`,
      name: nameGen.generateSectorName(),
      x: sectorX,
      y: sectorY,
      color: SECTOR_COLORS[si % SECTOR_COLORS.length],
    };
    sectors.push(sector);

    const numSystems = rng.nextInt(4, 6);
    const systemPoints = generateSystemPoints(
      rng,
      numSystems,
      sectorX,
      sectorY,
      mapBounds,
    );
    for (let syi = 0; syi < numSystems; syi++) {
      const systemX = systemPoints[syi].x;
      const systemY = systemPoints[syi].y;
      const system: StarSystem = {
        id: `system-${si}-${syi}`,
        name: nameGen.generateSystemName(),
        sectorId: sector.id,
        x: systemX,
        y: systemY,
        starColor: rng.pick(STAR_COLORS),
      };
      systems.push(system);

      const numPlanets = rng.nextInt(3, 6);
      for (let pi = 0; pi < numPlanets; pi++) {
        // Orbital position determines zone
        const orbitalFraction = numPlanets > 1 ? pi / (numPlanets - 1) : 0.5;
        let planetTypeWeights: [PlanetTypeT, number][];
        if (orbitalFraction < 0.33) {
          planetTypeWeights = INNER_WEIGHTS;
        } else if (orbitalFraction < 0.67) {
          planetTypeWeights = MIDDLE_WEIGHTS;
        } else {
          planetTypeWeights = OUTER_WEIGHTS;
        }
        const planetType = weightedPick(rng, planetTypeWeights);

        // Position planets around the system
        const angle = rng.nextFloat(0, Math.PI * 2);
        const dist = rng.nextFloat(1, 5);
        const planetX = system.x + Math.cos(angle) * dist;
        const planetY = system.y + Math.sin(angle) * dist;

        const population = generatePopulation(rng, planetType);

        const planet: Planet = {
          id: `planet-${si}-${syi}-${pi}`,
          name: nameGen.generatePlanetName(),
          systemId: system.id,
          type: planetType,
          x: planetX,
          y: planetY,
          population,
        };
        planets.push(planet);
      }
    }
  }

  // Ensure at least 1 of each planet type exists
  ensureAllPlanetTypes(rng, planets);

  return { sectors, systems, planets };
}

function generatePopulation(rng: SeededRNG, type: PlanetTypeT): number {
  switch (type) {
    case PlanetType.Terran:
      return rng.nextInt(500000, 2000000);
    case PlanetType.Industrial:
      return rng.nextInt(200000, 800000);
    case PlanetType.Mining:
      return rng.nextInt(10000, 100000);
    case PlanetType.Agricultural:
      return rng.nextInt(50000, 300000);
    case PlanetType.HubStation:
      return rng.nextInt(100000, 500000);
    case PlanetType.Resort:
      return rng.nextInt(30000, 200000);
    case PlanetType.Research:
      return rng.nextInt(5000, 50000);
    default:
      return rng.nextInt(10000, 100000);
  }
}

function ensureAllPlanetTypes(rng: SeededRNG, planets: Planet[]): void {
  const existingTypes = new Set(planets.map((p) => p.type));
  const missingTypes = ALL_PLANET_TYPES.filter((t) => !existingTypes.has(t));

  for (const missingType of missingTypes) {
    // Replace a random planet that has a type with more than 1 representative
    const typeCounts = new Map<PlanetTypeT, number>();
    for (const p of planets) {
      typeCounts.set(p.type, (typeCounts.get(p.type) ?? 0) + 1);
    }

    // Find a planet whose type has multiple representatives
    const candidates = planets.filter((p) => (typeCounts.get(p.type) ?? 0) > 1);
    if (candidates.length > 0) {
      const target = rng.pick(candidates);
      const idx = planets.indexOf(target);
      planets[idx] = {
        ...target,
        type: missingType,
        population: generatePopulation(rng, missingType),
      };
      // Update counts
      typeCounts.set(target.type, (typeCounts.get(target.type) ?? 0) - 1);
      typeCounts.set(missingType, (typeCounts.get(missingType) ?? 0) + 1);
    }
  }
}

import { SeededRNG } from "../utils/SeededRNG.ts";
import { NameGenerator } from "./NameGenerator.ts";
import { PlanetType, EmpireDisposition } from "../data/types.ts";
import type {
  Sector,
  Empire,
  StarSystem,
  Planet,
  GameSize,
  PlanetType as PlanetTypeT,
  EmpireDisposition as EmpireDispositionT,
} from "../data/types.ts";
import {
  GAME_SIZE_CONFIGS,
  TARIFF_FRIENDLY_MIN,
  TARIFF_FRIENDLY_MAX,
  TARIFF_NEUTRAL_MIN,
  TARIFF_NEUTRAL_MAX,
  TARIFF_HOSTILE_MIN,
  TARIFF_HOSTILE_MAX,
} from "../data/constants.ts";

export interface GalaxyData {
  sectors: Sector[];
  empires: Empire[];
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

const EMPIRE_COLORS = [
  0x4488cc, 0xcc6644, 0x66cc88, 0xbb88cc, 0xcccc44, 0xcc4466, 0x44cccc,
];

const EMPIRE_NAME_PREFIXES = [
  "Terran",
  "Kral",
  "Voss",
  "Althari",
  "Nexari",
  "Dravian",
  "Solari",
  "Rekthan",
  "Omathi",
  "Zenthari",
];

const EMPIRE_NAME_SUFFIXES = [
  "Federation",
  "Dominion",
  "Republic",
  "Collective",
  "Sovereignty",
  "Commonwealth",
  "Hegemony",
  "Alliance",
  "Imperium",
  "Confederacy",
];

const DISPOSITIONS: EmpireDispositionT[] = [
  EmpireDisposition.Friendly,
  EmpireDisposition.Neutral,
  EmpireDisposition.Hostile,
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
  const radiusX = (bounds.maxX - bounds.minX) * 0.32;
  const radiusY = (bounds.maxY - bounds.minY) * 0.3;
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
  const localRadiusX = 220;
  const localRadiusY = 180;
  const minDist = 90;

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

export function generateGalaxy(
  seed: number,
  gameSize: GameSize = "small",
): GalaxyData {
  const rng = new SeededRNG(seed);
  const nameGen = new NameGenerator(rng);

  const config = GAME_SIZE_CONFIGS[gameSize];

  const sectors: Sector[] = [];
  const empires: Empire[] = [];
  const systems: StarSystem[] = [];
  const planets: Planet[] = [];

  const numSectors = config.empireCount;
  const mapBounds: Bounds = {
    minX: 120,
    maxX: 2280,
    minY: 120,
    maxY: 1480,
  };
  const sectorCenters = generateSectorCenters(rng, numSectors, mapBounds);

  // Shuffle dispositions — first empire always friendly (player home candidate)
  const usedPrefixes = new Set<number>();

  // Position sectors and empires across the coordinate space
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

    // Generate empire for this sector
    let prefixIdx: number;
    do {
      prefixIdx = rng.nextInt(0, EMPIRE_NAME_PREFIXES.length - 1);
    } while (
      usedPrefixes.has(prefixIdx) &&
      usedPrefixes.size < EMPIRE_NAME_PREFIXES.length
    );
    usedPrefixes.add(prefixIdx);

    const suffixIdx = rng.nextInt(0, EMPIRE_NAME_SUFFIXES.length - 1);
    const empireName = `${EMPIRE_NAME_PREFIXES[prefixIdx]} ${EMPIRE_NAME_SUFFIXES[suffixIdx]}`;

    // Assign disposition — distribute evenly
    const disposition = DISPOSITIONS[si % DISPOSITIONS.length];

    let tariffMin: number;
    let tariffMax: number;
    switch (disposition) {
      case EmpireDisposition.Friendly:
        tariffMin = TARIFF_FRIENDLY_MIN;
        tariffMax = TARIFF_FRIENDLY_MAX;
        break;
      case EmpireDisposition.Hostile:
        tariffMin = TARIFF_HOSTILE_MIN;
        tariffMax = TARIFF_HOSTILE_MAX;
        break;
      default:
        tariffMin = TARIFF_NEUTRAL_MIN;
        tariffMax = TARIFF_NEUTRAL_MAX;
        break;
    }
    const tariffRate = rng.nextFloat(tariffMin, tariffMax);

    const empireId = `empire-${si}`;

    const numSystems = rng.nextInt(
      config.systemsPerEmpireMin,
      config.systemsPerEmpireMax,
    );
    const systemPoints = generateSystemPoints(
      rng,
      numSystems,
      sectorX,
      sectorY,
      mapBounds,
    );

    let homeSystemId = "";

    for (let syi = 0; syi < numSystems; syi++) {
      const systemX = systemPoints[syi].x;
      const systemY = systemPoints[syi].y;
      const system: StarSystem = {
        id: `system-${si}-${syi}`,
        name: nameGen.generateSystemName(),
        sectorId: sector.id,
        empireId,
        x: systemX,
        y: systemY,
        starColor: rng.pick(STAR_COLORS),
      };
      systems.push(system);

      if (syi === 0) homeSystemId = system.id;

      const numPlanets = rng.nextInt(
        config.planetsPerSystemMin,
        config.planetsPerSystemMax,
      );
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

    const empire: Empire = {
      id: empireId,
      name: empireName,
      color: EMPIRE_COLORS[si % EMPIRE_COLORS.length],
      tariffRate: Math.round(tariffRate * 1000) / 1000,
      disposition,
      homeSystemId,
    };
    empires.push(empire);
  }

  // Ensure at least 1 of each planet type exists
  ensureAllPlanetTypes(rng, planets);

  return { sectors, empires, systems, planets };
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

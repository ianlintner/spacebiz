import { SeededRNG } from "../utils/SeededRNG.ts";
import { NameGenerator } from "./NameGenerator.ts";
import {
  PlanetType,
  EmpireDisposition,
  GalaxyShape,
  HyperlaneDensity,
} from "../data/types.ts";
import { generateLeaderName } from "../data/portraits.ts";
import { pickRandomLeaderPortrait } from "../data/empireLeaderPortraits.ts";
import type {
  Sector,
  Empire,
  StarSystem,
  Planet,
  Hyperlane,
  GalaxyShape as GalaxyShapeT,
  HyperlaneDensity as HyperlaneDensityT,
  PlanetType as PlanetTypeT,
  EmpireDisposition as EmpireDispositionT,
} from "../data/types.ts";
import {
  GAME_LENGTH_PRESETS,
  TARIFF_FRIENDLY_MIN,
  TARIFF_FRIENDLY_MAX,
  TARIFF_NEUTRAL_MIN,
  TARIFF_NEUTRAL_MAX,
  TARIFF_HOSTILE_MIN,
  TARIFF_HOSTILE_MAX,
  HYPERLANE_DENSITY_CONFIGS,
  HYPERLANE_SHAPE_BIAS,
  HYPERLANE_MIN_CONNECTIONS,
} from "../data/constants.ts";
import type { GamePreset } from "../data/constants.ts";

export interface GalaxyData {
  sectors: Sector[];
  empires: Empire[];
  systems: StarSystem[];
  planets: Planet[];
  hyperlanes: Hyperlane[];
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

const SECTOR_COLORS = [
  0x4488cc, 0xcc6644, 0x66cc88, 0xbb88cc, 0xcccc44, 0xcc4466, 0x44cccc,
  0x88cc44, 0xcc8844, 0x4466cc, 0xcc44bb, 0x44cc66,
];
const STAR_COLORS = [
  0xffffee, 0xffcc88, 0xff8866, 0x88aaff, 0xffffff, 0xffaa44,
];

const EMPIRE_COLORS = [
  0x4488cc, 0xcc6644, 0x66cc88, 0xbb88cc, 0xcccc44, 0xcc4466, 0x44cccc,
  0x88cc44, 0xcc8844, 0x4466cc, 0xcc44bb, 0x44cc66,
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
  "Pyrathi",
  "Lorathi",
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

// ── Shape-aware sector center placement ──────────────────────

function generateSectorCenters(
  rng: SeededRNG,
  count: number,
  bounds: Bounds,
  shape: GalaxyShapeT,
): Array<{ x: number; y: number }> {
  switch (shape) {
    case GalaxyShape.Spiral:
      return generateSpiralCenters(rng, count, bounds);
    case GalaxyShape.Elliptical:
      return generateEllipticalCenters(rng, count, bounds);
    case GalaxyShape.Ring:
      return generateRingCenters(rng, count, bounds);
    case GalaxyShape.Irregular:
      return generateIrregularCenters(rng, count, bounds);
    default:
      return generateSpiralCenters(rng, count, bounds);
  }
}

/** Spiral: place empires along 2–4 logarithmic spiral arms */
function generateSpiralCenters(
  rng: SeededRNG,
  count: number,
  bounds: Bounds,
): Array<{ x: number; y: number }> {
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const radiusX = (bounds.maxX - bounds.minX) * 0.42;
  const radiusY = (bounds.maxY - bounds.minY) * 0.42;
  const arms = count <= 6 ? 2 : count <= 9 ? 3 : 4;
  const startAngle = rng.nextFloat(0, Math.PI * 2);
  const centers: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < count; i++) {
    const arm = i % arms;
    const t = (Math.floor(i / arms) + 1) / (Math.ceil(count / arms) + 1);
    // Logarithmic spiral: r grows with angle
    const spiralAngle =
      startAngle + (arm / arms) * Math.PI * 2 + t * Math.PI * 1.2;
    const r = 0.2 + t * 0.8;
    const jitterR = rng.nextFloat(-0.06, 0.06);
    const jitterA = rng.nextFloat(-0.15, 0.15);
    const x = clamp(
      cx + Math.cos(spiralAngle + jitterA) * radiusX * (r + jitterR),
      bounds.minX,
      bounds.maxX,
    );
    const y = clamp(
      cy + Math.sin(spiralAngle + jitterA) * radiusY * (r + jitterR),
      bounds.minY,
      bounds.maxY,
    );
    centers.push({ x, y });
  }

  return centers;
}

/** Elliptical: gaussian-like cluster toward center */
function generateEllipticalCenters(
  rng: SeededRNG,
  count: number,
  bounds: Bounds,
): Array<{ x: number; y: number }> {
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const radiusX = (bounds.maxX - bounds.minX) * 0.38;
  const radiusY = (bounds.maxY - bounds.minY) * 0.34;
  const centers: Array<{ x: number; y: number }> = [];
  const minDist = Math.min(radiusX, radiusY) * 0.25;

  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      // Box-Muller approximation via averaging uniform samples
      const u1 = (rng.next() + rng.next() + rng.next()) / 3;
      const u2 = (rng.next() + rng.next() + rng.next()) / 3;
      const angle = rng.nextFloat(0, Math.PI * 2);
      const r = Math.sqrt(u1 * u2) * 1.4;
      const px = clamp(
        cx + Math.cos(angle) * radiusX * r,
        bounds.minX,
        bounds.maxX,
      );
      const py = clamp(
        cy + Math.sin(angle) * radiusY * r,
        bounds.minY,
        bounds.maxY,
      );
      const overlaps = centers.some((c) => {
        const dx = c.x - px;
        const dy = c.y - py;
        return Math.sqrt(dx * dx + dy * dy) < minDist;
      });
      if (!overlaps) {
        centers.push({ x: px, y: py });
        placed = true;
        break;
      }
    }
    if (!placed) {
      // Fallback: place on ring
      const angle = (i / count) * Math.PI * 2;
      centers.push({
        x: clamp(
          cx + Math.cos(angle) * radiusX * 0.6,
          bounds.minX,
          bounds.maxX,
        ),
        y: clamp(
          cy + Math.sin(angle) * radiusY * 0.6,
          bounds.minY,
          bounds.maxY,
        ),
      });
    }
  }

  return centers;
}

/** Ring: empires distributed around a ring (original layout, refined) */
function generateRingCenters(
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
    const jitter = rng.nextFloat(-0.18, 0.18);
    const rVar = rng.nextFloat(0.85, 1.15);
    const x = clamp(
      cx + Math.cos(base + jitter) * radiusX * rVar + rng.nextFloat(-20, 20),
      bounds.minX,
      bounds.maxX,
    );
    const y = clamp(
      cy + Math.sin(base + jitter) * radiusY * rVar + rng.nextFloat(-16, 16),
      bounds.minY,
      bounds.maxY,
    );
    centers.push({ x, y });
  }

  return centers;
}

/** Irregular: random clusters scattered across the map */
function generateIrregularCenters(
  rng: SeededRNG,
  count: number,
  bounds: Bounds,
): Array<{ x: number; y: number }> {
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  const margin = Math.min(w, h) * 0.1;
  const minDist = Math.min(w, h) * 0.15;
  const centers: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      const px = rng.nextFloat(bounds.minX + margin, bounds.maxX - margin);
      const py = rng.nextFloat(bounds.minY + margin, bounds.maxY - margin);
      const overlaps = centers.some((c) => {
        const dx = c.x - px;
        const dy = c.y - py;
        return Math.sqrt(dx * dx + dy * dy) < minDist;
      });
      if (!overlaps) {
        centers.push({ x: px, y: py });
        placed = true;
        break;
      }
    }
    if (!placed) {
      const angle = (i / count) * Math.PI * 2;
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;
      centers.push({
        x: clamp(cx + Math.cos(angle) * w * 0.3, bounds.minX, bounds.maxX),
        y: clamp(cy + Math.sin(angle) * h * 0.3, bounds.minY, bounds.maxY),
      });
    }
  }

  return centers;
}

function generateSystemPoints(
  rng: SeededRNG,
  count: number,
  centerX: number,
  centerY: number,
  bounds: Bounds,
  mapScale: number,
  existingPoints: Array<{ x: number; y: number }> = [],
  neighborCenters: Array<{ x: number; y: number }> = [],
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const localRadiusX = 210 * Math.sqrt(mapScale);
  const localRadiusY = 175 * Math.sqrt(mapScale);
  const minDist = 80 * Math.sqrt(mapScale);
  const globalMinDist = minDist * 0.85;

  // Reserve 1-2 slots for outpost/bridge systems toward neighbors
  const bridgeCount =
    neighborCenters.length > 0 ? Math.min(2, Math.floor(count * 0.2)) : 0;
  const mainCount = count - bridgeCount;

  for (let i = 0; i < mainCount; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 60; attempt++) {
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

      const overlapsLocal = points.some((p) => {
        const dx = p.x - px;
        const dy = p.y - py;
        return dx * dx + dy * dy < minDist * minDist;
      });
      if (overlapsLocal) continue;

      // Check against all previously-placed systems from other empires
      const overlapsGlobal = existingPoints.some((p) => {
        const dx = p.x - px;
        const dy = p.y - py;
        return dx * dx + dy * dy < globalMinDist * globalMinDist;
      });
      if (overlapsGlobal) continue;

      points.push({ x: px, y: py });
      placed = true;
      break;
    }

    if (!placed) {
      const fallbackAngle = (i / Math.max(mainCount, 1)) * Math.PI * 2;
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

  // Place bridge/outpost systems toward nearest neighbor empire centers
  for (let bi = 0; bi < bridgeCount; bi++) {
    const nc = neighborCenters[bi % neighborCenters.length];
    let placed = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      // Position 50-70% of the way toward the neighbor center
      const t = rng.nextFloat(0.5, 0.72);
      const jitterX = rng.nextFloat(-40, 40) * Math.sqrt(mapScale);
      const jitterY = rng.nextFloat(-35, 35) * Math.sqrt(mapScale);
      const px = clamp(
        centerX + (nc.x - centerX) * t + jitterX,
        bounds.minX,
        bounds.maxX,
      );
      const py = clamp(
        centerY + (nc.y - centerY) * t + jitterY,
        bounds.minY,
        bounds.maxY,
      );

      const overlapsLocal = points.some((p) => {
        const dx = p.x - px;
        const dy = p.y - py;
        return dx * dx + dy * dy < minDist * minDist;
      });
      if (overlapsLocal) continue;

      const overlapsGlobal = existingPoints.some((p) => {
        const dx = p.x - px;
        const dy = p.y - py;
        return dx * dx + dy * dy < globalMinDist * globalMinDist;
      });
      if (overlapsGlobal) continue;

      points.push({ x: px, y: py });
      placed = true;
      break;
    }

    if (!placed) {
      // Fallback: just place near the edge of the main cluster toward neighbor
      const dirX = nc.x - centerX;
      const dirY = nc.y - centerY;
      const dirLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
      points.push({
        x: clamp(
          centerX + (dirX / dirLen) * localRadiusX * 0.9,
          bounds.minX,
          bounds.maxX,
        ),
        y: clamp(
          centerY + (dirY / dirLen) * localRadiusY * 0.9,
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
  gamePreset: GamePreset = "standard",
  galaxyShape: GalaxyShapeT = "spiral",
  hyperlaneDensity: HyperlaneDensityT = HyperlaneDensity.Medium,
): GalaxyData {
  const rng = new SeededRNG(seed);
  const nameGen = new NameGenerator(rng);

  const config = GAME_LENGTH_PRESETS[gamePreset];

  const sectors: Sector[] = [];
  const empires: Empire[] = [];
  const systems: StarSystem[] = [];
  const planets: Planet[] = [];

  const numSectors = config.empireCount;
  const scale = config.mapScale;
  const baseW = 2160; // 2280 - 120
  const baseH = 1360; // 1480 - 120
  const mapBounds: Bounds = {
    minX: 120,
    maxX: 120 + baseW * scale,
    minY: 120,
    maxY: 120 + baseH * scale,
  };
  const sectorCenters = generateSectorCenters(
    rng,
    numSectors,
    mapBounds,
    galaxyShape,
  );

  // Shuffle dispositions — first empire always friendly (player home candidate)
  const usedPrefixes = new Set<number>();

  // Track all placed system points globally for deconfliction
  const allSystemPoints: Array<{ x: number; y: number }> = [];

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

    // Find nearest other sector centers as neighbor targets for bridge systems
    const neighborCenters = sectorCenters
      .filter((_, idx) => idx !== si)
      .map((c) => ({
        x: c.x,
        y: c.y,
        dist: Math.sqrt(
          (c.x - sectorX) * (c.x - sectorX) + (c.y - sectorY) * (c.y - sectorY),
        ),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);

    const systemPoints = generateSystemPoints(
      rng,
      numSystems,
      sectorX,
      sectorY,
      mapBounds,
      scale,
      allSystemPoints,
      neighborCenters,
    );
    allSystemPoints.push(...systemPoints);

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

        // 3D orbital params for the system view. Inner-slot planets orbit
        // faster (shorter period in quarters) and at smaller radius —
        // preserves the existing "inner industry → outer leisure" feel.
        const orbitRadius = 4 + orbitalFraction * 12;
        const orbitPeriodQuarters = 4 + pi * 2;
        const orbitPhase = rng.nextFloat(0, Math.PI * 2);
        const orbitInclination = (rng.nextFloat(0, 1) - 0.5) * 0.3;

        const planet: Planet = {
          id: `planet-${si}-${syi}-${pi}`,
          name: nameGen.generatePlanetName(),
          systemId: system.id,
          type: planetType,
          x: planetX,
          y: planetY,
          population,
          orbitRadius,
          orbitPeriodQuarters,
          orbitPhase,
          orbitInclination,
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
      leaderName: generateLeaderName(rng),
      leaderPortrait: pickRandomLeaderPortrait(rng),
    };
    empires.push(empire);
  }

  // Ensure at least 1 of each planet type exists
  ensureAllPlanetTypes(rng, planets);

  // Generate hyperlane connections between systems
  const hyperlanes = generateHyperlanes(
    rng,
    systems,
    galaxyShape,
    hyperlaneDensity,
    mapBounds,
  );

  return { sectors, empires, systems, planets, hyperlanes };
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

// ── Hyperlane Generation ─────────────────────────────────────

interface Edge {
  a: number;
  b: number;
  dist: number;
}

function percentileFromSorted(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const clamped = Math.max(0, Math.min(1, p));
  const idx = Math.floor((sorted.length - 1) * clamped);
  return sorted[idx];
}

function edgeCountTarget(systemCount: number, keepRatio: number): number {
  const targetAvgDegree = 1.8 + keepRatio * 1.6;
  return Math.max(
    systemCount - 1,
    Math.round((systemCount * targetAvgDegree) / 2),
  );
}

function hasSharedNeighbor(
  adjacency: Array<Set<number>>,
  a: number,
  b: number,
): boolean {
  const aNeighbors = adjacency[a];
  const bNeighbors = adjacency[b];
  for (const n of aNeighbors) {
    if (bNeighbors.has(n)) return true;
  }
  return false;
}

// ── Geometric helpers for crossing detection ─────────────────

function cross2d(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

/**
 * Test whether two line segments (p1-p2) and (p3-p4) properly cross.
 * Segments sharing an endpoint are NOT considered crossing.
 */
function segmentsCross(
  ax1: number,
  ay1: number,
  ax2: number,
  ay2: number,
  bx1: number,
  by1: number,
  bx2: number,
  by2: number,
): boolean {
  // Skip if segments share an endpoint
  const eps = 0.01;
  if (
    (Math.abs(ax1 - bx1) < eps && Math.abs(ay1 - by1) < eps) ||
    (Math.abs(ax1 - bx2) < eps && Math.abs(ay1 - by2) < eps) ||
    (Math.abs(ax2 - bx1) < eps && Math.abs(ay2 - by1) < eps) ||
    (Math.abs(ax2 - bx2) < eps && Math.abs(ay2 - by2) < eps)
  ) {
    return false;
  }

  const d1 = cross2d(bx2 - bx1, by2 - by1, ax1 - bx1, ay1 - by1);
  const d2 = cross2d(bx2 - bx1, by2 - by1, ax2 - bx1, ay2 - by1);
  const d3 = cross2d(ax2 - ax1, ay2 - ay1, bx1 - ax1, by1 - ay1);
  const d4 = cross2d(ax2 - ax1, ay2 - ay1, bx2 - ax1, by2 - ay1);

  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

/**
 * Check if an edge would visually cross any already-kept edge.
 */
function wouldCrossKeptEdges(
  a: number,
  b: number,
  systems: StarSystem[],
  keptEdgeList: Array<[number, number]>,
): boolean {
  const ax1 = systems[a].x;
  const ay1 = systems[a].y;
  const ax2 = systems[b].x;
  const ay2 = systems[b].y;
  for (const [ka, kb] of keptEdgeList) {
    // Skip if shares an endpoint
    if (ka === a || ka === b || kb === a || kb === b) continue;
    if (
      segmentsCross(
        ax1,
        ay1,
        ax2,
        ay2,
        systems[ka].x,
        systems[ka].y,
        systems[kb].x,
        systems[kb].y,
      )
    ) {
      return true;
    }
  }
  return false;
}

/**
 * MST-first hyperlane generation with edge-crossing avoidance.
 *
 * Steps:
 *   1. Compute pairwise distances and distance statistics
 *   2. Build MST (Kruskal's) for guaranteed connectivity (always planar)
 *   3. Add short non-crossing edges for density, with shape bias
 *   4. Ensure minimum connections per system
 */
function generateHyperlanes(
  rng: SeededRNG,
  systems: StarSystem[],
  shape: GalaxyShapeT,
  density: HyperlaneDensityT,
  bounds: Bounds,
): Hyperlane[] {
  if (systems.length < 2) return [];

  const densityCfg = HYPERLANE_DENSITY_CONFIGS[density];
  const shapeBias = HYPERLANE_SHAPE_BIAS[shape] ?? 0.5;
  const maxConn = densityCfg.maxConn;
  const targetEdges = edgeCountTarget(systems.length, densityCfg.keepRatio);

  // 1. Compute all pairwise distances
  const allEdges: Edge[] = [];
  const nearestNeighborDist = new Float64Array(systems.length);
  for (let i = 0; i < systems.length; i++)
    nearestNeighborDist[i] = Number.POSITIVE_INFINITY;
  for (let i = 0; i < systems.length; i++) {
    for (let j = i + 1; j < systems.length; j++) {
      const dx = systems[i].x - systems[j].x;
      const dy = systems[i].y - systems[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      allEdges.push({ a: i, b: j, dist });
      if (dist < nearestNeighborDist[i]) nearestNeighborDist[i] = dist;
      if (dist < nearestNeighborDist[j]) nearestNeighborDist[j] = dist;
    }
  }
  allEdges.sort((a, b) => a.dist - b.dist);

  // Distance statistics for edge limits
  const nnSorted = Array.from(nearestNeighborDist)
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  const nn75 = percentileFromSorted(nnSorted, 0.75);
  const mapW = bounds.maxX - bounds.minX;
  const mapH = bounds.maxY - bounds.minY;
  const mapDiagonal = Math.sqrt(mapW * mapW + mapH * mapH);
  const absoluteMaxEdge = mapDiagonal * 0.35;
  // Tributary edges capped much shorter than MST allowance
  const longEdgeLimit = Math.min(
    nn75 * (2.5 + densityCfg.keepRatio * 1.0),
    absoluteMaxEdge,
  );

  // 2. DSU + data structures
  const parent = new Int32Array(systems.length);
  for (let i = 0; i < systems.length; i++) parent[i] = i;
  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }
  function union(a: number, b: number): boolean {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false;
    parent[ra] = rb;
    return true;
  }

  const keptEdges = new Set<string>();
  // Also keep an ordered list for fast crossing checks
  const keptEdgeList: Array<[number, number]> = [];
  const connCount = new Int32Array(systems.length);
  const adjacency: Array<Set<number>> = Array.from(
    { length: systems.length },
    () => new Set<number>(),
  );
  const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

  function addEdge(a: number, b: number): boolean {
    const key = edgeKey(a, b);
    if (keptEdges.has(key)) return false;
    if (connCount[a] >= maxConn || connCount[b] >= maxConn) return false;
    keptEdges.add(key);
    keptEdgeList.push([Math.min(a, b), Math.max(a, b)]);
    connCount[a]++;
    connCount[b]++;
    adjacency[a].add(b);
    adjacency[b].add(a);
    union(a, b);
    return true;
  }

  // MST edges bypass degree caps (connectivity is paramount)
  function addMSTEdge(a: number, b: number): boolean {
    const key = edgeKey(a, b);
    if (keptEdges.has(key)) return false;
    keptEdges.add(key);
    keptEdgeList.push([Math.min(a, b), Math.max(a, b)]);
    connCount[a]++;
    connCount[b]++;
    adjacency[a].add(b);
    adjacency[b].add(a);
    union(a, b);
    return true;
  }

  // 3. MST (Kruskal's) — shortest edges first, guaranteed connectivity.
  //    MST is always planar so no crossing check needed.
  //    Cap at absoluteMaxEdge; remaining islands merge with closest short bridges.
  for (const e of allEdges) {
    if (find(e.a) === find(e.b)) continue;
    if (e.dist > absoluteMaxEdge) continue;
    addMSTEdge(e.a, e.b);
  }
  // Fallback for any remaining disconnected components (very rare)
  for (const e of allEdges) {
    if (find(e.a) === find(e.b)) continue;
    addMSTEdge(e.a, e.b);
  }

  // 4. Add short non-crossing edges for density, with shape and anti-web bias
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;

  for (const e of allEdges) {
    if (keptEdges.size >= targetEdges) break;
    if (keptEdges.has(edgeKey(e.a, e.b))) continue;
    if (connCount[e.a] >= maxConn || connCount[e.b] >= maxConn) continue;
    if (e.dist > longEdgeLimit) continue;

    // Anti-web: strongly discourage triangles
    if (hasSharedNeighbor(adjacency, e.a, e.b) && rng.next() < 0.8) continue;

    // Crossing avoidance: skip edges that visually cross existing lanes
    if (wouldCrossKeptEdges(e.a, e.b, systems, keptEdgeList)) continue;

    // Shape-aware scoring
    const edgeScore = scoreEdgeForShape(
      systems[e.a],
      systems[e.b],
      shape,
      cx,
      cy,
    );
    const distanceScore = Math.max(0, 1 - e.dist / longEdgeLimit);

    const keepChance =
      (edgeScore * shapeBias + (1 - shapeBias) * distanceScore) *
      densityCfg.keepRatio;
    if (rng.next() < keepChance) {
      addEdge(e.a, e.b);
    }
  }

  // 5. Ensure minimum connections (relax crossing check for connectivity)
  for (let i = 0; i < systems.length; i++) {
    if (connCount[i] >= HYPERLANE_MIN_CONNECTIONS) continue;
    const candidates = allEdges.filter(
      (e) =>
        (e.a === i || e.b === i) &&
        e.dist <= longEdgeLimit * 1.3 &&
        !keptEdges.has(edgeKey(e.a, e.b)),
    );
    for (const c of candidates) {
      if (connCount[i] >= HYPERLANE_MIN_CONNECTIONS) break;
      const other = c.a === i ? c.b : c.a;
      if (connCount[other] >= maxConn + 1) continue;
      // Allow crossing here if needed for connectivity
      const key = edgeKey(c.a, c.b);
      if (keptEdges.has(key)) continue;
      keptEdges.add(key);
      keptEdgeList.push([Math.min(c.a, c.b), Math.max(c.a, c.b)]);
      connCount[c.a]++;
      connCount[c.b]++;
      adjacency[c.a].add(c.b);
      adjacency[c.b].add(c.a);
    }
  }

  // 6. Convert to Hyperlane objects
  const hyperlanes: Hyperlane[] = [];
  let hIdx = 0;
  for (const key of keptEdges) {
    const [aStr, bStr] = key.split("-");
    const a = Number(aStr);
    const b = Number(bStr);
    const dx = systems[a].x - systems[b].x;
    const dy = systems[a].y - systems[b].y;
    hyperlanes.push({
      id: `hl-${hIdx++}`,
      systemA: systems[a].id,
      systemB: systems[b].id,
      distance: Math.sqrt(dx * dx + dy * dy),
    });
  }

  return hyperlanes;
}

/**
 * Score how well an edge fits the galaxy shape (0..1).
 * Higher = more aligned with the shape's characteristic connectivity.
 */
function scoreEdgeForShape(
  sysA: StarSystem,
  sysB: StarSystem,
  shape: GalaxyShapeT,
  cx: number,
  cy: number,
): number {
  const midX = (sysA.x + sysB.x) / 2;
  const midY = (sysA.y + sysB.y) / 2;
  const dx = sysB.x - sysA.x;
  const dy = sysB.y - sysA.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  switch (shape) {
    case GalaxyShape.Spiral: {
      // Prefer along-arm (tangential) connections over radial crossings
      const toCenter = Math.atan2(midY - cy, midX - cx);
      const edgeAngle = Math.atan2(dy, dx);
      const angleDiff = Math.abs(Math.sin(edgeAngle - toCenter - Math.PI / 2));
      return 0.3 + 0.7 * angleDiff; // tangential gets higher score
    }
    case GalaxyShape.Ring: {
      // Prefer circumferential over radial
      const toCenter = Math.atan2(midY - cy, midX - cx);
      const edgeAngle = Math.atan2(dy, dx);
      const angleDiff = Math.abs(Math.sin(edgeAngle - toCenter - Math.PI / 2));
      return 0.2 + 0.8 * angleDiff;
    }
    case GalaxyShape.Elliptical: {
      // Prefer shorter edges (denser core)
      const maxDist = Math.max(
        Math.abs(sysA.x - cx) + Math.abs(sysB.x - cx),
        200,
      );
      return Math.max(0.2, 1 - dist / maxDist);
    }
    case GalaxyShape.Irregular: {
      // Prefer same-empire connections (cluster coherence)
      return sysA.empireId === sysB.empireId ? 0.8 : 0.3;
    }
    default:
      return 0.5;
  }
}

import { SeededRNG } from "../utils/SeededRNG.ts";
import { NameGenerator } from "./NameGenerator.ts";
import {
  PlanetType,
  EmpireDisposition,
  GalaxyShape,
  HyperlaneDensity,
} from "../data/types.ts";
import { generateLeaderName, pickRandomPortrait } from "../data/portraits.ts";
import type {
  Sector,
  Empire,
  StarSystem,
  Planet,
  Hyperlane,
  GameSize,
  GalaxyShape as GalaxyShapeT,
  HyperlaneDensity as HyperlaneDensityT,
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
  HYPERLANE_DENSITY_CONFIGS,
  HYPERLANE_SHAPE_BIAS,
  HYPERLANE_MIN_CONNECTIONS,
} from "../data/constants.ts";

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
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const localRadiusX = 180 * Math.sqrt(mapScale);
  const localRadiusY = 150 * Math.sqrt(mapScale);
  const minDist = 70 * Math.sqrt(mapScale);

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
  galaxyShape: GalaxyShapeT = "spiral",
  hyperlaneDensity: HyperlaneDensityT = HyperlaneDensity.Medium,
): GalaxyData {
  const rng = new SeededRNG(seed);
  const nameGen = new NameGenerator(rng);

  const config = GAME_SIZE_CONFIGS[gameSize];

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
      scale,
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
      leaderName: generateLeaderName(rng),
      leaderPortrait: pickRandomPortrait(rng),
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

/**
 * Delaunay-approximation via sorted-distance neighbor graph.
 * For each system, connect to nearest neighbors, then prune by density config.
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

  // 1. Compute all pairwise distances
  const allEdges: Edge[] = [];
  for (let i = 0; i < systems.length; i++) {
    for (let j = i + 1; j < systems.length; j++) {
      const dx = systems[i].x - systems[j].x;
      const dy = systems[i].y - systems[j].y;
      allEdges.push({ a: i, b: j, dist: Math.sqrt(dx * dx + dy * dy) });
    }
  }
  allEdges.sort((a, b) => a.dist - b.dist);

  // 2. Build MST first (Kruskal's) to guarantee connectivity
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
  const connCount = new Int32Array(systems.length);
  const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

  // MST edges (always kept)
  for (const e of allEdges) {
    if (union(e.a, e.b)) {
      keptEdges.add(edgeKey(e.a, e.b));
      connCount[e.a]++;
      connCount[e.b]++;
    }
  }

  // 3. Add extra edges based on density and shape bias
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;

  for (const e of allEdges) {
    const key = edgeKey(e.a, e.b);
    if (keptEdges.has(key)) continue;
    if (connCount[e.a] >= maxConn || connCount[e.b] >= maxConn) continue;

    // Shape-aware scoring: prefer edges that align with the galaxy shape
    const edgeScore = scoreEdgeForShape(
      systems[e.a],
      systems[e.b],
      shape,
      cx,
      cy,
    );

    // Keep edge if shape-compatible or random chance based on density
    const keepChance =
      edgeScore * shapeBias + (1 - shapeBias) * densityCfg.keepRatio;
    if (rng.next() < keepChance) {
      keptEdges.add(key);
      connCount[e.a]++;
      connCount[e.b]++;
    }
  }

  // 4. Ensure minimum connections
  for (let i = 0; i < systems.length; i++) {
    if (connCount[i] >= HYPERLANE_MIN_CONNECTIONS) continue;
    // Find nearest unconnected systems
    const candidates = allEdges
      .filter(
        (e) => (e.a === i || e.b === i) && !keptEdges.has(edgeKey(e.a, e.b)),
      )
      .sort((a, b) => a.dist - b.dist);
    for (const c of candidates) {
      if (connCount[i] >= HYPERLANE_MIN_CONNECTIONS) break;
      const other = c.a === i ? c.b : c.a;
      if (connCount[other] >= maxConn) continue;
      keptEdges.add(edgeKey(c.a, c.b));
      connCount[c.a]++;
      connCount[c.b]++;
    }
  }

  // 5. Convert to Hyperlane objects
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

import Delaunator from "delaunator";
import { SeededRNG } from "../utils/SeededRNG.ts";
import { NameGenerator } from "./NameGenerator.ts";
import {
  PlanetType,
  EmpireDisposition,
  EmpireArchetype,
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
  SpecialId,
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
  DEFAULT_EMPIRE_POOL_BY_STANCE,
} from "../data/constants.ts";
import type { GamePreset } from "../data/constants.ts";
import { placeSpiralGalaxy } from "./SpiralPlacer.ts";
import { reconcileEmpireProduction } from "./EmpireReconciler.ts";
import { placeSpecials } from "./SpecialPlacer.ts";
import { getBiomesForType } from "../data/biomes.ts";

export interface GalaxyData {
  sectors: Sector[];
  empires: Empire[];
  systems: StarSystem[];
  planets: Planet[];
  hyperlanes: Hyperlane[];
}

// Spiral arm constants — exported so the galaxy renderer can decorate the same arms.
export const SPIRAL_ARMS = 2;
export const SPIRAL_RADIAL_START = 0.18;
export const SPIRAL_RADIAL_END = 1.0;
export const SPIRAL_ARM_SWEEP = Math.PI * 1.8;

// Planet type weights by orbital zone (inner / middle / outer)
const INNER_WEIGHTS: [PlanetTypeT, number][] = [
  [PlanetType.CoreWorld, 30],
  [PlanetType.TechWorld, 25],
  [PlanetType.Mining, 20],
  [PlanetType.Manufacturing, 15],
  [PlanetType.Agricultural, 5],
  [PlanetType.LuxuryWorld, 3],
  [PlanetType.Frontier, 2],
];

const MIDDLE_WEIGHTS: [PlanetTypeT, number][] = [
  [PlanetType.Agricultural, 25],
  [PlanetType.Frontier, 20],
  [PlanetType.TechWorld, 15],
  [PlanetType.LuxuryWorld, 15],
  [PlanetType.Manufacturing, 10],
  [PlanetType.CoreWorld, 10],
  [PlanetType.Mining, 5],
];

const OUTER_WEIGHTS: [PlanetTypeT, number][] = [
  [PlanetType.Frontier, 35],
  [PlanetType.Agricultural, 20],
  [PlanetType.Mining, 20],
  [PlanetType.LuxuryWorld, 15],
  [PlanetType.CoreWorld, 5],
  [PlanetType.TechWorld, 3],
  [PlanetType.Manufacturing, 2],
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

/**
 * Pick the planet count for a system using a weighted distribution biased
 * toward barren and single-planet systems. Many systems exist as nav-only
 * waypoints so the hyperlane network feels rich without inflating market
 * complexity. Returns a value in [min, max].
 */
function pickPlanetCount(rng: SeededRNG, min: number, max: number): number {
  // Weights for counts 0, 1, 2, 3, 4 — barren is most common, then single,
  // tapering off for larger systems. The sum doesn't need to be 100; only
  // the ratios matter.
  const WEIGHTS = [30, 28, 22, 14, 6];
  const total: number[] = [];
  let sum = 0;
  for (let n = min; n <= max; n++) {
    sum += WEIGHTS[Math.min(n, WEIGHTS.length - 1)] ?? 1;
    total.push(sum);
  }
  const roll = rng.next() * sum;
  for (let i = 0; i < total.length; i++) {
    if (roll <= total[i]) return min + i;
  }
  return max;
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

function generatePopulation(rng: SeededRNG, type: PlanetTypeT): number {
  switch (type) {
    case PlanetType.CoreWorld:
      return rng.nextInt(500000, 2000000);
    case PlanetType.Manufacturing:
      return rng.nextInt(200000, 800000);
    case PlanetType.TechWorld:
      return rng.nextInt(100000, 500000);
    case PlanetType.LuxuryWorld:
      return rng.nextInt(30000, 200000);
    case PlanetType.Agricultural:
      return rng.nextInt(50000, 300000);
    case PlanetType.Mining:
      return rng.nextInt(10000, 100000);
    case PlanetType.Frontier:
      return rng.nextInt(5000, 80000);
    default:
      return rng.nextInt(10000, 100000);
  }
}

/**
 * Build a complete Planet with biome-derived production fields. Biome is picked
 * from the parent planet type's biome pool; productionScale gets ±30% jitter.
 */
function buildPlanet(opts: {
  rng: SeededRNG;
  id: string;
  name: string;
  systemId: string;
  type: PlanetTypeT;
  x: number;
  y: number;
  population: number;
  orbitRadius: number;
  orbitPeriodQuarters: number;
  orbitPhase: number;
  orbitInclination: number;
}): Planet {
  const { rng, type, population } = opts;
  const biomeOptions = getBiomesForType(type);
  const biomeDef = biomeOptions[rng.nextInt(0, biomeOptions.length - 1)];
  const productionScale = biomeDef.productionScale * rng.nextFloat(0.7, 1.3);
  const populationCap = Math.max(
    population,
    Math.round(population * biomeDef.popCapMultiplier),
  );
  const specialResource: SpecialId | undefined = undefined;
  return {
    id: opts.id,
    name: opts.name,
    systemId: opts.systemId,
    type,
    x: opts.x,
    y: opts.y,
    population,
    orbitRadius: opts.orbitRadius,
    orbitPeriodQuarters: opts.orbitPeriodQuarters,
    orbitPhase: opts.orbitPhase,
    orbitInclination: opts.orbitInclination,
    biome: biomeDef.id,
    productionTags: [...biomeDef.produces],
    consumptionTags: [...biomeDef.consumes],
    productionScale,
    populationCap,
    specialResource,
  };
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
  // TODO: Migrate galaxy sizing (empireCount, systemCount, planetsPerSystem) to
  // GALAXY_TIERS once the route scanner is optimised for larger system counts.

  const empireCount = config.empireCount;
  // Total system count derived from preset's per-empire range (midpoint).
  const sysPerEmpireMid = Math.round(
    (config.systemsPerEmpireMin + config.systemsPerEmpireMax) / 2,
  );
  const systemCount = empireCount * sysPerEmpireMid;

  // Map bounds — kept compatible with renderer expectations (0..2400 × 0..1600).
  const scale = config.mapScale;
  const baseW = 2160;
  const baseH = 1360;
  const mapBounds: Bounds = {
    minX: 120,
    maxX: 120 + baseW * scale,
    minY: 120,
    maxY: 120 + baseH * scale,
  };
  const cx = (mapBounds.minX + mapBounds.maxX) / 2;
  const cy = (mapBounds.minY + mapBounds.maxY) / 2;
  const mapRadius =
    Math.min(mapBounds.maxX - mapBounds.minX, mapBounds.maxY - mapBounds.minY) *
    0.45;

  // 1) Place systems and assign to empires via the spiral pipeline.
  const placement = placeSpiralGalaxy({
    rng,
    systemCount,
    empireCount,
    radius: mapRadius,
  });

  // Translate placement-local coordinates (centered on origin) to map coordinates.
  const systemPositions = placement.systemPositions.map((p) => ({
    x: p.x + cx,
    y: p.y + cy,
  }));
  const empireCentroids = placement.empireCentroids.map((p) => ({
    x: p.x + cx,
    y: p.y + cy,
  }));
  const territoriesTranslated = placement.empireTerritories.map((poly) => ({
    vertices: poly.vertices.map((v) => ({ x: v.x + cx, y: v.y + cy })),
  }));

  // 2) Build empires (one sector per empire for backwards compatibility).
  const sectors: Sector[] = [];
  const empires: Empire[] = [];
  const usedPrefixes = new Set<number>();

  for (let ei = 0; ei < empireCount; ei++) {
    const center = empireCentroids[ei];
    const sector: Sector = {
      id: `sector-${ei}`,
      name: nameGen.generateSectorName(),
      x: center.x,
      y: center.y,
      color: SECTOR_COLORS[ei % SECTOR_COLORS.length],
    };
    sectors.push(sector);

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

    const disposition = DISPOSITIONS[ei % DISPOSITIONS.length];
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

    const policyStance: "isolationist" | "regulated" | "open" =
      disposition === "friendly"
        ? "open"
        : disposition === "hostile"
          ? "isolationist"
          : "regulated";
    const poolSizes = DEFAULT_EMPIRE_POOL_BY_STANCE[policyStance];

    const empire: Empire = {
      id: `empire-${ei}`,
      name: empireName,
      color: EMPIRE_COLORS[ei % EMPIRE_COLORS.length],
      tariffRate: Math.round(tariffRate * 1000) / 1000,
      disposition,
      homeSystemId: "", // assigned below once systems are built
      leaderName: generateLeaderName(rng),
      leaderPortrait: pickRandomLeaderPortrait(rng),
      routeSlotPool: {
        policyStance,
        domesticTotal: poolSizes.domesticTotal,
        foreignTotal: poolSizes.foreignTotal,
        domesticOpen: poolSizes.domesticTotal,
        foreignOpen: poolSizes.foreignTotal,
      },
      archetype: EmpireArchetype.Balanced,
      ownedSpecials: [],
      territoryPolygon: territoriesTranslated[ei],
    };
    empires.push(empire);
  }

  // 3) Build systems. Group system indices by empire for stable id/name ordering.
  const systems: StarSystem[] = [];
  const empireSystemIndices: number[][] = empires.map(() => []);
  for (let i = 0; i < systemPositions.length; i++) {
    const empireIdx = placement.empireAssignments[i];
    empireSystemIndices[empireIdx].push(i);
  }

  for (let ei = 0; ei < empires.length; ei++) {
    const indices = empireSystemIndices[ei];
    // Sort by distance from empire centroid so home system is the closest one.
    const cen = empireCentroids[ei];
    indices.sort((a, b) => {
      const da =
        (systemPositions[a].x - cen.x) ** 2 +
        (systemPositions[a].y - cen.y) ** 2;
      const db =
        (systemPositions[b].x - cen.x) ** 2 +
        (systemPositions[b].y - cen.y) ** 2;
      return da - db;
    });
    indices.forEach((globalIdx, localIdx) => {
      const pos = systemPositions[globalIdx];
      const system: StarSystem = {
        id: `system-${ei}-${localIdx}`,
        name: nameGen.generateSystemName(),
        sectorId: sectors[ei].id,
        empireId: empires[ei].id,
        x: pos.x,
        y: pos.y,
        starColor: rng.pick(STAR_COLORS),
      };
      systems.push(system);
      if (localIdx === 0) {
        empires[ei].homeSystemId = system.id;
      }
    });
  }

  // 4) Build planets per system, with biome assignment.
  const planets: Planet[] = [];
  for (let ei = 0; ei < empires.length; ei++) {
    const indices = empireSystemIndices[ei];
    indices.forEach((_globalIdx, localIdx) => {
      const system = systems.find(
        (s) => s.id === `system-${ei}-${localIdx}`,
      ) as StarSystem;
      const numPlanets = pickPlanetCount(
        rng,
        config.planetsPerSystemMin,
        config.planetsPerSystemMax,
      );
      for (let pi = 0; pi < numPlanets; pi++) {
        const orbitalFraction = numPlanets > 1 ? pi / (numPlanets - 1) : 0.5;
        let weights: [PlanetTypeT, number][];
        if (orbitalFraction < 0.33) weights = INNER_WEIGHTS;
        else if (orbitalFraction < 0.67) weights = MIDDLE_WEIGHTS;
        else weights = OUTER_WEIGHTS;
        const planetType = weightedPick(rng, weights);

        const angle = rng.nextFloat(0, Math.PI * 2);
        const dist = rng.nextFloat(1, 5);
        const planetX = system.x + Math.cos(angle) * dist;
        const planetY = system.y + Math.sin(angle) * dist;
        const population = generatePopulation(rng, planetType);

        const orbitRadius = 4 + orbitalFraction * 12;
        const orbitPeriodQuarters = 4 + pi * 2;
        const orbitPhase = rng.nextFloat(0, Math.PI * 2);
        const orbitInclination = (rng.nextFloat(0, 1) - 0.5) * 0.3;

        planets.push(
          buildPlanet({
            rng,
            id: `planet-${ei}-${localIdx}-${pi}`,
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
          }),
        );
      }
    });
  }

  // Ensure at least 1 of each planet type exists (rebuilds biome fields too).
  ensureAllPlanetTypes(rng, planets);

  // 5) Reconcile empire-level production coverage.
  for (const empire of empires) {
    const empireSystemIds = new Set(
      systems.filter((s) => s.empireId === empire.id).map((s) => s.id),
    );
    const empirePlanets = planets.filter((p) =>
      empireSystemIds.has(p.systemId),
    );
    reconcileEmpireProduction({ empire, worlds: empirePlanets, rng });
  }

  // 6) Place special resources.
  placeSpecials({ empires, systems, planets, rng });

  // 7) Generate hyperlanes (existing MST-first logic, unchanged).
  const rawHyperlanes = generateHyperlanes(
    rng,
    systems,
    galaxyShape,
    hyperlaneDensity,
    mapBounds,
  );
  const hyperlanes = pruneEmpireBorderChokepoints(
    rawHyperlanes,
    systems,
    HYPERLANE_DENSITY_CONFIGS[hyperlaneDensity].chokepoints,
  );

  return { sectors, empires, systems, planets, hyperlanes };
}

function ensureAllPlanetTypes(rng: SeededRNG, planets: Planet[]): void {
  const existingTypes = new Set(planets.map((p) => p.type));
  const missingTypes = ALL_PLANET_TYPES.filter((t) => !existingTypes.has(t));

  for (const missingType of missingTypes) {
    const typeCounts = new Map<PlanetTypeT, number>();
    for (const p of planets) {
      typeCounts.set(p.type, (typeCounts.get(p.type) ?? 0) + 1);
    }
    const candidates = planets.filter((p) => (typeCounts.get(p.type) ?? 0) > 1);
    if (candidates.length > 0) {
      const target = rng.pick(candidates);
      const idx = planets.indexOf(target);
      const newPop = generatePopulation(rng, missingType);
      planets[idx] = buildPlanet({
        rng,
        id: target.id,
        name: target.name,
        systemId: target.systemId,
        type: missingType,
        x: target.x,
        y: target.y,
        population: newPop,
        orbitRadius: target.orbitRadius ?? 8,
        orbitPeriodQuarters: target.orbitPeriodQuarters ?? 4,
        orbitPhase: target.orbitPhase ?? 0,
        orbitInclination: target.orbitInclination ?? 0,
      });
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

function nextHalfedge(e: number): number {
  return e % 3 === 2 ? e - 2 : e + 1;
}

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

  // Build Delaunay triangulation — O(n log n) and planar by construction.
  // HYPERLANE_DENSITY_CONFIGS comment already says "fraction of Delaunay edges";
  // this makes that literally true instead of a superset approximation.
  const coords = new Float64Array(systems.length * 2);
  for (let i = 0; i < systems.length; i++) {
    coords[i * 2] = systems[i].x;
    coords[i * 2 + 1] = systems[i].y;
  }
  const delaunay = new Delaunator(coords);

  const allEdges: Edge[] = [];
  const nearestNeighborDist = new Float64Array(systems.length).fill(Infinity);
  for (let e = 0; e < delaunay.triangles.length; e++) {
    // Skip the reverse half-edge so each undirected edge is processed once.
    // Hull edges (halfedges[e] === -1) have no reverse — always include them.
    if (delaunay.halfedges[e] !== -1 && e > delaunay.halfedges[e]) continue;
    const a = delaunay.triangles[e];
    const b = delaunay.triangles[nextHalfedge(e)];
    const dx = systems[a].x - systems[b].x;
    const dy = systems[a].y - systems[b].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    allEdges.push({ a, b, dist });
    if (dist < nearestNeighborDist[a]) nearestNeighborDist[a] = dist;
    if (dist < nearestNeighborDist[b]) nearestNeighborDist[b] = dist;
  }
  allEdges.sort((a, b) => a.dist - b.dist);

  const nnSorted = Array.from(nearestNeighborDist)
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  const nn75 = percentileFromSorted(nnSorted, 0.75);
  const mapW = bounds.maxX - bounds.minX;
  const mapH = bounds.maxY - bounds.minY;
  const mapDiagonal = Math.sqrt(mapW * mapW + mapH * mapH);
  const absoluteMaxEdge = mapDiagonal * 0.35;
  const longEdgeLimit = Math.min(
    nn75 * (2.5 + densityCfg.keepRatio * 1.0),
    absoluteMaxEdge,
  );

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
    connCount[a]++;
    connCount[b]++;
    adjacency[a].add(b);
    adjacency[b].add(a);
    union(a, b);
    return true;
  }

  function addMSTEdge(a: number, b: number): boolean {
    const key = edgeKey(a, b);
    if (keptEdges.has(key)) return false;
    keptEdges.add(key);
    connCount[a]++;
    connCount[b]++;
    adjacency[a].add(b);
    adjacency[b].add(a);
    union(a, b);
    return true;
  }

  for (const e of allEdges) {
    if (find(e.a) === find(e.b)) continue;
    if (e.dist > absoluteMaxEdge) continue;
    addMSTEdge(e.a, e.b);
  }
  for (const e of allEdges) {
    if (find(e.a) === find(e.b)) continue;
    addMSTEdge(e.a, e.b);
  }

  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;

  for (const e of allEdges) {
    if (keptEdges.size >= targetEdges) break;
    if (keptEdges.has(edgeKey(e.a, e.b))) continue;
    if (connCount[e.a] >= maxConn || connCount[e.b] >= maxConn) continue;
    if (e.dist > longEdgeLimit) continue;

    if (hasSharedNeighbor(adjacency, e.a, e.b) && rng.next() < 0.8) continue;

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
      const key = edgeKey(c.a, c.b);
      if (keptEdges.has(key)) continue;
      keptEdges.add(key);
      connCount[c.a]++;
      connCount[c.b]++;
      adjacency[c.a].add(c.b);
      adjacency[c.b].add(c.a);
    }
  }

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

function pruneEmpireBorderChokepoints(
  hyperlanes: Hyperlane[],
  systems: StarSystem[],
  maxPerPair: number,
): Hyperlane[] {
  const sysById = new Map(systems.map((s) => [s.id, s]));
  const sysIdx = new Map(systems.map((s, i) => [s.id, i]));
  const intraEmpire: Hyperlane[] = [];
  const crossByPair = new Map<string, Hyperlane[]>();

  for (const hl of hyperlanes) {
    const empA = sysById.get(hl.systemA)?.empireId;
    const empB = sysById.get(hl.systemB)?.empireId;
    if (!empA || !empB || empA === empB) {
      intraEmpire.push(hl);
    } else {
      const key = empA < empB ? `${empA}|${empB}` : `${empB}|${empA}`;
      const arr = crossByPair.get(key) ?? [];
      arr.push(hl);
      crossByPair.set(key, arr);
    }
  }

  const kept: Hyperlane[] = [];
  const pruned: Hyperlane[] = [];
  for (const [, lanes] of crossByPair) {
    lanes.sort((a, b) => a.distance - b.distance);
    kept.push(...lanes.slice(0, maxPerPair));
    pruned.push(...lanes.slice(maxPerPair));
  }

  const parent = new Int32Array(systems.length);
  for (let i = 0; i < systems.length; i++) parent[i] = i;
  const ufFind = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const ufUnion = (a: number, b: number): boolean => {
    const ra = ufFind(a);
    const rb = ufFind(b);
    if (ra === rb) return false;
    parent[ra] = rb;
    return true;
  };

  for (const hl of [...intraEmpire, ...kept]) {
    ufUnion(sysIdx.get(hl.systemA)!, sysIdx.get(hl.systemB)!);
  }

  pruned.sort((a, b) => a.distance - b.distance);
  for (const hl of pruned) {
    const a = sysIdx.get(hl.systemA)!;
    const b = sysIdx.get(hl.systemB)!;
    if (ufFind(a) !== ufFind(b)) {
      kept.push(hl);
      ufUnion(a, b);
    }
  }

  return [...intraEmpire, ...kept];
}

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
      const toCenter = Math.atan2(midY - cy, midX - cx);
      const edgeAngle = Math.atan2(dy, dx);
      const angleDiff = Math.abs(Math.sin(edgeAngle - toCenter - Math.PI / 2));
      return 0.3 + 0.7 * angleDiff;
    }
    case GalaxyShape.Ring: {
      const toCenter = Math.atan2(midY - cy, midX - cx);
      const edgeAngle = Math.atan2(dy, dx);
      const angleDiff = Math.abs(Math.sin(edgeAngle - toCenter - Math.PI / 2));
      return 0.2 + 0.8 * angleDiff;
    }
    case GalaxyShape.Elliptical: {
      const maxDist = Math.max(
        Math.abs(sysA.x - cx) + Math.abs(sysB.x - cx),
        200,
      );
      return Math.max(0.2, 1 - dist / maxDist);
    }
    case GalaxyShape.Irregular: {
      return sysA.empireId === sysB.empireId ? 0.8 : 0.3;
    }
    default:
      return 0.5;
  }
}

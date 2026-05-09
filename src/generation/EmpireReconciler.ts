import { BIOMES, getBiomesForType } from "../data/biomes.ts";
import { REQUIRED_PRODUCER_TYPES } from "../data/constants.ts";
import type { CargoType, Empire, Planet, PlanetBiome } from "../data/types.ts";
import { PlanetType } from "../data/types.ts";
import type { SeededRNG } from "../utils/SeededRNG.ts";

export function reconcileEmpireProduction(opts: {
  empire: Empire;
  worlds: Planet[];
  rng: SeededRNG;
}): { reassigned: number } {
  const { worlds, rng } = opts;
  let reassigned = 0;

  for (const required of REQUIRED_PRODUCER_TYPES) {
    if (coverageHas(worlds, required)) continue;

    const target = pickReassignmentTarget(worlds, required);
    if (!target) continue;

    const newBiome =
      pickBiomeForGood(target.type, required, rng) ??
      syntheticFrontierFor(required);
    target.biome = newBiome.id;
    target.productionTags = [...newBiome.produces];
    target.consumptionTags = [...newBiome.consumes];
    target.productionScale = newBiome.productionScale;
    reassigned += 1;
  }

  return { reassigned };
}

function coverageHas(worlds: Planet[], good: CargoType): boolean {
  return worlds.some((w) => w.productionTags.includes(good));
}

function pickReassignmentTarget(
  worlds: Planet[],
  _good: CargoType,
): Planet | undefined {
  // Prefer Frontier worlds with no production yet assigned
  const emptyFrontiers = worlds.filter(
    (w) => w.type === PlanetType.Frontier && w.productionTags.length === 0,
  );
  if (emptyFrontiers.length > 0) return emptyFrontiers[0];
  // Fall back to any Frontier
  const frontiers = worlds.filter((w) => w.type === PlanetType.Frontier);
  if (frontiers.length > 0) return frontiers[0];
  // Fall back to any world with no production
  const empty = worlds.filter((w) => w.productionTags.length === 0);
  if (empty.length > 0) return empty[0];
  return worlds[0];
}

function pickBiomeForGood(
  type: PlanetType,
  good: CargoType,
  rng: SeededRNG,
): ReturnType<typeof syntheticFrontierFor> | null {
  const candidates = getBiomesForType(type).filter((b) =>
    b.produces.includes(good),
  );
  if (candidates.length === 0) {
    const all = Object.values(BIOMES).filter((b) => b.produces.includes(good));
    if (all.length === 0) return null;
    return all[pickRandomIndex(rng, all.length)];
  }
  return candidates[pickRandomIndex(rng, candidates.length)];
}

function syntheticFrontierFor(good: CargoType): {
  id: PlanetBiome;
  parentType: PlanetType;
  produces: CargoType[];
  consumes: CargoType[];
  zoneWeights: { inner: number; middle: number; outer: number };
  popCapMultiplier: number;
  productionScale: number;
} {
  return {
    id: `synthetic_${good}` as PlanetBiome,
    parentType: PlanetType.Frontier,
    produces: [good],
    consumes: ["food" as CargoType, "medical" as CargoType],
    zoneWeights: { inner: 0.33, middle: 0.34, outer: 0.33 },
    popCapMultiplier: 0.5,
    productionScale: 0.5,
  };
}

function pickRandomIndex(rng: SeededRNG, length: number): number {
  return rng.nextInt(0, length - 1);
}

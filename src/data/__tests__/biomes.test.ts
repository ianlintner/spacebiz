import { describe, expect, it } from "vitest";
import { CargoType, PlanetBiome, PlanetType } from "../types.ts";
import { BIOMES, getBiomesForType, getBiome } from "../biomes.ts";

describe("biomes", () => {
  it("defines exactly 21 biomes total (3 per type x 7 types)", () => {
    expect(Object.keys(BIOMES).length).toBe(21);
  });

  it("breadbasket is Agricultural and produces food", () => {
    const b = getBiome(PlanetBiome.Breadbasket);
    expect(b.parentType).toBe(PlanetType.Agricultural);
    expect(b.produces).toContain(CargoType.Food);
  });

  it("each biome lists at most 3 produce tags and at most 4 consume tags", () => {
    for (const biome of Object.values(BIOMES)) {
      expect(biome.produces.length).toBeLessThanOrEqual(3);
      expect(biome.consumes.length).toBeLessThanOrEqual(4);
    }
  });

  it("getBiomesForType returns 3 biomes for each PlanetType", () => {
    for (const t of Object.values(PlanetType)) {
      expect(getBiomesForType(t).length).toBe(3);
    }
  });

  it("zone weights sum to roughly 1 per biome", () => {
    for (const biome of Object.values(BIOMES)) {
      const sum =
        biome.zoneWeights.inner +
        biome.zoneWeights.middle +
        biome.zoneWeights.outer;
      expect(sum).toBeCloseTo(1.0, 1);
    }
  });
});

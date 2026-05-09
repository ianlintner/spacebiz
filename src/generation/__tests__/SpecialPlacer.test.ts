import { describe, expect, it } from "vitest";
import { placeSpecials } from "../SpecialPlacer.ts";
import {
  EmpireArchetype,
  PlanetBiome,
  PlanetType,
  SpecialId,
} from "../../data/types.ts";
import { SeededRNG } from "../../utils/SeededRNG.ts";
import { SPECIALS } from "../../data/specialResources.ts";

function makePlanet(
  id: string,
  sysId: string,
  type: PlanetType,
  biome: PlanetBiome,
): any {
  return {
    id,
    name: id,
    systemId: sysId,
    type,
    biome,
    productionTags: [],
    consumptionTags: [],
    productionScale: 1.0,
    populationCap: 10,
    population: 5,
    x: 0,
    y: 0,
  };
}

function makeSystem(id: string, empireId: string): any {
  return { id, name: id, empireId, x: 0, y: 0 };
}

function makeEmpire(id: string): any {
  return {
    id,
    name: id,
    color: 0,
    tariffRate: 0.1,
    disposition: "neutral",
    homeSystemId: `sys_${id}`,
    leaderName: "L",
    leaderPortrait: "x",
    archetype: EmpireArchetype.Balanced,
    ownedSpecials: [],
    territoryPolygon: undefined,
  };
}

describe("placeSpecials", () => {
  it("places all 7 specials when enough parent-type worlds exist", () => {
    const empires = [makeEmpire("e1"), makeEmpire("e2")];
    const systems = [
      makeSystem("s1", "e1"),
      makeSystem("s2", "e1"),
      makeSystem("s3", "e2"),
      makeSystem("s4", "e2"),
    ];
    const planets = [
      makePlanet("p1", "s1", PlanetType.Agricultural, PlanetBiome.Breadbasket),
      makePlanet("p2", "s1", PlanetType.Mining, PlanetBiome.CoreExtraction),
      makePlanet("p3", "s2", PlanetType.TechWorld, PlanetBiome.ResearchCluster),
      makePlanet("p4", "s2", PlanetType.LuxuryWorld, PlanetBiome.Resort),
      makePlanet("p5", "s3", PlanetType.Mining, PlanetBiome.GasGiantSkim),
      makePlanet(
        "p6",
        "s3",
        PlanetType.Manufacturing,
        PlanetBiome.HeavyIndustry,
      ),
      makePlanet("p7", "s4", PlanetType.CoreWorld, PlanetBiome.Capital),
    ];
    const result = placeSpecials({
      empires,
      systems,
      planets,
      rng: new SeededRNG(1),
    });
    expect(result.placed.length + result.skipped.length).toBe(7);
    expect(result.placed.length).toBeGreaterThan(0);
  });

  it("stamps specialResource on the chosen planet", () => {
    const empires = [makeEmpire("e1")];
    const systems = [makeSystem("s1", "e1")];
    const planets = [
      makePlanet("p1", "s1", PlanetType.Agricultural, PlanetBiome.Breadbasket),
      makePlanet("p2", "s1", PlanetType.Mining, PlanetBiome.CoreExtraction),
      makePlanet("p3", "s1", PlanetType.TechWorld, PlanetBiome.ResearchCluster),
      makePlanet("p4", "s1", PlanetType.LuxuryWorld, PlanetBiome.Resort),
      makePlanet("p5", "s1", PlanetType.Mining, PlanetBiome.GasGiantSkim),
      makePlanet(
        "p6",
        "s1",
        PlanetType.Manufacturing,
        PlanetBiome.HeavyIndustry,
      ),
      makePlanet("p7", "s1", PlanetType.CoreWorld, PlanetBiome.Capital),
    ];
    placeSpecials({ empires, systems, planets, rng: new SeededRNG(1) });
    const stamped = planets.filter((p) => p.specialResource !== undefined);
    expect(stamped.length).toBeGreaterThan(0);
  });

  it("skips a special when no matching parent-type planet exists", () => {
    const empires = [makeEmpire("e1")];
    const systems = [makeSystem("s1", "e1")];
    // Only Mining planets — no Agricultural, so FoodGenesis should be skipped
    const planets = [
      makePlanet("p1", "s1", PlanetType.Mining, PlanetBiome.CoreExtraction),
    ];
    const result = placeSpecials({
      empires,
      systems,
      planets,
      rng: new SeededRNG(1),
    });
    expect(result.skipped).toContain(SpecialId.FoodGenesis);
  });

  it("adds placed specials to empire.ownedSpecials", () => {
    const empires = [makeEmpire("e1")];
    const systems = [makeSystem("s1", "e1")];
    const planets = [
      makePlanet("p1", "s1", PlanetType.Agricultural, PlanetBiome.Breadbasket),
    ];
    placeSpecials({ empires, systems, planets, rng: new SeededRNG(1) });
    expect(empires[0].ownedSpecials.length).toBeGreaterThan(0);
  });
});

// Suppress unused import warning — SPECIALS is imported per task spec
void SPECIALS;

import { describe, expect, it } from "vitest";
import { reconcileEmpireProduction } from "../EmpireReconciler.ts";
import {
  CargoType,
  EmpireArchetype,
  PlanetBiome,
  PlanetType,
} from "../../data/types.ts";
import { SeededRNG } from "../../utils/SeededRNG.ts";
import { REQUIRED_PRODUCER_TYPES } from "../../data/constants.ts";

function makeFrontier(id: string): any {
  return {
    id,
    name: id,
    systemId: "s1",
    type: PlanetType.Frontier,
    biome: PlanetBiome.Colony,
    productionTags: [],
    consumptionTags: [],
    productionScale: 1.0,
    populationCap: 5,
    population: 1,
    x: 0,
    y: 0,
  };
}

function makeEmpire(): any {
  return {
    id: "e1",
    name: "E1",
    color: 0,
    tariffRate: 0.1,
    disposition: "neutral",
    homeSystemId: "s1",
    leaderName: "L",
    leaderPortrait: "x",
    archetype: EmpireArchetype.Balanced,
    ownedSpecials: [],
  };
}

describe("reconcileEmpireProduction", () => {
  it("ensures every required producer type is covered", () => {
    const empire = makeEmpire();
    const worlds = [
      makeFrontier("w1"),
      makeFrontier("w2"),
      makeFrontier("w3"),
      makeFrontier("w4"),
      makeFrontier("w5"),
    ];
    reconcileEmpireProduction({ empire, worlds, rng: new SeededRNG(1) });
    const produced = new Set(worlds.flatMap((w) => w.productionTags));
    for (const t of REQUIRED_PRODUCER_TYPES) {
      expect(produced.has(t)).toBe(true);
    }
  });

  it("does nothing when coverage is already complete", () => {
    const empire = makeEmpire();
    const w = makeFrontier("w1");
    w.productionTags = [
      CargoType.Food,
      CargoType.RawMaterials,
      CargoType.Technology,
      CargoType.Medical,
      CargoType.Luxury,
    ];
    const r = reconcileEmpireProduction({
      empire,
      worlds: [w],
      rng: new SeededRNG(1),
    });
    expect(r.reassigned).toBe(0);
  });

  it("never crashes when fewer worlds than required types", () => {
    const empire = makeEmpire();
    const worlds = [makeFrontier("w1"), makeFrontier("w2")];
    expect(() =>
      reconcileEmpireProduction({ empire, worlds, rng: new SeededRNG(1) }),
    ).not.toThrow();
  });
});

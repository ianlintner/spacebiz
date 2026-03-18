import { describe, it, expect } from "vitest";
import { NameGenerator } from "../NameGenerator.ts";
import { SeededRNG } from "../../utils/SeededRNG.ts";

describe("NameGenerator", () => {
  it("same seed produces same sector names", () => {
    const gen1 = new NameGenerator(new SeededRNG(42));
    const gen2 = new NameGenerator(new SeededRNG(42));
    const names1 = Array.from({ length: 5 }, () => gen1.generateSectorName());
    const names2 = Array.from({ length: 5 }, () => gen2.generateSectorName());
    expect(names1).toEqual(names2);
  });

  it("same seed produces same system names", () => {
    const gen1 = new NameGenerator(new SeededRNG(42));
    const gen2 = new NameGenerator(new SeededRNG(42));
    const names1 = Array.from({ length: 10 }, () => gen1.generateSystemName());
    const names2 = Array.from({ length: 10 }, () => gen2.generateSystemName());
    expect(names1).toEqual(names2);
  });

  it("same seed produces same planet names", () => {
    const gen1 = new NameGenerator(new SeededRNG(42));
    const gen2 = new NameGenerator(new SeededRNG(42));
    const names1 = Array.from({ length: 20 }, () => gen1.generatePlanetName());
    const names2 = Array.from({ length: 20 }, () => gen2.generatePlanetName());
    expect(names1).toEqual(names2);
  });

  it("generated sector names are non-empty strings", () => {
    const gen = new NameGenerator(new SeededRNG(99));
    for (let i = 0; i < 10; i++) {
      const name = gen.generateSectorName();
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("generated system names are non-empty strings", () => {
    const gen = new NameGenerator(new SeededRNG(99));
    for (let i = 0; i < 20; i++) {
      const name = gen.generateSystemName();
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("generated planet names are non-empty strings", () => {
    const gen = new NameGenerator(new SeededRNG(99));
    for (let i = 0; i < 30; i++) {
      const name = gen.generatePlanetName();
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("batch of 50 system names has no duplicates", () => {
    const gen = new NameGenerator(new SeededRNG(12345));
    const names = Array.from({ length: 50 }, () => gen.generateSystemName());
    const unique = new Set(names);
    expect(unique.size).toBe(50);
  });

  it("batch of 50 planet names has no duplicates", () => {
    const gen = new NameGenerator(new SeededRNG(12345));
    const names = Array.from({ length: 50 }, () => gen.generatePlanetName());
    const unique = new Set(names);
    expect(unique.size).toBe(50);
  });

  it("batch of 50 mixed names has no duplicates", () => {
    const gen = new NameGenerator(new SeededRNG(77));
    const names: string[] = [];
    for (let i = 0; i < 10; i++) names.push(gen.generateSectorName());
    for (let i = 0; i < 20; i++) names.push(gen.generateSystemName());
    for (let i = 0; i < 20; i++) names.push(gen.generatePlanetName());
    const unique = new Set(names);
    expect(unique.size).toBe(50);
  });

  it("different seeds produce different names", () => {
    const gen1 = new NameGenerator(new SeededRNG(100));
    const gen2 = new NameGenerator(new SeededRNG(200));
    const name1 = gen1.generateSystemName();
    const name2 = gen2.generateSystemName();
    expect(name1).not.toBe(name2);
  });

  it("sector names contain a space (two-word format)", () => {
    const gen = new NameGenerator(new SeededRNG(42));
    for (let i = 0; i < 10; i++) {
      const name = gen.generateSectorName();
      expect(name).toContain(" ");
    }
  });

  it("reset clears used names", () => {
    const gen = new NameGenerator(new SeededRNG(42));
    gen.generateSystemName();
    gen.reset();
    expect(gen["usedNames"].size).toBe(0);
  });
});

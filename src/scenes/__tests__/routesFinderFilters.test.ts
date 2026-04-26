import { describe, it, expect } from "vitest";
import { isInDistanceBand, matchesScopeBand } from "../routesFinderFilters.ts";

describe("isInDistanceBand", () => {
  it("returns true for any distance when band is null", () => {
    expect(isInDistanceBand(0, null)).toBe(true);
    expect(isInDistanceBand(49.9, null)).toBe(true);
    expect(isInDistanceBand(50, null)).toBe(true);
    expect(isInDistanceBand(1000, null)).toBe(true);
  });

  it("classifies short routes (< 50)", () => {
    expect(isInDistanceBand(0, "short")).toBe(true);
    expect(isInDistanceBand(49.9, "short")).toBe(true);
    expect(isInDistanceBand(50, "short")).toBe(false);
    expect(isInDistanceBand(150, "short")).toBe(false);
  });

  it("classifies medium routes (50–150 inclusive)", () => {
    expect(isInDistanceBand(50, "medium")).toBe(true);
    expect(isInDistanceBand(100, "medium")).toBe(true);
    expect(isInDistanceBand(150, "medium")).toBe(true);
    expect(isInDistanceBand(49.9, "medium")).toBe(false);
    expect(isInDistanceBand(150.1, "medium")).toBe(false);
  });

  it("classifies long routes (> 150)", () => {
    expect(isInDistanceBand(150, "long")).toBe(false);
    expect(isInDistanceBand(150.1, "long")).toBe(true);
    expect(isInDistanceBand(1000, "long")).toBe(true);
  });

  it("partitions every distance into exactly one of short/medium/long", () => {
    for (const d of [0, 25, 49.9, 50, 75, 150, 150.01, 200, 1000]) {
      const bands = (["short", "medium", "long"] as const).filter((b) =>
        isInDistanceBand(d, b),
      );
      expect(bands.length).toBe(1);
    }
  });
});

describe("matchesScopeBand", () => {
  it("matches every route when band is null", () => {
    expect(matchesScopeBand("s1", "s1", "e1", "e1", null)).toBe(true);
    expect(matchesScopeBand("s1", "s2", "e1", "e2", null)).toBe(true);
    expect(matchesScopeBand("s1", "s2", null, null, null)).toBe(true);
  });

  it("system: same system regardless of empire resolution", () => {
    expect(matchesScopeBand("s1", "s1", "e1", "e1", "system")).toBe(true);
    expect(matchesScopeBand("s1", "s1", null, null, "system")).toBe(true);
    expect(matchesScopeBand("s1", "s2", "e1", "e1", "system")).toBe(false);
  });

  it("empire: cross-system, same empire OR unresolved empire", () => {
    expect(matchesScopeBand("s1", "s2", "e1", "e1", "empire")).toBe(true);
    // unresolved empire → defaults to interstellar bucket, not interEmpire
    expect(matchesScopeBand("s1", "s2", "e1", null, "empire")).toBe(true);
    expect(matchesScopeBand("s1", "s2", null, "e1", "empire")).toBe(true);
    expect(matchesScopeBand("s1", "s2", null, null, "empire")).toBe(true);
    // strictly cross-empire belongs to interEmpire, not interstellar
    expect(matchesScopeBand("s1", "s2", "e1", "e2", "empire")).toBe(false);
    // local routes never match interstellar
    expect(matchesScopeBand("s1", "s1", "e1", "e1", "empire")).toBe(false);
  });

  it("galactic: cross-system AND both empires resolved AND distinct", () => {
    expect(matchesScopeBand("s1", "s2", "e1", "e2", "galactic")).toBe(true);
    expect(matchesScopeBand("s1", "s2", "e1", "e1", "galactic")).toBe(false);
    expect(matchesScopeBand("s1", "s2", "e1", null, "galactic")).toBe(false);
    expect(matchesScopeBand("s1", "s2", null, "e2", "galactic")).toBe(false);
    expect(matchesScopeBand("s1", "s1", "e1", "e2", "galactic")).toBe(false);
  });

  it("partitions every cross-system route into empire XOR galactic", () => {
    const cases: Array<[string | null, string | null]> = [
      ["e1", "e1"],
      ["e1", "e2"],
      ["e1", null],
      [null, "e2"],
      [null, null],
    ];
    for (const [oe, de] of cases) {
      const inter = matchesScopeBand("s1", "s2", oe, de, "empire");
      const cross = matchesScopeBand("s1", "s2", oe, de, "galactic");
      expect(inter !== cross).toBe(true);
    }
  });
});

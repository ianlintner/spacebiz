import { describe, it, expect } from "vitest";
import { isInDistanceBand } from "../routesFinderFilters.ts";

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
      const bands = (
        ["short", "medium", "long"] as const
      ).filter((b) => isInDistanceBand(d, b));
      expect(bands.length).toBe(1);
    }
  });
});

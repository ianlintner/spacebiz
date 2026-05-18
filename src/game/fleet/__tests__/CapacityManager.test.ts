import { describe, it, expect } from "vitest";
import {
  getCapacityCostForScope,
  computeOvercapacityFactors,
  computeRouteOperatingCost,
  computeUtilization,
} from "../CapacityManager.ts";

describe("getCapacityCostForScope", () => {
  it("returns 1 for system scope", () => {
    expect(getCapacityCostForScope("system")).toBe(1);
  });
  it("returns 2 for empire scope", () => {
    expect(getCapacityCostForScope("empire")).toBe(2);
  });
  it("returns 3 for galactic scope", () => {
    expect(getCapacityCostForScope("galactic")).toBe(3);
  });
});

describe("computeUtilization", () => {
  it("returns 1.0 when used equals total", () => {
    expect(computeUtilization(4, 4)).toBe(1.0);
  });
  it("returns 0 when nothing used", () => {
    expect(computeUtilization(0, 4)).toBe(0);
  });
  it("returns 1.5 when 50% over capacity", () => {
    expect(computeUtilization(6, 4)).toBe(1.5);
  });
  it("returns 0 when totalCapacity is 0 (no div by zero)", () => {
    expect(computeUtilization(5, 0)).toBe(0);
  });
});

describe("computeOvercapacityFactors", () => {
  it("returns no penalty at exactly 100% utilization", () => {
    const { revenueMultiplier, costMultiplier } =
      computeOvercapacityFactors(1.0);
    expect(revenueMultiplier).toBe(1.0);
    expect(costMultiplier).toBe(1.0);
  });

  it("applies small quadratic revenue penalty at 110%", () => {
    const { revenueMultiplier } = computeOvercapacityFactors(1.1);
    // overcrowdingFactor = 0.1; rev = 1 - 0.01 * 0.8 = 0.992
    expect(revenueMultiplier).toBeCloseTo(0.992, 3);
  });

  it("applies cubic cost penalty at 150%", () => {
    const { costMultiplier } = computeOvercapacityFactors(1.5);
    // overcrowdingFactor = 0.5; cost = 1 + 0.125 * 2 = 1.25
    expect(costMultiplier).toBeCloseTo(1.25, 3);
  });

  it("revenue multiplier never goes below 0", () => {
    const { revenueMultiplier } = computeOvercapacityFactors(2.5);
    expect(revenueMultiplier).toBeGreaterThanOrEqual(0);
  });

  it("no penalty below 100% utilization", () => {
    const { revenueMultiplier, costMultiplier } =
      computeOvercapacityFactors(0.8);
    expect(revenueMultiplier).toBe(1.0);
    expect(costMultiplier).toBe(1.0);
  });
});

describe("computeRouteOperatingCost", () => {
  it("returns base rate × scope cost × hull efficiency for system/MkI", () => {
    // 3000 * 1 * 1.0 = 3000
    expect(computeRouteOperatingCost("system", 1)).toBe(3_000);
  });
  it("returns correct cost for galactic/MkIII", () => {
    // 3000 * 3 * 0.8 = 7200
    expect(computeRouteOperatingCost("galactic", 3)).toBe(7_200);
  });
  it("returns correct cost for empire/MkV", () => {
    // 3000 * 2 * 0.6 = 3600
    expect(computeRouteOperatingCost("empire", 5)).toBe(3_600);
  });
});

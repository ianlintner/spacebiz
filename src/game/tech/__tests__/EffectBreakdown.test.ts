import { describe, it, expect } from "vitest";
import { getEffectBreakdown } from "../EffectBreakdown.ts";
import type { TechState } from "../../../data/types.ts";

function emptyTechState(): TechState {
  return {
    researchPoints: 0,
    completedTechIds: [],
    purchaseCount: {},
    queue: [],
    currentResearchId: null,
    researchProgress: 0,
    committedBranches: [],
  };
}

describe("getEffectBreakdown", () => {
  it("returns empty array when no techs owned", () => {
    expect(getEffectBreakdown(emptyTechState())).toEqual([]);
  });

  it("returns one entry per distinct effect type", () => {
    const tech: TechState = {
      ...emptyTechState(),
      completedTechIds: ["logistics_hub"],
      purchaseCount: { logistics_hub: 1 },
    };
    // logistics_hub effect: addRouteSlots +1
    const breakdown = getEffectBreakdown(tech);
    const slots = breakdown.find((e) => e.effectType === "addRouteSlots");
    expect(slots).toBeDefined();
    expect(slots?.value).toBe(1);
    expect(slots?.sources).toHaveLength(1);
    expect(slots?.sources[0].techId).toBe("logistics_hub");
    expect(slots?.sources[0].contribution).toBe(1);
  });

  it("multiplies repeatable tech contributions by purchase count", () => {
    const tech: TechState = {
      ...emptyTechState(),
      completedTechIds: ["fuel_efficiency_1"],
      purchaseCount: { fuel_efficiency_1: 3 },
    };
    // fuel_efficiency_1 effect: modifyFuel -0.01 per purchase
    const breakdown = getEffectBreakdown(tech);
    const fuel = breakdown.find((e) => e.effectType === "modifyFuel");
    expect(fuel?.value).toBeCloseTo(-0.03);
    expect(fuel?.sources[0].contribution).toBeCloseTo(-0.03);
  });

  it("aggregates multiple techs with the same effect type", () => {
    const tech: TechState = {
      ...emptyTechState(),
      completedTechIds: ["logistics_hub", "logistics_3"],
      purchaseCount: { logistics_hub: 1, logistics_3: 1 },
    };
    // both contribute addRouteSlots
    const slots = getEffectBreakdown(tech).find(
      (e) => e.effectType === "addRouteSlots",
    );
    expect(slots?.value).toBe(2);
    expect(slots?.sources).toHaveLength(2);
  });

  it("classifies sign correctly", () => {
    const tech: TechState = {
      ...emptyTechState(),
      purchaseCount: { fuel_efficiency_1: 1, logistics_hub: 1 },
    };
    const breakdown = getEffectBreakdown(tech);
    expect(breakdown.find((e) => e.effectType === "modifyFuel")?.sign).toBe(
      "negative",
    );
    expect(breakdown.find((e) => e.effectType === "addRouteSlots")?.sign).toBe(
      "positive",
    );
  });

  it("skips effect types with zero net value", () => {
    const tech: TechState = {
      ...emptyTechState(),
      purchaseCount: { logistics_hub: 1 },
    };
    for (const entry of getEffectBreakdown(tech)) {
      expect(entry.value).not.toBe(0);
    }
  });
});

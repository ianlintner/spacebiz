import { describe, it, expect, beforeEach } from "vitest";
import { invariants } from "../Invariants";
import { gameStore } from "../../data/GameStore";
import { logController } from "../log";

describe("Invariants", () => {
  beforeEach(() => {
    logController.clear();
    logController.mirror(false);
    gameStore.reset();
  });

  it("passes baseline invariants on default state", () => {
    const violations = invariants.run();
    expect(violations).toEqual([]);
  });

  it("reports violations for invalid state", () => {
    gameStore.update({ reputation: 150 });
    const violations = invariants.run();
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some((v) => v.name === "reputation-range")).toBe(true);
  });

  it("custom invariants surface with string messages", () => {
    invariants.register("cash-above-1k", (s) =>
      s.cash > 1000 ? true : `cash too low: ${s.cash}`,
    );
    gameStore.update({ cash: 500 });
    const v = invariants.run().find((x) => x.name === "cash-above-1k");
    expect(v?.message).toBe("cash too low: 500");
  });

  it("recent() accumulates violations", () => {
    gameStore.update({ reputation: -5 });
    invariants.run();
    invariants.run();
    expect(invariants.recent().length).toBeGreaterThanOrEqual(2);
  });
});

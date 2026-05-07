import { describe, it, expect } from "vitest";
// TechGraphCanvas requires Phaser which isn't available in Node test env
// Just test the pure helper exports
import { BRANCH_LABELS } from "../TechGraphCanvas.ts";

describe("BRANCH_LABELS", () => {
  it("has all 5 branches", () => {
    expect(Object.keys(BRANCH_LABELS)).toHaveLength(5);
  });
  it("includes Logistics", () => {
    expect(BRANCH_LABELS["Logistics"]).toBeDefined();
  });
});

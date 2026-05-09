import { describe, expect, it } from "vitest";
import { generateGalaxy } from "../GalaxyGenerator.ts";

describe("generation performance", () => {
  it("generates a quick galaxy in under 500ms", () => {
    const start = performance.now();
    generateGalaxy(1, "quick");
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});

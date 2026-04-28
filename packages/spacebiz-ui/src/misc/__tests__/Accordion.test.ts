import { describe, it, expect } from "vitest";
import { computeNextExpanded } from "../accordionLogic.ts";

describe("Accordion expansion logic", () => {
  it("toggles a closed section to open in single-mode", () => {
    const next = computeNextExpanded(new Set<number>(), 1, false);
    expect([...next].sort()).toEqual([1]);
  });

  it("toggles an open section to closed", () => {
    const next = computeNextExpanded(new Set<number>([2]), 2, false);
    expect([...next]).toEqual([]);
  });

  it("collapses other sections when single-mode opens a new one", () => {
    const next = computeNextExpanded(new Set<number>([0, 3]), 1, false);
    expect([...next].sort()).toEqual([1]);
  });

  it("preserves other sections when allowMultiple opens a new one", () => {
    const next = computeNextExpanded(new Set<number>([0, 3]), 1, true);
    expect([...next].sort()).toEqual([0, 1, 3]);
  });

  it("only closes the toggled section when it is already open in multi-mode", () => {
    const next = computeNextExpanded(new Set<number>([0, 1, 2]), 1, true);
    expect([...next].sort()).toEqual([0, 2]);
  });

  it("does not mutate the input set", () => {
    const input = new Set<number>([0]);
    const snapshot = [...input];
    computeNextExpanded(input, 1, true);
    expect([...input]).toEqual(snapshot);
  });
});

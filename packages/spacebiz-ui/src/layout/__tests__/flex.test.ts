import { describe, it, expect } from "vitest";
import { alignCross, computeFlex } from "../flexMath.ts";

describe("computeFlex", () => {
  it("returns empty result for no children", () => {
    const r = computeFlex({
      containerSize: 100,
      gap: 0,
      justify: "start",
      children: [],
      mainSizes: [],
    });
    expect(r.sizes).toEqual([]);
    expect(r.positions).toEqual([]);
  });

  it("packs children at start with gap", () => {
    const r = computeFlex({
      containerSize: 200,
      gap: 10,
      justify: "start",
      children: [
        { width: 0, height: 0 },
        { width: 0, height: 0 },
      ],
      mainSizes: [40, 40],
    });
    expect(r.positions).toEqual([0, 50]);
    expect(r.sizes).toEqual([40, 40]);
  });

  it("centers children in extra space", () => {
    const r = computeFlex({
      containerSize: 200,
      gap: 0,
      justify: "center",
      children: [{ width: 0, height: 0 }],
      mainSizes: [60],
    });
    expect(r.positions[0]).toBe(70);
  });

  it("applies space-between", () => {
    const r = computeFlex({
      containerSize: 300,
      gap: 0,
      justify: "space-between",
      children: [
        { width: 0, height: 0 },
        { width: 0, height: 0 },
        { width: 0, height: 0 },
      ],
      mainSizes: [50, 50, 50],
    });
    expect(r.positions).toEqual([0, 125, 250]);
  });

  it("distributes flex weight across free space", () => {
    const r = computeFlex({
      containerSize: 300,
      gap: 0,
      justify: "start",
      children: [
        { width: 0, height: 0, flex: 0 },
        { width: 0, height: 0, flex: 1 },
        { width: 0, height: 0, flex: 2 },
      ],
      mainSizes: [60, 60, 60],
    });
    expect(r.sizes[0]).toBe(60);
    // free = 300 - 180 = 120 → 40 to flex=1, 80 to flex=2
    expect(r.sizes[1]).toBeCloseTo(100);
    expect(r.sizes[2]).toBeCloseTo(140);
    expect(r.positions[0]).toBe(0);
    expect(r.positions[1]).toBeCloseTo(60);
    expect(r.positions[2]).toBeCloseTo(160);
  });

  it("ignores justify when flex absorbs space", () => {
    const r = computeFlex({
      containerSize: 200,
      gap: 0,
      justify: "space-between",
      children: [
        { width: 0, height: 0, flex: 1 },
        { width: 0, height: 0, flex: 1 },
      ],
      mainSizes: [10, 10],
    });
    expect(r.positions[0]).toBe(0);
    // sizes 10 + 90 each → second starts at 100
    expect(r.positions[1]).toBeCloseTo(100);
  });
});

describe("alignCross", () => {
  it("centers on the cross axis", () => {
    const a = alignCross(40, 100, "center");
    expect(a.offset).toBe(30);
    expect(a.size).toBe(40);
  });
  it("stretches", () => {
    const a = alignCross(40, 100, "stretch");
    expect(a.size).toBe(100);
    expect(a.offset).toBe(0);
  });
  it("end-aligns", () => {
    const a = alignCross(40, 100, "end");
    expect(a.offset).toBe(60);
  });
});

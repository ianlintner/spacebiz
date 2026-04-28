import { describe, it, expect } from "vitest";
import { computeWrap } from "../wrapMath.ts";

describe("computeWrap", () => {
  it("handles empty input", () => {
    const r = computeWrap({
      containerWidth: 100,
      columnGap: 0,
      rowGap: 0,
      children: [],
    });
    expect(r.positions).toEqual([]);
    expect(r.totalHeight).toBe(0);
    expect(r.rows).toEqual([]);
  });

  it("flows in one row when items fit", () => {
    const r = computeWrap({
      containerWidth: 100,
      columnGap: 5,
      rowGap: 5,
      children: [
        { width: 30, height: 20 },
        { width: 30, height: 20 },
      ],
    });
    expect(r.positions).toEqual([
      { x: 0, y: 0 },
      { x: 35, y: 0 },
    ]);
    expect(r.totalHeight).toBe(20);
    expect(r.rows).toHaveLength(1);
  });

  it("wraps to a new row when overflowing", () => {
    const r = computeWrap({
      containerWidth: 70,
      columnGap: 5,
      rowGap: 4,
      children: [
        { width: 30, height: 20 },
        { width: 30, height: 20 },
        { width: 30, height: 20 },
      ],
    });
    // first row: 0 + 30 + 5 + 30 = 65 (fits). Adding third: 65 + 5 + 30 = 100 > 70.
    expect(r.positions[0]).toEqual({ x: 0, y: 0 });
    expect(r.positions[1]).toEqual({ x: 35, y: 0 });
    expect(r.positions[2]).toEqual({ x: 0, y: 24 });
    expect(r.totalHeight).toBe(44);
    expect(r.rows).toHaveLength(2);
  });

  it("uses tallest item as row height", () => {
    const r = computeWrap({
      containerWidth: 100,
      columnGap: 0,
      rowGap: 0,
      children: [
        { width: 20, height: 10 },
        { width: 20, height: 30 },
        { width: 20, height: 15 },
      ],
    });
    expect(r.totalHeight).toBe(30);
  });

  it("center-aligns rows", () => {
    const r = computeWrap({
      containerWidth: 100,
      columnGap: 0,
      rowGap: 0,
      hAlign: "center",
      children: [{ width: 40, height: 20 }],
    });
    expect(r.positions[0].x).toBe(30);
  });

  it("end-aligns rows", () => {
    const r = computeWrap({
      containerWidth: 100,
      columnGap: 0,
      rowGap: 0,
      hAlign: "end",
      children: [{ width: 40, height: 20 }],
    });
    expect(r.positions[0].x).toBe(60);
  });
});

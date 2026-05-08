import { describe, expect, it } from "vitest";
import { Curve3 } from "../Curve3.ts";

describe("Curve3", () => {
  it("requires at least 2 points", () => {
    expect(() => new Curve3([{ x: 0, y: 0, z: 0 }])).toThrow();
  });

  it("getPointAt(0) returns the first control point", () => {
    const curve = new Curve3([
      { x: 1, y: 2, z: 3 },
      { x: 10, y: 20, z: 30 },
    ]);
    const p = curve.getPointAt(0);
    expect(p).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("getPointAt(1) returns the last control point", () => {
    const curve = new Curve3([
      { x: 1, y: 2, z: 3 },
      { x: 10, y: 20, z: 30 },
    ]);
    const p = curve.getPointAt(1);
    expect(p).toEqual({ x: 10, y: 20, z: 30 });
  });

  it("getPointAt(0.5) on a 2-point segment is the midpoint", () => {
    const curve = new Curve3([
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
    ]);
    const p = curve.getPointAt(0.5);
    expect(p.x).toBeCloseTo(5);
    expect(p.y).toBeCloseTo(0);
    expect(p.z).toBeCloseTo(0);
  });

  it("getPointAt is arc-length parameterized across uneven segments", () => {
    // Segment A: length 1; segment B: length 9. Total = 10.
    // t=0.1 → arc length 1 = end of segment A.
    const curve = new Curve3([
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
    ]);
    const p = curve.getPointAt(0.1);
    expect(p.x).toBeCloseTo(1);
    // t=0.55 → arc length 5.5 = midway through B
    const p2 = curve.getPointAt(0.55);
    expect(p2.x).toBeCloseTo(5.5);
  });

  it("getPointAt clamps out-of-range t", () => {
    const curve = new Curve3([
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
    ]);
    expect(curve.getPointAt(-1).x).toBeCloseTo(0);
    expect(curve.getPointAt(2).x).toBeCloseTo(10);
  });

  it("writes into provided out parameter", () => {
    const curve = new Curve3([
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
    ]);
    const out = { x: -1, y: -1, z: -1 };
    const result = curve.getPointAt(0.5, out);
    expect(result).toBe(out);
    expect(out.x).toBeCloseTo(5);
  });

  it("handles coincident points without NaN", () => {
    const curve = new Curve3([
      { x: 5, y: 5, z: 5 },
      { x: 5, y: 5, z: 5 },
    ]);
    const p = curve.getPointAt(0.5);
    expect(p).toEqual({ x: 5, y: 5, z: 5 });
  });

  it("getLength sums segment lengths", () => {
    const curve = new Curve3([
      { x: 0, y: 0, z: 0 },
      { x: 3, y: 4, z: 0 }, // 5
      { x: 3, y: 4, z: 12 }, // +12
    ]);
    expect(curve.getLength()).toBeCloseTo(17);
  });

  it("defensively copies input control points", () => {
    const points = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
    ];
    const curve = new Curve3(points);
    points[0].x = 999;
    const p = curve.getPointAt(0);
    expect(p.x).toBeCloseTo(0); // still original
  });
});

import type { Vec3 } from "./types.ts";

// Lightweight 3D piecewise-linear curve — replaces THREE.CatmullRomCurve3 for
// route lines and ship animation. The original curves had tension=0 and
// near-collinear control points (typically 2-4 system positions per route),
// so a piecewise-linear approximation is visually equivalent at our zoom
// levels.
//
// Arc-length parameterization: getPointAt(t) interpolates uniformly along
// total path length, so ships move at constant on-screen speed regardless
// of how the control points are spaced. This matches THREE.Curve.getPointAt's
// default behavior (it also normalizes by arc length).

export class Curve3 {
  private readonly points: Vec3[];
  private readonly cumulativeLengths: number[];
  private readonly totalLength: number;

  constructor(points: Vec3[]) {
    if (points.length < 2) {
      throw new Error("Curve3 requires at least 2 control points");
    }
    // Defensive copy so callers can mutate their input safely.
    this.points = points.map((p) => ({ x: p.x, y: p.y, z: p.z }));
    // Cumulative arc length at each control point (cumulativeLengths[0] = 0).
    this.cumulativeLengths = new Array(this.points.length);
    this.cumulativeLengths[0] = 0;
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1];
      const b = this.points[i];
      const seg = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      this.cumulativeLengths[i] = this.cumulativeLengths[i - 1] + seg;
    }
    this.totalLength =
      this.cumulativeLengths[this.cumulativeLengths.length - 1];
  }

  /**
   * Get the world-space point at arc-length-normalized parameter t ∈ [0, 1].
   * Out-of-range t is clamped. Mutates and returns `out` if provided, else
   * allocates a new Vec3.
   */
  getPointAt(t: number, out?: Vec3): Vec3 {
    const target = out ?? { x: 0, y: 0, z: 0 };
    if (this.totalLength === 0) {
      // All control points coincident — degenerate, return point 0.
      target.x = this.points[0].x;
      target.y = this.points[0].y;
      target.z = this.points[0].z;
      return target;
    }
    const tClamped = t < 0 ? 0 : t > 1 ? 1 : t;
    const targetLength = tClamped * this.totalLength;

    // Find the segment containing targetLength via linear scan (curves have
    // 2-4 segments; binary search would be overkill).
    let i = 1;
    while (
      i < this.cumulativeLengths.length - 1 &&
      this.cumulativeLengths[i] < targetLength
    ) {
      i++;
    }
    const segStart = this.cumulativeLengths[i - 1];
    const segEnd = this.cumulativeLengths[i];
    const segLen = segEnd - segStart;
    const localT = segLen === 0 ? 0 : (targetLength - segStart) / segLen;
    const a = this.points[i - 1];
    const b = this.points[i];
    target.x = a.x + (b.x - a.x) * localT;
    target.y = a.y + (b.y - a.y) * localT;
    target.z = a.z + (b.z - a.z) * localT;
    return target;
  }

  /** Total arc length of the curve in world units. */
  getLength(): number {
    return this.totalLength;
  }

  /**
   * Get the underlying control points. Read-only; do not mutate.
   * Useful for rendering the polyline directly.
   */
  getPoints(): readonly Vec3[] {
    return this.points;
  }
}

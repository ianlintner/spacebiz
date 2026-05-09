import type { Polygon } from "../data/types.ts";
import type { SeededRNG } from "../utils/SeededRNG.ts";

export interface SpiralPlacement {
  systemPositions: Array<{ x: number; y: number }>;
  empireAssignments: number[];
  empireCentroids: Array<{ x: number; y: number }>;
  empireTerritories: Polygon[];
}

export function placeSpiralGalaxy(opts: {
  rng: SeededRNG;
  systemCount: number;
  empireCount: number;
  arms?: number;
  armSweep?: number;
  radius?: number;
}): SpiralPlacement {
  const { rng, systemCount, empireCount } = opts;
  const arms = opts.arms ?? 2;
  const armSweep = opts.armSweep ?? 1.8 * Math.PI;
  const radius = opts.radius ?? 1000;

  // 1) Candidate generation along arms — wide swept belts, not thin lines.
  // Each arm centerline is generated, then candidates are scattered into a
  // thick belt around it (perpendicular radial jitter is much larger than
  // the tangent jitter so empires fill 2D regions, not 1D streaks).
  const candidateMultiplier = 2.0;
  const candidates: Array<{ x: number; y: number }> = [];
  const numCandidates = Math.ceil(systemCount * candidateMultiplier);
  for (let i = 0; i < numCandidates; i++) {
    const arm = i % arms;
    const tBase = rng.nextFloat(0, 1);
    const t = Math.pow(tBase, 0.7);
    const armOffset = (2 * Math.PI * arm) / arms;
    const angle = armOffset + t * armSweep;
    const r = radius * (0.05 + 0.95 * t);
    const curl = 0.4;
    const cx = r * Math.cos(angle + curl * Math.log(1 + (r / radius) * 5));
    const cy = r * Math.sin(angle + curl * Math.log(1 + (r / radius) * 5));
    // Perpendicular (radial) jitter — the belt's half-thickness. 18% of
    // radius at the core, up to 32% at the outer rim. Triangular distribution
    // (sum of two uniforms) so most candidates sit closer to the centerline
    // but the tails reach the full belt width — gives a soft Gaussian-like
    // density falloff instead of a hard band.
    const beltHalf = radius * (0.18 + 0.14 * t);
    const radialN = rng.nextFloat(0, 1) + rng.nextFloat(0, 1) - 1; // ~triangular [-1, 1]
    const radialMag = beltHalf * radialN;
    const jx = -Math.sin(angle) * radialMag;
    const jy = Math.cos(angle) * radialMag;
    // Tangential jitter — modest, just enough to break up alignment.
    const tangentMag = radius * 0.08 * (rng.nextFloat(0, 1) * 2 - 1);
    const tx = Math.cos(angle) * tangentMag;
    const ty = Math.sin(angle) * tangentMag;
    candidates.push({ x: cx + jx + tx, y: cy + jy + ty });
  }

  // 2) Poisson-disk cull until we hit systemCount
  const minDist = radius * 0.018;
  const minDist2 = minDist * minDist;
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = rng.nextInt(0, i);
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const kept: Array<{ x: number; y: number }> = [];
  for (const c of candidates) {
    if (kept.length >= systemCount) break;
    let ok = true;
    for (const k of kept) {
      const dx = k.x - c.x;
      const dy = k.y - c.y;
      if (dx * dx + dy * dy < minDist2) {
        ok = false;
        break;
      }
    }
    if (ok) kept.push(c);
  }
  while (kept.length < systemCount) {
    const t = rng.nextFloat(0, 1);
    const arm = rng.nextInt(0, arms - 1);
    const angle = (2 * Math.PI * arm) / arms + t * armSweep;
    const r = radius * (0.1 + 0.9 * t);
    kept.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
  }

  // 3) k-means clustering with k = empireCount
  const centroids: Array<{ x: number; y: number }> = [];
  const stride = Math.max(1, Math.floor(kept.length / empireCount));
  for (let i = 0; i < empireCount; i++)
    centroids.push({ ...kept[(i * stride) % kept.length] });

  const assignments = new Array(kept.length).fill(0);
  for (let iter = 0; iter < 24; iter++) {
    let changed = false;
    for (let i = 0; i < kept.length; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const dx = kept[i].x - centroids[c].x;
        const dy = kept[i].y - centroids[c].y;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (assignments[i] !== best) {
        assignments[i] = best;
        changed = true;
      }
    }
    const sums = centroids.map(() => ({ x: 0, y: 0, n: 0 }));
    for (let i = 0; i < kept.length; i++) {
      const a = assignments[i];
      sums[a].x += kept[i].x;
      sums[a].y += kept[i].y;
      sums[a].n += 1;
    }
    for (let c = 0; c < centroids.length; c++) {
      if (sums[c].n > 0) {
        centroids[c] = { x: sums[c].x / sums[c].n, y: sums[c].y / sums[c].n };
      }
    }
    if (!changed) break;
  }

  rebalanceEmptyEmpires(kept, assignments, centroids);

  // 4) Voronoi territories — clipped to a tight galaxy disc so border cells
  // curve around the rim instead of stretching out into empty space.
  // Then each cell is intersected with a per-empire circle (members' max
  // distance from centroid + small buffer) so the territory hugs the actual
  // star cluster instead of fanning out to the disc bound.
  const rawTerritories = buildBoundedVoronoi(centroids, radius * 0.95);
  const territories: Polygon[] = rawTerritories.map((poly, i) => {
    const members = kept.filter((_, k) => assignments[k] === i);
    if (members.length === 0) return poly;
    let maxDist = 0;
    for (const m of members) {
      const d = Math.hypot(m.x - centroids[i].x, m.y - centroids[i].y);
      if (d > maxDist) maxDist = d;
    }
    const cellRadius = Math.max(radius * 0.08, maxDist + radius * 0.04);
    return { vertices: clipToCircle(poly.vertices, centroids[i], cellRadius) };
  });

  return {
    systemPositions: kept,
    empireAssignments: assignments,
    empireCentroids: centroids,
    empireTerritories: territories,
  };
}

function rebalanceEmptyEmpires(
  points: Array<{ x: number; y: number }>,
  assignments: number[],
  centroids: Array<{ x: number; y: number }>,
): void {
  for (let c = 0; c < centroids.length; c++) {
    if (!assignments.includes(c)) {
      let stealIdx = 0;
      let stealD = -1;
      for (let i = 0; i < points.length; i++) {
        const a = assignments[i];
        const dx = points[i].x - centroids[a].x;
        const dy = points[i].y - centroids[a].y;
        const d = dx * dx + dy * dy;
        if (d > stealD) {
          stealD = d;
          stealIdx = i;
        }
      }
      assignments[stealIdx] = c;
      centroids[c] = { ...points[stealIdx] };
    }
  }
}

function buildBoundedVoronoi(
  sites: Array<{ x: number; y: number }>,
  bound: number,
): Polygon[] {
  // Approximate a disc with a 48-gon so each Voronoi cell that touches the
  // galactic rim follows a curve instead of a hard corner. Rendered as just
  // a colored border, this gives empires "bubble" outlines at the edges.
  const SEGMENTS = 48;
  const disc: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const a = (i / SEGMENTS) * 2 * Math.PI;
    disc.push({ x: Math.cos(a) * bound, y: Math.sin(a) * bound });
  }
  const result: Polygon[] = [];
  for (let i = 0; i < sites.length; i++) {
    let poly = disc.slice();
    for (let j = 0; j < sites.length; j++) {
      if (i === j) continue;
      poly = clipHalfPlane(poly, sites[i], sites[j]);
      if (poly.length === 0) break;
    }
    result.push({ vertices: poly });
  }
  return result;
}

/**
 * Clip a polygon against a circle, approximating the circle with N segments.
 * Each segment becomes a half-plane that we clip against, so the result is
 * a polygon that hugs the circle on whichever sides extend past it.
 */
function clipToCircle(
  vertices: Array<{ x: number; y: number }>,
  center: { x: number; y: number },
  radius: number,
): Array<{ x: number; y: number }> {
  if (vertices.length < 3) return vertices;
  const SEGMENTS = 32;
  let poly = vertices.slice();
  for (let s = 0; s < SEGMENTS; s++) {
    if (poly.length === 0) break;
    const a = (s / SEGMENTS) * 2 * Math.PI;
    // Half-plane along the tangent at angle `a`: inside = circle center,
    // outside = a point 2× radius away in the radial direction. Their
    // midpoint sits exactly on the circle so clipHalfPlane keeps everything
    // inside the radius.
    const outside = {
      x: center.x + Math.cos(a) * radius * 2,
      y: center.y + Math.sin(a) * radius * 2,
    };
    poly = clipHalfPlane(poly, center, outside);
  }
  return poly;
}

function clipHalfPlane(
  poly: Array<{ x: number; y: number }>,
  inside: { x: number; y: number },
  outside: { x: number; y: number },
): Array<{ x: number; y: number }> {
  const mx = (inside.x + outside.x) / 2;
  const my = (inside.y + outside.y) / 2;
  const nx = inside.x - outside.x;
  const ny = inside.y - outside.y;
  const isInside = (p: { x: number; y: number }) =>
    nx * (p.x - mx) + ny * (p.y - my) >= 0;
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ai = isInside(a);
    const bi = isInside(b);
    if (ai) out.push(a);
    if (ai !== bi) {
      const da = nx * (a.x - mx) + ny * (a.y - my);
      const db = nx * (b.x - mx) + ny * (b.y - my);
      const t = da / (da - db);
      out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }
  }
  return out;
}

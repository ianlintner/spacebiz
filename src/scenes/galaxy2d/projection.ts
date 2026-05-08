import type { Mat4 } from "./Camera3D.ts";
import type { ProjectedScreen, ViewportRect, Vec3 } from "./types.ts";

// Pure projection helpers. World → NDC via a column-major view-projection
// matrix (Three.js layout), then NDC → design-space screen pixels via the
// viewport rect.
//
// Matches GalaxyView3D.projectToScreenDesign exactly:
//   sx = viewport.x + (ndc.x * 0.5 + 0.5) * viewport.w
//   sy = viewport.y + (-ndc.y * 0.5 + 0.5) * viewport.h
//   visible = ndc.{x,y,z} all in [-1, 1]

/**
 * Apply a 4×4 column-major matrix to a 3D point with implicit w=1, and
 * perform the perspective divide. Mutates `out` in place; safe when out
 * aliases world. Returns a stable `out` ref so callers can chain.
 */
export function applyMat4(out: Vec3, world: Vec3, m: Mat4): Vec3 {
  const x = world.x;
  const y = world.y;
  const z = world.z;
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  // Guard against w=0 (point on focal plane). Push it to a tiny non-zero so
  // we don't NaN; the caller's visibility check will still reject it.
  const invW = 1 / (w === 0 ? 1e-9 : w);
  out.x = (m[0] * x + m[4] * y + m[8] * z + m[12]) * invW;
  out.y = (m[1] * x + m[5] * y + m[9] * z + m[13]) * invW;
  out.z = (m[2] * x + m[6] * y + m[10] * z + m[14]) * invW;
  return out;
}

/** Project a world point into NDC. Returns `out` for chaining. */
export function projectToNDC(out: Vec3, world: Vec3, viewProj: Mat4): Vec3 {
  return applyMat4(out, world, viewProj);
}

/**
 * Project a world point all the way to design-space screen coords plus a
 * visibility flag (in-frustum). Allocates a small scratch on every call —
 * if you're projecting in a hot loop, prefer `projectToScreenDesignInto`
 * with a reusable scratch Vec3.
 */
export function projectToScreenDesign(
  world: Vec3,
  viewProj: Mat4,
  viewport: ViewportRect,
): ProjectedScreen {
  const ndc: Vec3 = { x: 0, y: 0, z: 0 };
  return projectToScreenDesignInto(ndc, world, viewProj, viewport);
}

/**
 * Same as projectToScreenDesign but reuses a caller-owned scratch Vec3 for
 * the NDC intermediate. Use this in per-frame loops.
 */
export function projectToScreenDesignInto(
  ndcScratch: Vec3,
  world: Vec3,
  viewProj: Mat4,
  viewport: ViewportRect,
): ProjectedScreen {
  applyMat4(ndcScratch, world, viewProj);
  const sx = viewport.x + (ndcScratch.x * 0.5 + 0.5) * viewport.w;
  const sy = viewport.y + (-ndcScratch.y * 0.5 + 0.5) * viewport.h;
  const visible =
    ndcScratch.z > -1 &&
    ndcScratch.z < 1 &&
    ndcScratch.x >= -1 &&
    ndcScratch.x <= 1 &&
    ndcScratch.y >= -1 &&
    ndcScratch.y <= 1;
  return { x: sx, y: sy, depth: ndcScratch.z, visible };
}

/**
 * Perspective scale factor for a billboard sprite at the given world point.
 * Mirrors what THREE.SpriteMaterial.sizeAttenuation = true does internally:
 * size shrinks with distance so closer stars look bigger.
 *
 * Scale = focalLength / (-cameraSpaceZ). Returns 0 (caller should hide) if
 * the point is behind the camera or extremely close.
 *
 * `viewMatrix` is the world→camera matrix (Camera3D.view in our setup —
 * exposed indirectly via getViewProj for now; see Camera3D for the basis).
 */
export function perspectiveScale(
  world: Vec3,
  viewMatrix: Mat4,
  focalLength: number,
): number {
  // Camera-space z component (third row of view matrix · world+1).
  // Column-major: row 2 = m[2], m[6], m[10], m[14]
  const camZ =
    viewMatrix[2] * world.x +
    viewMatrix[6] * world.y +
    viewMatrix[10] * world.z +
    viewMatrix[14];
  // In Three.js's right-handed view space the camera looks down -Z, so
  // points in front have negative camZ. Convert to positive depth.
  const depth = -camZ;
  if (depth <= 0.01) return 0;
  return focalLength / depth;
}

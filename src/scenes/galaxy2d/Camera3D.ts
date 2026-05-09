import type { Vec3 } from "./types.ts";

// Orbit camera value-object — replaces THREE.PerspectiveCamera for the galaxy
// view. The camera always looks at world origin with up=(0,1,0); position is
// derived from yaw/pitch/distance via the same parametrization the original
// applyCameraOrbit() used. Pure TS, no Phaser dependency, fully unit-testable.
//
// Matrix conventions match Three.js (column-major, right-handed) so projection
// output is pixel-identical to GalaxyView3D — see projection.ts for the
// world→NDC pipeline.

export const CAMERA_FOV_Y = (Math.PI * 50) / 180; // 50° vertical, matches PerspectiveCamera(50,...)
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 2000;

export const CAMERA_PITCH_MIN = Math.PI * 0.06;
export const CAMERA_PITCH_MAX = Math.PI * 0.49;
// Full 360° yaw — pan() no longer clamps, allowing complete polar orbit.

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/**
 * 16-element column-major 4×4 matrix. Layout matches THREE.Matrix4.elements:
 *   [ m00, m10, m20, m30,   ← column 0
 *     m01, m11, m21, m31,   ← column 1
 *     m02, m12, m22, m32,   ← column 2
 *     m03, m13, m23, m33 ]  ← column 3
 *
 * Index `e[i + j*4]` = row i, column j.
 */
export type Mat4 = Float64Array;

export function mat4Identity(): Mat4 {
  const m = new Float64Array(16);
  m[0] = 1;
  m[5] = 1;
  m[10] = 1;
  m[15] = 1;
  return m;
}

/** result = a * b. Result and arguments may alias safely (uses scratch). */
function mat4Multiply(out: Mat4, a: Mat4, b: Mat4): Mat4 {
  // Read all 32 inputs into locals first so aliasing (out === a or out === b)
  // works correctly.
  const a00 = a[0],
    a10 = a[1],
    a20 = a[2],
    a30 = a[3];
  const a01 = a[4],
    a11 = a[5],
    a21 = a[6],
    a31 = a[7];
  const a02 = a[8],
    a12 = a[9],
    a22 = a[10],
    a32 = a[11];
  const a03 = a[12],
    a13 = a[13],
    a23 = a[14],
    a33 = a[15];

  const b00 = b[0],
    b10 = b[1],
    b20 = b[2],
    b30 = b[3];
  const b01 = b[4],
    b11 = b[5],
    b21 = b[6],
    b31 = b[7];
  const b02 = b[8],
    b12 = b[9],
    b22 = b[10],
    b32 = b[11];
  const b03 = b[12],
    b13 = b[13],
    b23 = b[14],
    b33 = b[15];

  out[0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
  out[1] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
  out[2] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
  out[3] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;

  out[4] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
  out[5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
  out[6] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
  out[7] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;

  out[8] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
  out[9] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
  out[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
  out[11] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;

  out[12] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
  out[13] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
  out[14] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
  out[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;
  return out;
}

/**
 * Build a Three.js-compatible symmetric perspective matrix.
 * Matches THREE.Matrix4.makePerspective with right=−left, top=−bottom.
 */
function makePerspective(
  out: Mat4,
  fovY: number,
  aspect: number,
  near: number,
  far: number,
): Mat4 {
  const f = 1 / Math.tan(fovY / 2);
  out[0] = f / aspect;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = f;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = -(far + near) / (far - near);
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = -(2 * far * near) / (far - near);
  out[15] = 0;
  return out;
}

/**
 * Build the inverse of a lookAt matrix where eye=position, target=(0,0,0),
 * up=(0,1,0). This is the world→view matrix (i.e. matrixWorldInverse).
 *
 * Three.js's lookAt convention: z = normalize(eye - target), x = normalize(up × z),
 * y = z × x. The world→view matrix is the transpose of the rotation block
 * with -dot(basis, eye) in the translation column.
 */
function makeViewMatrixLookAt(
  out: Mat4,
  eye: Vec3,
  targetX: number,
  targetY: number,
  targetZ: number,
): Mat4 {
  // z = normalize(eye - target)
  let zx = eye.x - targetX,
    zy = eye.y - targetY,
    zz = eye.z - targetZ;
  const zLen = Math.hypot(zx, zy, zz);
  if (zLen < 1e-9) {
    // Degenerate: eye at origin. Identity-ish view; caller shouldn't hit this.
    out.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    return out;
  }
  zx /= zLen;
  zy /= zLen;
  zz /= zLen;

  // x = normalize(up × z) where up = (0, 1, 0)
  // up × z = (1*zz - 0*zy, 0*zx - 0*zz, 0*zy - 1*zx) = (zz, 0, -zx)
  let xx = zz,
    xy = 0,
    xz = -zx;
  const xLen = Math.hypot(xx, xy, xz);
  if (xLen < 1e-9) {
    // Looking straight down/up — pick an arbitrary x basis.
    xx = 1;
    xy = 0;
    xz = 0;
  } else {
    xx /= xLen;
    xy /= xLen;
    xz /= xLen;
  }

  // y = z × x
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;

  // World→view matrix: rows are [x, y, z]; translation = -basis · eye
  const tx = -(xx * eye.x + xy * eye.y + xz * eye.z);
  const ty = -(yx * eye.x + yy * eye.y + yz * eye.z);
  const tz = -(zx * eye.x + zy * eye.y + zz * eye.z);

  // Column-major storage:
  out[0] = xx;
  out[1] = yx;
  out[2] = zx;
  out[3] = 0;

  out[4] = xy;
  out[5] = yy;
  out[6] = zy;
  out[7] = 0;

  out[8] = xz;
  out[9] = yz;
  out[10] = zz;
  out[11] = 0;

  out[12] = tx;
  out[13] = ty;
  out[14] = tz;
  out[15] = 1;
  return out;
}

export class Camera3D {
  yaw = 0;
  pitch = Math.PI * 0.3;
  distance = 120;
  aspect = 1;

  /** World-space target the camera orbits around. Translates with WASD. */
  targetX = 0;
  targetZ = 0;

  private readonly view: Mat4 = mat4Identity();
  private readonly proj: Mat4 = mat4Identity();
  private readonly viewProj: Mat4 = mat4Identity();
  private readonly position: Vec3 = { x: 0, y: 0, z: 0 };
  // Camera basis vectors after recompute() — used for screen-aligned translation.
  private readonly rightBasis: Vec3 = { x: 1, y: 0, z: 0 };
  private readonly forwardBasisXZ: Vec3 = { x: 0, y: 0, z: -1 };

  /**
   * Recompute view, projection, and combined view-projection matrices from
   * the current yaw/pitch/distance/aspect. Cheap (~12 trig + one 4×4 mul);
   * call after any orbit change.
   */
  recompute(): void {
    const r = this.distance;
    const sinP = Math.sin(this.pitch);
    const cosP = Math.cos(this.pitch);
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    // Position = orbit offset + target, so the camera orbits around the
    // current target rather than the world origin.
    const orbitX = sinY * sinP * r;
    const orbitY = cosP * r;
    const orbitZ = cosY * sinP * r;
    this.position.x = orbitX + this.targetX;
    this.position.y = orbitY;
    this.position.z = orbitZ + this.targetZ;

    makeViewMatrixLookAt(
      this.view,
      this.position,
      this.targetX,
      0,
      this.targetZ,
    );
    // Cache screen-aligned basis vectors in the world XZ plane for translate().
    // Right = up × z (with up = (0,1,0)), z = normalize(eye - target) = normalize(orbit).
    const oLen = Math.hypot(orbitX, orbitY, orbitZ) || 1;
    const zx = orbitX / oLen;
    const zz = orbitZ / oLen;
    // x basis = (zz, 0, -zx) — purely in XZ plane.
    let rx = zz;
    let rz = -zx;
    const rLen = Math.hypot(rx, rz) || 1;
    rx /= rLen;
    rz /= rLen;
    this.rightBasis.x = rx;
    this.rightBasis.z = rz;
    // Forward (into screen) on the disc plane = -projection of z onto XZ.
    let fx = -zx;
    let fz = -zz;
    const fLen = Math.hypot(fx, fz) || 1;
    fx /= fLen;
    fz /= fLen;
    this.forwardBasisXZ.x = fx;
    this.forwardBasisXZ.z = fz;

    makePerspective(
      this.proj,
      CAMERA_FOV_Y,
      this.aspect,
      CAMERA_NEAR,
      CAMERA_FAR,
    );
    mat4Multiply(this.viewProj, this.proj, this.view);
  }

  /** Translate the orbit target in world XZ. dx/dy are in screen-aligned units:
   *  +dx moves view to the right, +dy moves view up. */
  translate(dx: number, dy: number): void {
    this.targetX += this.rightBasis.x * dx + this.forwardBasisXZ.x * dy;
    this.targetZ += this.rightBasis.z * dx + this.forwardBasisXZ.z * dy;
  }

  getViewProj(): Mat4 {
    return this.viewProj;
  }

  /** World→camera-space matrix. Used by perspectiveScale() in projection.ts. */
  getView(): Mat4 {
    return this.view;
  }

  getPosition(): Vec3 {
    return this.position;
  }

  /** Apply user pan/orbit input (drag delta in design pixels). Yaw is unrestricted
   *  so the camera can rotate fully around the galaxy (polar orbit). */
  pan(dxScreen: number, dyScreen: number): void {
    const yawDelta = (-dxScreen / 320) * Math.PI;
    const pitchDelta = (-dyScreen / 320) * Math.PI;
    this.yaw += yawDelta; // unbounded — sin/cos handle any value
    this.pitch = clamp(
      this.pitch + pitchDelta,
      CAMERA_PITCH_MIN,
      CAMERA_PITCH_MAX,
    );
  }

  /** Apply user wheel input. Caller is responsible for distance bounds. */
  zoom(delta: number, distMin: number, distMax: number): void {
    this.distance = clamp(this.distance + delta, distMin, distMax);
  }

  /**
   * Aim the camera at a world-space point. Yaw is allowed full ±π for
   * programmatic focus; pitch resets to the comfortable default.
   * Distance is set by the caller after this returns (depends on halfExtent).
   */
  focusOnWorldPoint(pos: Vec3): void {
    this.yaw = Math.max(-Math.PI, Math.min(Math.PI, Math.atan2(pos.x, pos.z)));
    this.pitch = Math.PI * 0.32;
  }

  /** Reset to the default framing (yaw=0, pitch=0.3π). Caller sets distance. */
  resetOrbit(): void {
    this.yaw = 0;
    this.pitch = Math.PI * 0.3;
  }
}

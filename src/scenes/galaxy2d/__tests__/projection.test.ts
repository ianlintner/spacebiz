import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Camera3D } from "../Camera3D.ts";
import {
  projectToScreenDesign,
  projectToScreenDesignInto,
} from "../projection.ts";
import type { ViewportRect, Vec3 } from "../types.ts";

// These tests are the contract that protects the migration: for any given
// camera state, world point, and viewport, the new projection pipeline must
// produce the same design-space screen coords (within sub-pixel float drift)
// that Three.js produces today via vec.project(camera). If this test breaks,
// star hitboxes, revenue popups, and empire-info-card anchors all shift.

interface Oracle {
  project(
    world: Vec3,
    viewport: ViewportRect,
  ): {
    x: number;
    y: number;
    depth: number;
    visible: boolean;
  };
}

/** Build a Three.js perspective camera matching our Camera3D config. */
function buildThreeOracle(
  yaw: number,
  pitch: number,
  distance: number,
  aspect: number,
): Oracle {
  const cam = new THREE.PerspectiveCamera(50, aspect, 0.1, 2000);
  const r = distance;
  cam.position.set(
    Math.sin(yaw) * Math.sin(pitch) * r,
    Math.cos(pitch) * r,
    Math.cos(yaw) * Math.sin(pitch) * r,
  );
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  return {
    project(world, viewport) {
      const v = new THREE.Vector3(world.x, world.y, world.z);
      v.project(cam);
      const sx = viewport.x + (v.x * 0.5 + 0.5) * viewport.w;
      const sy = viewport.y + (-v.y * 0.5 + 0.5) * viewport.h;
      const visible =
        v.z > -1 && v.z < 1 && v.x >= -1 && v.x <= 1 && v.y >= -1 && v.y <= 1;
      return { x: sx, y: sy, depth: v.z, visible };
    },
  };
}

function buildCamera3D(
  yaw: number,
  pitch: number,
  distance: number,
  aspect: number,
): Camera3D {
  const c = new Camera3D();
  c.yaw = yaw;
  c.pitch = pitch;
  c.distance = distance;
  c.aspect = aspect;
  c.recompute();
  return c;
}

describe("projectToScreenDesign — Three.js parity", () => {
  const viewport: ViewportRect = { x: 200, y: 60, w: 1080, h: 600 };

  // Pixel-tolerant equality; matrix products on different paths can drift
  // by ~1e-6 in NDC, which is ≪ 0.01 pixels at 1080×600 viewport.
  const PX = 0.01;
  const DEPTH = 1e-5;

  function assertMatch(
    world: Vec3,
    yaw: number,
    pitch: number,
    distance: number,
  ) {
    const aspect = viewport.w / viewport.h;
    const ours = buildCamera3D(yaw, pitch, distance, aspect);
    const oracle = buildThreeOracle(yaw, pitch, distance, aspect);
    const a = projectToScreenDesign(world, ours.getViewProj(), viewport);
    const b = oracle.project(world, viewport);
    expect(a.visible).toBe(b.visible);
    expect(Math.abs(a.x - b.x)).toBeLessThan(PX);
    expect(Math.abs(a.y - b.y)).toBeLessThan(PX);
    expect(Math.abs(a.depth - b.depth)).toBeLessThan(DEPTH);
  }

  it("origin point with default camera (yaw=0, pitch=0.3π, distance=120)", () => {
    assertMatch({ x: 0, y: 0, z: 0 }, 0, Math.PI * 0.3, 120);
  });

  it("offset point with default camera", () => {
    assertMatch({ x: 30, y: 5, z: -20 }, 0, Math.PI * 0.3, 120);
  });

  it("with non-zero yaw", () => {
    assertMatch({ x: 30, y: 5, z: -20 }, Math.PI * 0.25, Math.PI * 0.3, 120);
  });

  it("at high pitch (looking more straight down)", () => {
    assertMatch({ x: 30, y: 5, z: -20 }, 0, Math.PI * 0.45, 120);
  });

  it("at low pitch (looking more horizontally)", () => {
    assertMatch({ x: 30, y: 5, z: -20 }, 0, Math.PI * 0.2, 120);
  });

  it("at far zoom distance", () => {
    assertMatch({ x: 30, y: 5, z: -20 }, 0, Math.PI * 0.3, 220);
  });

  it("at close zoom distance", () => {
    assertMatch({ x: 30, y: 5, z: -20 }, 0, Math.PI * 0.3, 50);
  });

  it("point behind the camera (depth > 1) is not visible", () => {
    // Place point at (0, distance + 100, 0) — behind the camera which is
    // looking down at origin from (0, distance, 0).
    const aspect = viewport.w / viewport.h;
    const cam = buildCamera3D(0, Math.PI * 0.3, 120, aspect);
    const result = projectToScreenDesign(
      { x: 0, y: 1000, z: 0 },
      cam.getViewProj(),
      viewport,
    );
    expect(result.visible).toBe(false);
  });

  it("matches at every corner of a 60-unit box (sample of 27 points)", () => {
    const yaw = Math.PI * 0.15;
    const pitch = Math.PI * 0.32;
    const distance = 140;
    for (const px of [-30, 0, 30]) {
      for (const py of [-30, 0, 30]) {
        for (const pz of [-30, 0, 30]) {
          assertMatch({ x: px, y: py, z: pz }, yaw, pitch, distance);
        }
      }
    }
  });

  it("scratch-Vec3 projection produces identical output to allocating version", () => {
    const aspect = viewport.w / viewport.h;
    const cam = buildCamera3D(0.1, 0.5, 90, aspect);
    const world = { x: 12, y: -8, z: 33 };
    const a = projectToScreenDesign(world, cam.getViewProj(), viewport);
    const scratch = { x: 0, y: 0, z: 0 };
    const b = projectToScreenDesignInto(
      scratch,
      world,
      cam.getViewProj(),
      viewport,
    );
    expect(a).toEqual(b);
  });
});

describe("projectToScreenDesign — viewport math", () => {
  it("origin NDC maps to viewport center", () => {
    // Manually construct a state where NDC=(0,0,0): looking at origin from
    // distance 120 with pitch=0.3π, the origin is in front of camera. Its
    // NDC is exactly (0, 0, depth) since lookAt(0,0,0) → world origin sits
    // on the camera's view ray.
    const viewport: ViewportRect = { x: 100, y: 50, w: 800, h: 600 };
    const cam = buildCamera3D(0, Math.PI * 0.3, 120, viewport.w / viewport.h);
    const result = projectToScreenDesign(
      { x: 0, y: 0, z: 0 },
      cam.getViewProj(),
      viewport,
    );
    // x should be at viewport center (100 + 800/2 = 500)
    expect(result.x).toBeCloseTo(500, 1);
    // y should be at viewport center (50 + 600/2 = 350)
    expect(result.y).toBeCloseTo(350, 1);
  });
});

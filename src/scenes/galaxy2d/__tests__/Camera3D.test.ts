import { describe, expect, it } from "vitest";
import {
  Camera3D,
  CAMERA_PITCH_MAX,
  CAMERA_PITCH_MIN,
  CAMERA_YAW_RANGE,
} from "../Camera3D.ts";

describe("Camera3D", () => {
  it("default position is along +Z axis at distance 120 with default pitch", () => {
    const c = new Camera3D();
    c.aspect = 1;
    c.recompute();
    const p = c.getPosition();
    // yaw=0, pitch=0.3π, distance=120
    // x = sin(0)*sin(0.3π)*120 = 0
    // y = cos(0.3π)*120
    // z = cos(0)*sin(0.3π)*120
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(Math.cos(Math.PI * 0.3) * 120);
    expect(p.z).toBeCloseTo(Math.sin(Math.PI * 0.3) * 120);
  });

  it("pan clamps yaw to ±YAW_RANGE", () => {
    const c = new Camera3D();
    c.pan(-100000, 0); // huge positive yaw delta (dx negative → yaw +)
    expect(c.yaw).toBeCloseTo(CAMERA_YAW_RANGE);
    c.pan(100000, 0); // huge negative yaw delta — overshoot
    expect(c.yaw).toBeCloseTo(-CAMERA_YAW_RANGE);
  });

  it("pan clamps pitch to PITCH_MIN..PITCH_MAX", () => {
    const c = new Camera3D();
    c.pan(0, 100000); // huge dy → pitch -
    expect(c.pitch).toBeCloseTo(CAMERA_PITCH_MIN);
    c.pan(0, -100000); // huge -dy → pitch +
    expect(c.pitch).toBeCloseTo(CAMERA_PITCH_MAX);
  });

  it("zoom clamps to caller-provided distance bounds", () => {
    const c = new Camera3D();
    c.zoom(-100000, 50, 220);
    expect(c.distance).toBe(50);
    c.zoom(100000, 50, 220);
    expect(c.distance).toBe(220);
  });

  it("focusOnWorldPoint sets yaw to atan2(x, z) and pitch to 0.32π", () => {
    const c = new Camera3D();
    c.focusOnWorldPoint({ x: 10, y: 0, z: 10 });
    // atan2(10, 10) = π/4
    expect(c.yaw).toBeCloseTo(Math.PI / 4);
    expect(c.pitch).toBeCloseTo(Math.PI * 0.32);
  });

  it("focusOnWorldPoint allows yaw beyond the user's pan range", () => {
    const c = new Camera3D();
    c.focusOnWorldPoint({ x: -1, y: 0, z: -1 });
    // atan2(-1, -1) = -3π/4 — outside ±π/2 user pan range, should still be set
    expect(c.yaw).toBeCloseTo(-Math.PI * 0.75);
  });

  it("recompute is deterministic — same state produces same matrix", () => {
    const c1 = new Camera3D();
    c1.yaw = 0.2;
    c1.pitch = Math.PI * 0.32;
    c1.distance = 100;
    c1.aspect = 1.5;
    c1.recompute();
    const m1 = Array.from(c1.getViewProj());

    const c2 = new Camera3D();
    c2.yaw = 0.2;
    c2.pitch = Math.PI * 0.32;
    c2.distance = 100;
    c2.aspect = 1.5;
    c2.recompute();
    const m2 = Array.from(c2.getViewProj());

    for (let i = 0; i < 16; i++) {
      expect(m1[i]).toBeCloseTo(m2[i]);
    }
  });

  it("resetOrbit restores defaults but leaves distance untouched", () => {
    const c = new Camera3D();
    c.yaw = 1;
    c.pitch = Math.PI * 0.45;
    c.distance = 200;
    c.resetOrbit();
    expect(c.yaw).toBe(0);
    expect(c.pitch).toBeCloseTo(Math.PI * 0.3);
    expect(c.distance).toBe(200); // caller manages distance
  });
});

import { describe, expect, it } from "vitest";
import {
  getOrbitalParams,
  planetPositionAtTurn,
  radiansPerQuarter,
} from "../OrbitalMechanics.ts";
import type { Planet } from "../../../data/types.ts";

function makePlanet(overrides: Partial<Planet> = {}): Planet {
  return {
    id: "p-test",
    name: "Test",
    systemId: "s-test",
    type: "terran",
    x: 0,
    y: 0,
    population: 1000,
    orbitRadius: 10,
    orbitPeriodQuarters: 4,
    orbitPhase: 0,
    orbitInclination: 0,
    ...overrides,
  };
}

describe("OrbitalMechanics", () => {
  describe("getOrbitalParams", () => {
    it("returns explicit orbital fields when present", () => {
      const params = getOrbitalParams(
        makePlanet({
          orbitRadius: 7,
          orbitPeriodQuarters: 8,
          orbitPhase: 1,
          orbitInclination: 0.1,
        }),
      );
      expect(params.orbitRadius).toBe(7);
      expect(params.orbitPeriodQuarters).toBe(8);
      expect(params.orbitPhase).toBe(1);
      expect(params.orbitInclination).toBe(0.1);
    });

    it("falls back to deterministic defaults when fields are missing", () => {
      const planet = makePlanet({
        orbitRadius: undefined,
        orbitPeriodQuarters: undefined,
        orbitPhase: undefined,
        orbitInclination: undefined,
      });
      const params1 = getOrbitalParams(planet);
      const params2 = getOrbitalParams(planet);
      expect(params1).toEqual(params2);
      expect(params1.orbitRadius).toBeGreaterThan(0);
      expect(params1.orbitPeriodQuarters).toBeGreaterThan(0);
    });
  });

  describe("planetPositionAtTurn", () => {
    it("places planet on +x axis when phase=0, turn=0", () => {
      const pos = planetPositionAtTurn(
        makePlanet({ orbitRadius: 10, orbitPhase: 0, orbitInclination: 0 }),
        0,
      );
      expect(pos.x).toBeCloseTo(10);
      expect(pos.z).toBeCloseTo(0);
      expect(pos.y).toBeCloseTo(0);
    });

    it("rotates by 90 degrees per turn when period=4", () => {
      const planet = makePlanet({
        orbitRadius: 10,
        orbitPhase: 0,
        orbitPeriodQuarters: 4,
        orbitInclination: 0,
      });
      const pos1 = planetPositionAtTurn(planet, 1);
      // After 1 quarter at period=4, planet rotated 90 deg → on +z axis
      expect(pos1.x).toBeCloseTo(0);
      expect(pos1.z).toBeCloseTo(10);
    });

    it("returns to start after one full period", () => {
      const planet = makePlanet({
        orbitRadius: 10,
        orbitPhase: 0,
        orbitPeriodQuarters: 8,
        orbitInclination: 0,
      });
      const pos0 = planetPositionAtTurn(planet, 0);
      const pos8 = planetPositionAtTurn(planet, 8);
      expect(pos8.x).toBeCloseTo(pos0.x);
      expect(pos8.z).toBeCloseTo(pos0.z);
    });

    it("inclination tilts the orbit off the ecliptic", () => {
      const planet = makePlanet({
        orbitRadius: 10,
        orbitPhase: Math.PI / 2,
        orbitInclination: 0.3,
        orbitPeriodQuarters: 4,
      });
      const pos = planetPositionAtTurn(planet, 0);
      expect(Math.abs(pos.y)).toBeGreaterThan(0);
    });

    it("inner planets (short period) move further per turn than outer", () => {
      const inner = makePlanet({
        id: "inner",
        orbitRadius: 5,
        orbitPeriodQuarters: 4,
        orbitPhase: 0,
        orbitInclination: 0,
      });
      const outer = makePlanet({
        id: "outer",
        orbitRadius: 5,
        orbitPeriodQuarters: 16,
        orbitPhase: 0,
        orbitInclination: 0,
      });
      const innerDelta = angularDelta(
        planetPositionAtTurn(inner, 0),
        planetPositionAtTurn(inner, 1),
      );
      const outerDelta = angularDelta(
        planetPositionAtTurn(outer, 0),
        planetPositionAtTurn(outer, 1),
      );
      expect(innerDelta).toBeGreaterThan(outerDelta);
    });
  });

  describe("radiansPerQuarter", () => {
    it("returns 2π / period", () => {
      expect(
        radiansPerQuarter(makePlanet({ orbitPeriodQuarters: 4 })),
      ).toBeCloseTo(Math.PI / 2);
      expect(
        radiansPerQuarter(makePlanet({ orbitPeriodQuarters: 8 })),
      ).toBeCloseTo(Math.PI / 4);
    });
  });
});

function angularDelta(
  a: { x: number; z: number },
  b: { x: number; z: number },
): number {
  const angleA = Math.atan2(a.z, a.x);
  const angleB = Math.atan2(b.z, b.x);
  // Normalise the difference into (-π, π] before taking |·| so a sweep
  // crossing the ±π boundary doesn't silently report ~2π−smallAngle.
  const raw = angleB - angleA;
  const normalised = ((raw + Math.PI) % (Math.PI * 2)) - Math.PI;
  return Math.abs(normalised);
}

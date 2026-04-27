import type { Planet } from "../../data/types.ts";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface OrbitalParams {
  orbitRadius: number;
  orbitPeriodQuarters: number;
  orbitPhase: number;
  orbitInclination: number;
}

/**
 * Returns guaranteed orbital params for a planet, applying defaults to any
 * missing fields. Default radius/period are derived from the planet id hash
 * so a planet without explicit orbital data still gets stable, distinct
 * values across reloads (used as a safety net for legacy save files).
 */
export function getOrbitalParams(planet: Planet): OrbitalParams {
  const seed = hashString(planet.id);
  return {
    orbitRadius: planet.orbitRadius ?? 4 + (seed % 12),
    orbitPeriodQuarters: planet.orbitPeriodQuarters ?? 4 + ((seed >> 3) % 12),
    orbitPhase: planet.orbitPhase ?? ((seed % 1000) / 1000) * Math.PI * 2,
    orbitInclination:
      planet.orbitInclination ?? (((seed >> 5) % 100) / 100 - 0.5) * 0.3,
  };
}

/**
 * Compute a planet's 3D position at a given turn (one quarter per turn).
 * Pure function — no Phaser, no Three.js. Y is the up axis (small inclination
 * tilt off the X/Z ecliptic plane).
 */
export function planetPositionAtTurn(planet: Planet, turn: number): Vec3 {
  const o = getOrbitalParams(planet);
  const angle = o.orbitPhase + (turn / o.orbitPeriodQuarters) * Math.PI * 2;
  const x = Math.cos(angle) * o.orbitRadius;
  const z = Math.sin(angle) * o.orbitRadius;
  const y = Math.sin(angle) * o.orbitRadius * Math.sin(o.orbitInclination);
  return { x, y, z };
}

/**
 * How many radians a planet rotates each quarter (turn). Used by the renderer
 * to draw orbital indicators or label motion direction.
 */
export function radiansPerQuarter(planet: Planet): number {
  const o = getOrbitalParams(planet);
  return (Math.PI * 2) / o.orbitPeriodQuarters;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

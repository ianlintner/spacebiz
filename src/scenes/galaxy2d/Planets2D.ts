import * as Phaser from "phaser";
import type { Planet } from "../../data/types.ts";
import { getOrbitalParams } from "../../game/system/OrbitalMechanics.ts";
import type { Mat4 } from "./Camera3D.ts";
import {
  perspectiveScale,
  projectToScreenDesignInto,
  softCapSize,
} from "./projection.ts";
import type { Vec3, ViewportRect } from "./types.ts";

// Depth ordering inside the galaxy container:
//   orbit rings  760  (above hyperlanes 300, below planets)
//   planets      820  (above orbit rings, below star sprites at 800-810?)
//   hitboxes     870  (above planets so hit-test wins)
const ORBIT_DEPTH = 760;
const PLANET_DEPTH = 820;
const HITBOX_DEPTH = 870;

// Planet size in world units (radius). Orbits are 1.0–3.0 world units, so 0.22
// keeps planets visually distinct from the star without crowding inner orbits.
const PLANET_WORLD_RADIUS = 0.22;
// Soft cap on rendered planet size in pixels — matches STAR_DISPLAY_SOFT_CAP_PX
// proportionally so the star:planet visual ratio stays consistent across zoom.
const PLANET_DISPLAY_SOFT_CAP_PX = 60;
const ORBIT_LINE_ALPHA = 0.18;

interface PlanetEntry {
  planet: Planet;
  sprite: Phaser.GameObjects.Image;
  hitbox: Phaser.GameObjects.Zone;
}

/**
 * Renders planets orbiting the currently-focused system. Only the focused
 * system's planets are computed/drawn each frame — everything else is hidden.
 * The renderer is dormant when no system is focused (galaxy view mode).
 */
export class Planets2D {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly entries = new Map<string, PlanetEntry>();
  private orbitGfx: Phaser.GameObjects.Graphics | null = null;
  private focusedSystemId: string | null = null;
  private systemPositions = new Map<string, Vec3>();
  private hoverHandler: ((planetId: string | null) => void) | null = null;
  private clickHandler: ((planetId: string) => void) | null = null;

  // Scratch vectors reused across the per-frame projection loop.
  private readonly scratchWorld: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly scratchNdc: Vec3 = { x: 0, y: 0, z: 0 };

  // World-space positions of each focused planet, refreshed every frame.
  // Other sub-modules (e.g. Traffic2D) read this to aim at orbiting planets.
  private readonly focusedPlanetWorldPositions = new Map<string, Vec3>();

  constructor(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.container = container;
    this.orbitGfx = this.scene.add.graphics();
    this.orbitGfx.setDepth(ORBIT_DEPTH);
    this.container.add(this.orbitGfx);
  }

  /**
   * Replace the planet set. Call when the galaxy is (re)built or when planets
   * change ownership / are added. Builds sprite + hitbox per planet up front;
   * the per-frame loop only updates positions of currently-focused planets.
   */
  setPlanets(planets: Planet[], systemPositions: Map<string, Vec3>): void {
    // Tear down old entries.
    for (const e of this.entries.values()) {
      e.sprite.destroy();
      e.hitbox.destroy();
    }
    this.entries.clear();
    this.systemPositions = systemPositions;

    for (const planet of planets) {
      const color = colorForPlanet(planet);
      const texKey = getOrCreatePlanetTexture(this.scene, color);
      const sprite = this.scene.add.image(0, 0, texKey);
      sprite.setDepth(PLANET_DEPTH);
      sprite.setVisible(false);
      this.container.add(sprite);

      const hitbox = this.scene.add.zone(0, 0, 24, 24);
      hitbox.setInteractive({ useHandCursor: true });
      hitbox.setDepth(HITBOX_DEPTH);
      hitbox.setVisible(false);
      hitbox.on("pointerover", () => this.hoverHandler?.(planet.id));
      hitbox.on("pointerout", () => this.hoverHandler?.(null));
      hitbox.on("pointerup", () => this.clickHandler?.(planet.id));

      this.entries.set(planet.id, { planet, sprite, hitbox });
    }
  }

  setFocusedSystem(systemId: string | null): void {
    if (this.focusedSystemId === systemId) return;
    this.focusedSystemId = systemId;
    if (!systemId) {
      // Leaving system view — hide everything and clear orbit rings.
      for (const e of this.entries.values()) {
        e.sprite.setVisible(false);
        e.hitbox.setVisible(false);
      }
      this.orbitGfx?.clear();
    }
  }

  getFocusedSystem(): string | null {
    return this.focusedSystemId;
  }

  /**
   * World-space positions of each planet currently in the focused system.
   * Repopulated every frame by `update()`. Empty when no system is focused.
   */
  getFocusedPlanetWorldPositions(): ReadonlyMap<string, Vec3> {
    return this.focusedPlanetWorldPositions;
  }

  setHoverHandler(handler: ((planetId: string | null) => void) | null): void {
    this.hoverHandler = handler;
  }

  setClickHandler(handler: ((planetId: string) => void) | null): void {
    this.clickHandler = handler;
  }

  /**
   * Per-frame update. `realtimeSeconds` drives slow visual orbital drift on
   * top of the turn-locked position so planets look alive even between turns.
   */
  update(
    turn: number,
    realtimeSeconds: number,
    viewProj: Mat4,
    viewMat: Mat4,
    focalLength: number,
    viewport: ViewportRect,
  ): void {
    if (this.orbitGfx) this.orbitGfx.clear();
    this.focusedPlanetWorldPositions.clear();

    if (!this.focusedSystemId) return;
    const systemPos = this.systemPositions.get(this.focusedSystemId);
    if (!systemPos) return;

    // Subtle real-time phase drift — ~one full rotation per 90 seconds of
    // wall-clock, scaled by per-planet period so faster orbits drift faster.
    const driftBase = (realtimeSeconds / 90) * Math.PI * 2;

    for (const e of this.entries.values()) {
      if (e.planet.systemId !== this.focusedSystemId) {
        e.sprite.setVisible(false);
        e.hitbox.setVisible(false);
        continue;
      }
      const o = getOrbitalParams(e.planet);
      const angle =
        o.orbitPhase +
        (turn / o.orbitPeriodQuarters) * Math.PI * 2 +
        driftBase / o.orbitPeriodQuarters;

      this.scratchWorld.x = systemPos.x + Math.cos(angle) * o.orbitRadius;
      this.scratchWorld.z = systemPos.z + Math.sin(angle) * o.orbitRadius;
      this.scratchWorld.y =
        systemPos.y +
        Math.sin(angle) * o.orbitRadius * Math.sin(o.orbitInclination);

      this.focusedPlanetWorldPositions.set(e.planet.id, {
        x: this.scratchWorld.x,
        y: this.scratchWorld.y,
        z: this.scratchWorld.z,
      });

      const proj = projectToScreenDesignInto(
        this.scratchNdc,
        this.scratchWorld,
        viewProj,
        viewport,
      );
      if (!proj.visible) {
        e.sprite.setVisible(false);
        e.hitbox.setVisible(false);
        continue;
      }
      const scale = perspectiveScale(this.scratchWorld, viewMat, focalLength);
      if (scale <= 0) {
        e.sprite.setVisible(false);
        e.hitbox.setVisible(false);
        continue;
      }
      const desired = PLANET_WORLD_RADIUS * 2 * scale;
      const size = Math.max(
        8,
        softCapSize(desired, PLANET_DISPLAY_SOFT_CAP_PX),
      );
      e.sprite.setPosition(proj.x, proj.y);
      e.sprite.setDisplaySize(size, size);
      e.sprite.setVisible(true);

      e.hitbox.setPosition(proj.x, proj.y);
      e.hitbox.setSize(size + 16, size + 16);
      e.hitbox.setVisible(true);
    }

    // Draw orbit rings for the focused system. Project 64 points around each
    // orbit and connect with line segments so the ring follows the camera's
    // perspective tilt naturally.
    if (this.orbitGfx) {
      const focusedPlanets: Planet[] = [];
      for (const e of this.entries.values()) {
        if (e.planet.systemId === this.focusedSystemId)
          focusedPlanets.push(e.planet);
      }
      this.orbitGfx.lineStyle(1, 0xffffff, ORBIT_LINE_ALPHA);
      for (const planet of focusedPlanets) {
        const o = getOrbitalParams(planet);
        const SEGS = 64;
        let prevX = 0;
        let prevY = 0;
        let prevVisible = false;
        for (let i = 0; i <= SEGS; i++) {
          const a = (i / SEGS) * Math.PI * 2;
          this.scratchWorld.x = systemPos.x + Math.cos(a) * o.orbitRadius;
          this.scratchWorld.z = systemPos.z + Math.sin(a) * o.orbitRadius;
          this.scratchWorld.y =
            systemPos.y +
            Math.sin(a) * o.orbitRadius * Math.sin(o.orbitInclination);
          const proj = projectToScreenDesignInto(
            this.scratchNdc,
            this.scratchWorld,
            viewProj,
            viewport,
          );
          if (i > 0 && prevVisible && proj.visible) {
            this.orbitGfx.lineBetween(prevX, prevY, proj.x, proj.y);
          }
          prevX = proj.x;
          prevY = proj.y;
          prevVisible = proj.visible;
        }
      }
    }
  }

  destroy(): void {
    for (const e of this.entries.values()) {
      e.sprite.destroy();
      e.hitbox.destroy();
    }
    this.entries.clear();
    this.orbitGfx?.destroy();
    this.orbitGfx = null;
  }
}

// ---------------------------------------------------------------------------
// Planet color palette by type/biome
// ---------------------------------------------------------------------------

function colorForPlanet(planet: Planet): number {
  switch (planet.type) {
    case "agricultural":
      return 0x76b450; // verdant green
    case "mining":
      return 0x9a6840; // rusty ore
    case "techWorld":
      return 0x9080d0; // violet
    case "manufacturing":
      return 0xb88860; // industrial tan
    case "luxuryWorld":
      return 0xd4a85a; // gilded warm
    case "coreWorld":
      return 0x6ab0d8; // bright cyan-blue
    case "frontier":
      return 0x7c8a6a; // muted olive
    default:
      return 0xaabbcc;
  }
}

// ---------------------------------------------------------------------------
// Procedural planet texture — solid disc with simple radial shading
// ---------------------------------------------------------------------------

function getOrCreatePlanetTexture(scene: Phaser.Scene, color: number): string {
  const key = "galaxy2d:planet:" + color.toString(16).padStart(6, "0");
  if (scene.textures.exists(key)) return key;

  const size = 64;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return key;

  const ctx = tex.getContext();
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const half = size / 2;

  // Lit-from-upper-left radial gradient gives the disc a sphere-like feel.
  const grad = ctx.createRadialGradient(
    half - 8,
    half - 8,
    1,
    half,
    half,
    half,
  );
  const lit = (c: number) => Math.min(255, Math.round(c + 70));
  const dim = (c: number) => Math.max(0, Math.round(c * 0.25));
  grad.addColorStop(0, `rgb(${lit(r)}, ${lit(g)}, ${lit(b)})`);
  grad.addColorStop(0.55, `rgb(${r}, ${g}, ${b})`);
  grad.addColorStop(1, `rgb(${dim(r)}, ${dim(g)}, ${dim(b)})`);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(half, half, half - 1, 0, Math.PI * 2);
  ctx.fill();

  tex.refresh();
  return key;
}

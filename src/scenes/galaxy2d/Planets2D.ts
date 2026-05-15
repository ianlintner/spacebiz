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
import {
  type PlanetVariation,
  derivePlanetVariation,
  isRinged,
  multiplyBrightness,
} from "./PlanetVariation.ts";

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
const ROTATION_SPEED = 0.35; // radians/sec — ~18s per cycle

interface PlanetEntry {
  planet: Planet;
  baseSprite: Phaser.GameObjects.Image;
  ringBackSprite: Phaser.GameObjects.Image | null;
  ringFrontSprite: Phaser.GameObjects.Image | null;
  hitbox: Phaser.GameObjects.Zone;
  variation: PlanetVariation;
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
      e.baseSprite.destroy();
      e.ringBackSprite?.destroy();
      e.ringFrontSprite?.destroy();
      e.hitbox.destroy();
    }
    this.entries.clear();
    this.systemPositions = systemPositions;

    for (const planet of planets) {
      const variation = derivePlanetVariation(planet);

      const baseSprite = this.scene.add.image(0, 0, `planet:${planet.biome}`);
      baseSprite.setDepth(PLANET_DEPTH);
      baseSprite.setVisible(false);
      baseSprite.setTint(variation.baseTint);
      this.container.add(baseSprite);

      let ringBackSprite: Phaser.GameObjects.Image | null = null;
      let ringFrontSprite: Phaser.GameObjects.Image | null = null;
      if (isRinged(planet.biome)) {
        ringBackSprite = this.scene.add.image(0, 0, "planet:ring");
        ringBackSprite.setDepth(PLANET_DEPTH - 5);
        ringBackSprite.setVisible(false);
        ringBackSprite.setCrop(0, 32, 128, 32); // bottom half of ring texture
        ringBackSprite.setOrigin(0.5, 0.0); // top edge anchors at position
        ringBackSprite.setTint(variation.ringTint);
        this.container.add(ringBackSprite);

        ringFrontSprite = this.scene.add.image(0, 0, "planet:ring");
        ringFrontSprite.setDepth(PLANET_DEPTH + 5);
        ringFrontSprite.setVisible(false);
        ringFrontSprite.setCrop(0, 0, 128, 32); // top half of ring texture
        ringFrontSprite.setOrigin(0.5, 1.0); // bottom edge anchors at position
        ringFrontSprite.setTint(variation.ringTint);
        this.container.add(ringFrontSprite);
      }

      const hitbox = this.scene.add.zone(0, 0, 24, 24);
      hitbox.setInteractive({ useHandCursor: true });
      hitbox.setDepth(HITBOX_DEPTH);
      hitbox.setVisible(false);
      hitbox.on("pointerover", () => this.hoverHandler?.(planet.id));
      hitbox.on("pointerout", () => this.hoverHandler?.(null));
      hitbox.on("pointerup", () => this.clickHandler?.(planet.id));

      this.entries.set(planet.id, {
        planet,
        baseSprite,
        ringBackSprite,
        ringFrontSprite,
        hitbox,
        variation,
      });
    }
  }

  setFocusedSystem(systemId: string | null): void {
    if (this.focusedSystemId === systemId) return;
    this.focusedSystemId = systemId;
    if (!systemId) {
      // Leaving system view — hide everything and clear orbit rings.
      for (const e of this.entries.values()) {
        e.baseSprite.setVisible(false);
        e.ringBackSprite?.setVisible(false);
        e.ringFrontSprite?.setVisible(false);
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
        e.baseSprite.setVisible(false);
        e.ringBackSprite?.setVisible(false);
        e.ringFrontSprite?.setVisible(false);
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
        e.baseSprite.setVisible(false);
        e.ringBackSprite?.setVisible(false);
        e.ringFrontSprite?.setVisible(false);
        e.hitbox.setVisible(false);
        continue;
      }
      const scale = perspectiveScale(this.scratchWorld, viewMat, focalLength);
      if (scale <= 0) {
        e.baseSprite.setVisible(false);
        e.ringBackSprite?.setVisible(false);
        e.ringFrontSprite?.setVisible(false);
        e.hitbox.setVisible(false);
        continue;
      }
      const desired = PLANET_WORLD_RADIUS * 2 * scale;
      const size = Math.max(
        8,
        softCapSize(desired, PLANET_DISPLAY_SOFT_CAP_PX),
      );

      const cycle = Math.cos(
        realtimeSeconds * ROTATION_SPEED + e.variation.rotationPhase,
      );
      const brightness = 0.86 + cycle * 0.14; // oscillates [0.72, 1.0]

      e.baseSprite.setPosition(proj.x, proj.y);
      e.baseSprite.setDisplaySize(size, size);
      e.baseSprite.setTint(
        multiplyBrightness(e.variation.baseTint, brightness),
      );
      e.baseSprite.setVisible(true);

      if (e.ringBackSprite && e.ringFrontSprite) {
        const ringW = size * 1.7;
        const ringHalf = size * 0.425;
        e.ringBackSprite.setPosition(proj.x, proj.y);
        e.ringBackSprite.setDisplaySize(ringW, ringHalf);
        e.ringBackSprite.setAngle(e.variation.ringTiltDeg);
        e.ringBackSprite.setVisible(true);
        e.ringFrontSprite.setPosition(proj.x, proj.y);
        e.ringFrontSprite.setDisplaySize(ringW, ringHalf);
        e.ringFrontSprite.setAngle(e.variation.ringTiltDeg);
        e.ringFrontSprite.setVisible(true);
      }

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
      e.baseSprite.destroy();
      e.ringBackSprite?.destroy();
      e.ringFrontSprite?.destroy();
      e.hitbox.destroy();
    }
    this.entries.clear();
    this.orbitGfx?.destroy();
    this.orbitGfx = null;
  }
}

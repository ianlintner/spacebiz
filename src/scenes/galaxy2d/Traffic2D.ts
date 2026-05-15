import * as Phaser from "phaser";
import type { Hyperlane } from "../../data/types.ts";
import type { Mat4 } from "./Camera3D.ts";
import type { Vec3, ViewportRect } from "./types.ts";
import { projectToScreenDesignInto } from "./projection.ts";

const TRAFFIC_SPARK_TEX_KEY = "traffic2d:spark";
const TRAFFIC_SPARK_SIZE = 24;

// Galaxy traffic: long-lived particles drift the full length of the lane.
// Frequency is intentionally sparse — a few distinct "ships" gliding between
// stars reads as alive without looking like flashing static.
const TRAFFIC_GALAXY_LIFESPAN = 2500; // ms
const TRAFFIC_FREQ_SPARSE_MS = 1400; // ms between emissions on quiet lanes
const TRAFFIC_FREQ_DENSE_MS = 500; // ms between emissions on busy lanes
const TRAFFIC_GALAXY_DEPTH = 350;
const TRAFFIC_GALAXY_SPEED_BASE = 30; // px/s — updated per-frame

// System traffic: each gate sends particles toward each planet in the focused
// system. Lifespan is tuned so particles span the gate→planet distance once.
const TRAFFIC_SYSTEM_LIFESPAN = 2500; // ms
const TRAFFIC_SYSTEM_FREQ_SPARSE_MS = 280;
const TRAFFIC_SYSTEM_FREQ_DENSE_MS = 110;
const GATE_RADIUS_WORLD = 4.2; // must match HyperGates2D
const TRAFFIC_SYSTEM_DEPTH = 785;
const TRAFFIC_AMBIENT_DEPTH = 780;
const TRAFFIC_SYSTEM_SPEED_BASE = 40; // px/s initial value, updated per-frame

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function getOrCreateSparkTexture(scene: Phaser.Scene): string {
  if (scene.textures.exists(TRAFFIC_SPARK_TEX_KEY))
    return TRAFFIC_SPARK_TEX_KEY;
  const size = TRAFFIC_SPARK_SIZE;
  const tex = scene.textures.createCanvas(TRAFFIC_SPARK_TEX_KEY, size, size);
  if (!tex) return TRAFFIC_SPARK_TEX_KEY;
  const ctx = tex.getContext();
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
  grad.addColorStop(0.3, "rgba(200, 230, 255, 0.7)");
  grad.addColorStop(1, "rgba(150, 210, 255, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
  return TRAFFIC_SPARK_TEX_KEY;
}

interface GalaxyLaneEmitter {
  emitterFwd: Phaser.GameObjects.Particles.ParticleEmitter;
  emitterBwd: Phaser.GameObjects.Particles.ParticleEmitter;
  worldA: Vec3;
  worldB: Vec3;
  running: boolean;
}

// One emitter per (gate, planet) pair in the focused system. The emitter sits
// at the projected gate position each frame and aims at the projected planet
// position so the stream tracks the planet's orbit.
interface SystemGatePlanetEmitter {
  emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  gateWorldPos: Vec3;
  planetId: string;
  running: boolean;
}

export class Traffic2D {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;

  private galaxyEmitters: GalaxyLaneEmitter[] = [];
  private systemGatePlanetEmitters: SystemGatePlanetEmitter[] = [];
  private systemAmbientEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null =
    null;
  private systemAmbientRunning = false;

  private hyperlanes: Hyperlane[] = [];
  private systemPositions = new Map<string, Vec3>();
  private planetCounts = new Map<string, number>();

  private lastFocusedSystemId: string | null = null;
  private lastPlanetIdsKey = "";

  private readonly scratchA: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly scratchB: Vec3 = { x: 0, y: 0, z: 0 };

  constructor(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.container = container;
  }

  setGalaxyData(
    hyperlanes: Hyperlane[],
    systemPositions: Map<string, Vec3>,
  ): void {
    this.hyperlanes = hyperlanes;
    this.systemPositions = systemPositions;
    this.rebuildGalaxyEmitters();
  }

  setPlanetCounts(counts: Map<string, number>): void {
    this.planetCounts = counts;
    this.rebuildGalaxyEmitters();
  }

  update(
    viewProj: Mat4,
    viewport: ViewportRect,
    inSystemMode: boolean,
    focusedSystemId: string | null,
    focusedPlanetWorldPositions: ReadonlyMap<string, Vec3>,
  ): void {
    if (inSystemMode) {
      this.stopGalaxyEmitters();
      const planetIdsKey = sortedKeysJoined(focusedPlanetWorldPositions);
      if (
        focusedSystemId !== this.lastFocusedSystemId ||
        planetIdsKey !== this.lastPlanetIdsKey
      ) {
        const planetIds = Array.from(focusedPlanetWorldPositions.keys());
        this.rebuildSystemEmitters(focusedSystemId, planetIds);
        this.lastFocusedSystemId = focusedSystemId;
        this.lastPlanetIdsKey = planetIdsKey;
      }
      this.updateSystemEmitters(
        viewProj,
        viewport,
        focusedSystemId,
        focusedPlanetWorldPositions,
      );
    } else {
      this.stopSystemEmitters();
      this.lastFocusedSystemId = null;
      this.lastPlanetIdsKey = "";
      this.updateGalaxyEmitters(viewProj, viewport);
    }
  }

  destroy(): void {
    this.clearGalaxyEmitters();
    this.clearSystemEmitters();
    if (this.scene.textures.exists(TRAFFIC_SPARK_TEX_KEY)) {
      this.scene.textures.remove(TRAFFIC_SPARK_TEX_KEY);
    }
  }

  // ── Private: galaxy ────────────────────────────────────────────────────

  private rebuildGalaxyEmitters(): void {
    this.clearGalaxyEmitters();
    if (this.hyperlanes.length === 0) return;

    const texKey = getOrCreateSparkTexture(this.scene);

    let maxWeight = 1;
    const weights: number[] = [];
    for (const hl of this.hyperlanes) {
      const a = this.planetCounts.get(hl.systemA) ?? 0;
      const b = this.planetCounts.get(hl.systemB) ?? 0;
      const w = a + b;
      weights.push(w);
      if (w > maxWeight) maxWeight = w;
    }

    for (let i = 0; i < this.hyperlanes.length; i++) {
      const hl = this.hyperlanes[i];
      const worldA = this.systemPositions.get(hl.systemA);
      const worldB = this.systemPositions.get(hl.systemB);
      if (!worldA || !worldB) continue;

      const t = weights[i] / maxWeight;
      const frequencyMs = Math.round(
        lerp(TRAFFIC_FREQ_SPARSE_MS, TRAFFIC_FREQ_DENSE_MS, t),
      );

      const baseConfig = {
        lifespan: TRAFFIC_GALAXY_LIFESPAN,
        speed: TRAFFIC_GALAXY_SPEED_BASE,
        scale: { start: 0.55, end: 0.2 },
        alpha: { start: 0.8, end: 0 },
        blendMode: "ADD",
        frequency: frequencyMs,
        quantity: 1,
        angle: 0,
      };

      const emitterFwd = this.scene.add.particles(0, 0, texKey, {
        ...baseConfig,
      });
      emitterFwd.setDepth(TRAFFIC_GALAXY_DEPTH);
      emitterFwd.stop();
      this.container.add(emitterFwd);

      const emitterBwd = this.scene.add.particles(0, 0, texKey, {
        ...baseConfig,
      });
      emitterBwd.setDepth(TRAFFIC_GALAXY_DEPTH);
      emitterBwd.stop();
      this.container.add(emitterBwd);

      this.galaxyEmitters.push({
        emitterFwd,
        emitterBwd,
        worldA: { x: worldA.x, y: worldA.y, z: worldA.z },
        worldB: { x: worldB.x, y: worldB.y, z: worldB.z },
        running: false,
      });
    }
  }

  private updateGalaxyEmitters(viewProj: Mat4, viewport: ViewportRect): void {
    for (const entry of this.galaxyEmitters) {
      const projA = projectToScreenDesignInto(
        this.scratchA,
        entry.worldA,
        viewProj,
        viewport,
      );
      const projB = projectToScreenDesignInto(
        this.scratchB,
        entry.worldB,
        viewProj,
        viewport,
      );

      if (!projA.visible || !projB.visible) {
        if (entry.running) {
          entry.emitterFwd.stop();
          entry.emitterBwd.stop();
          entry.running = false;
        }
        continue;
      }

      const dx = projB.x - projA.x;
      const dy = projB.y - projA.y;
      const screenDist = Math.sqrt(dx * dx + dy * dy);

      if (screenDist < 4) {
        if (entry.running) {
          entry.emitterFwd.stop();
          entry.emitterBwd.stop();
          entry.running = false;
        }
        continue;
      }

      const angleDegFwd = Math.atan2(dy, dx) * (180 / Math.PI);
      const angleDegBwd = angleDegFwd + 180;
      // Particles travel the full lane in one lifespan, so the speed is the
      // lane length divided by the lifespan. With the fade-in-out alpha curve,
      // this reads as ships drifting steadily between stars.
      const speed = screenDist / (TRAFFIC_GALAXY_LIFESPAN / 1000);

      // Forward stream: starts at A, heads toward B.
      entry.emitterFwd.x = projA.x;
      entry.emitterFwd.y = projA.y;
      entry.emitterFwd.setEmitterAngle({
        min: angleDegFwd - 4,
        max: angleDegFwd + 4,
      });
      entry.emitterFwd.setParticleSpeed(speed);

      // Reverse stream: starts at B, heads toward A.
      entry.emitterBwd.x = projB.x;
      entry.emitterBwd.y = projB.y;
      entry.emitterBwd.setEmitterAngle({
        min: angleDegBwd - 4,
        max: angleDegBwd + 4,
      });
      entry.emitterBwd.setParticleSpeed(speed);

      if (!entry.running) {
        entry.emitterFwd.start();
        entry.emitterBwd.start();
        entry.running = true;
      }
    }
  }

  private stopGalaxyEmitters(): void {
    for (const e of this.galaxyEmitters) {
      if (!e.running) continue;
      e.emitterFwd.stop();
      e.emitterBwd.stop();
      e.running = false;
    }
  }

  private clearGalaxyEmitters(): void {
    for (const e of this.galaxyEmitters) {
      e.emitterFwd.destroy();
      e.emitterBwd.destroy();
    }
    this.galaxyEmitters = [];
  }

  // ── Private: system ────────────────────────────────────────────────────

  private rebuildSystemEmitters(
    focusedSystemId: string | null,
    planetIds: readonly string[],
  ): void {
    this.clearSystemEmitters();
    if (!focusedSystemId) return;

    const focusedPos = this.systemPositions.get(focusedSystemId);
    if (!focusedPos) return;

    const texKey = getOrCreateSparkTexture(this.scene);

    const planetCount = planetIds.length;
    // Per-stream frequency scales DOWN as planet count goes up — more planets
    // means more parallel streams, so each one can be sparser without losing
    // overall density.
    const densityT = Math.min(1, planetCount / 4);
    const perStreamFreqMs = Math.round(
      lerp(
        TRAFFIC_SYSTEM_FREQ_SPARSE_MS,
        TRAFFIC_SYSTEM_FREQ_DENSE_MS,
        densityT,
      ),
    );

    // Build one emitter per (gate, planet) pair.
    for (const hl of this.hyperlanes) {
      const isA = hl.systemA === focusedSystemId;
      const isB = hl.systemB === focusedSystemId;
      if (!isA && !isB) continue;

      const connectedId = isA ? hl.systemB : hl.systemA;
      const connectedPos = this.systemPositions.get(connectedId);
      if (!connectedPos) continue;

      const dx = connectedPos.x - focusedPos.x;
      const dz = connectedPos.z - focusedPos.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len < 0.001) continue;

      const gateWorldPos: Vec3 = {
        x: focusedPos.x + (dx / len) * GATE_RADIUS_WORLD,
        y: focusedPos.y,
        z: focusedPos.z + (dz / len) * GATE_RADIUS_WORLD,
      };

      for (const planetId of planetIds) {
        const emitter = this.scene.add.particles(0, 0, texKey, {
          lifespan: TRAFFIC_SYSTEM_LIFESPAN,
          speed: TRAFFIC_SYSTEM_SPEED_BASE,
          scale: { start: 0.4, end: 0 },
          alpha: { start: 0.65, end: 0 },
          blendMode: "ADD",
          frequency: perStreamFreqMs,
          quantity: 1,
          angle: 0,
        });
        emitter.setDepth(TRAFFIC_SYSTEM_DEPTH);
        emitter.stop();
        this.container.add(emitter);

        this.systemGatePlanetEmitters.push({
          emitter,
          gateWorldPos: { ...gateWorldPos },
          planetId,
          running: false,
        });
      }
    }

    // Faint ambient sparks at the star — represents general station/orbital
    // activity even when there are no planets to target.
    const ambientFreqMs = Math.round(lerp(450, 200, densityT));
    const ambientEmitter = this.scene.add.particles(0, 0, texKey, {
      lifespan: TRAFFIC_SYSTEM_LIFESPAN,
      speed: { min: 12, max: 30 },
      scale: { start: 0.22, end: 0 },
      alpha: { start: 0.3, end: 0 },
      blendMode: "ADD",
      frequency: ambientFreqMs,
      quantity: 1,
      angle: { min: 0, max: 360 },
    });
    ambientEmitter.setDepth(TRAFFIC_AMBIENT_DEPTH);
    ambientEmitter.stop();
    this.container.add(ambientEmitter);
    this.systemAmbientEmitter = ambientEmitter;
  }

  private updateSystemEmitters(
    viewProj: Mat4,
    viewport: ViewportRect,
    focusedSystemId: string | null,
    focusedPlanetWorldPositions: ReadonlyMap<string, Vec3>,
  ): void {
    if (!focusedSystemId) return;

    const focusedPos = this.systemPositions.get(focusedSystemId);
    if (!focusedPos) return;

    // Each emitter sits at its gate's screen position and fires toward its
    // assigned planet's current screen position.
    for (const entry of this.systemGatePlanetEmitters) {
      const planetWorld = focusedPlanetWorldPositions.get(entry.planetId);
      if (!planetWorld) {
        if (entry.running) {
          entry.emitter.stop();
          entry.running = false;
        }
        continue;
      }

      const gateProj = projectToScreenDesignInto(
        this.scratchA,
        entry.gateWorldPos,
        viewProj,
        viewport,
      );
      const planetProj = projectToScreenDesignInto(
        this.scratchB,
        planetWorld,
        viewProj,
        viewport,
      );

      if (!gateProj.visible || !planetProj.visible) {
        if (entry.running) {
          entry.emitter.stop();
          entry.running = false;
        }
        continue;
      }

      const dx = planetProj.x - gateProj.x;
      const dy = planetProj.y - gateProj.y;
      const screenDist = Math.sqrt(dx * dx + dy * dy);

      if (screenDist < 4) {
        if (entry.running) {
          entry.emitter.stop();
          entry.running = false;
        }
        continue;
      }

      const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
      // Sized so a particle reaches the planet just as it fades out.
      const speed = screenDist / (TRAFFIC_SYSTEM_LIFESPAN / 1000);

      entry.emitter.x = gateProj.x;
      entry.emitter.y = gateProj.y;
      entry.emitter.setEmitterAngle({ min: angleDeg - 6, max: angleDeg + 6 });
      entry.emitter.setParticleSpeed(speed);

      if (!entry.running) {
        entry.emitter.start();
        entry.running = true;
      }
    }

    // Ambient emitter parks at the star.
    if (this.systemAmbientEmitter) {
      const starProj = projectToScreenDesignInto(
        this.scratchA,
        focusedPos,
        viewProj,
        viewport,
      );
      if (starProj.visible) {
        this.systemAmbientEmitter.x = starProj.x;
        this.systemAmbientEmitter.y = starProj.y;
        if (!this.systemAmbientRunning) {
          this.systemAmbientEmitter.start();
          this.systemAmbientRunning = true;
        }
      } else if (this.systemAmbientRunning) {
        this.systemAmbientEmitter.stop();
        this.systemAmbientRunning = false;
      }
    }
  }

  private stopSystemEmitters(): void {
    for (const e of this.systemGatePlanetEmitters) {
      if (!e.running) continue;
      e.emitter.stop();
      e.running = false;
    }
    if (this.systemAmbientRunning && this.systemAmbientEmitter) {
      this.systemAmbientEmitter.stop();
      this.systemAmbientRunning = false;
    }
  }

  private clearSystemEmitters(): void {
    for (const e of this.systemGatePlanetEmitters) e.emitter.destroy();
    this.systemGatePlanetEmitters = [];
    if (this.systemAmbientEmitter) {
      this.systemAmbientEmitter.destroy();
      this.systemAmbientEmitter = null;
    }
    this.systemAmbientRunning = false;
  }
}

function sortedKeysJoined(map: ReadonlyMap<string, unknown>): string {
  const keys = Array.from(map.keys());
  keys.sort();
  return keys.join("|");
}

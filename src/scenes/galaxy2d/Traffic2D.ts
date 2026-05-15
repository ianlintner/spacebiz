import * as Phaser from "phaser";
import type { Hyperlane } from "../../data/types.ts";
import type { Mat4 } from "./Camera3D.ts";
import type { Vec3, ViewportRect } from "./types.ts";
import { projectToScreenDesignInto } from "./projection.ts";

const TRAFFIC_SPARK_TEX_KEY = "traffic2d:spark";
const TRAFFIC_SPARK_SIZE = 24;
const TRAFFIC_FREQ_SPARSE_MS = 250; // ms between emissions on quiet lanes
const TRAFFIC_FREQ_DENSE_MS = 80; // ms between emissions on busy lanes
const TRAFFIC_GALAXY_LIFESPAN = 700; // ms
const TRAFFIC_GALAXY_DEPTH = 350;
const TRAFFIC_GALAXY_SPEED_BASE = 55; // px/s — updated per-frame

const TRAFFIC_SYSTEM_LIFESPAN = 800; // ms
const TRAFFIC_SYSTEM_FREQ_SPARSE_MS = 300;
const TRAFFIC_SYSTEM_FREQ_DENSE_MS = 60;
const TRAFFIC_MAX_PLANETS = 6;
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

interface SystemGateEmitter {
  emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  gateWorldPos: Vec3;
  running: boolean;
}

export class Traffic2D {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;

  private galaxyEmitters: GalaxyLaneEmitter[] = [];
  private systemGateEmitters: SystemGateEmitter[] = [];
  private systemAmbientEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null =
    null;
  private systemAmbientRunning = false;

  private hyperlanes: Hyperlane[] = [];
  private systemPositions = new Map<string, Vec3>();
  private planetCounts = new Map<string, number>();

  private lastFocusedSystemId: string | null = null;

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
  ): void {
    if (inSystemMode) {
      this.stopGalaxyEmitters();
      if (focusedSystemId !== this.lastFocusedSystemId) {
        this.rebuildSystemEmitters(focusedSystemId);
        this.lastFocusedSystemId = focusedSystemId;
      }
      this.updateSystemEmitters(viewProj, viewport, focusedSystemId);
    } else {
      this.stopSystemEmitters();
      this.lastFocusedSystemId = null;
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
        scale: { start: 0.3, end: 0 },
        alpha: { start: 0.5, end: 0 },
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

      const midX = (projA.x + projB.x) / 2;
      const midY = (projA.y + projB.y) / 2;
      const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
      // Speed: traverse half the lane in one lifespan (particles spawn at midpoint).
      const speed = screenDist / 2 / (TRAFFIC_GALAXY_LIFESPAN / 1000);

      entry.emitterFwd.x = midX;
      entry.emitterFwd.y = midY;
      entry.emitterFwd.setEmitterAngle({
        min: angleDeg - 10,
        max: angleDeg + 10,
      });
      entry.emitterFwd.setParticleSpeed(speed);

      const reverseAngle = angleDeg + 180;
      entry.emitterBwd.x = midX;
      entry.emitterBwd.y = midY;
      entry.emitterBwd.setEmitterAngle({
        min: reverseAngle - 10,
        max: reverseAngle + 10,
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

  private rebuildSystemEmitters(focusedSystemId: string | null): void {
    this.clearSystemEmitters();
    if (!focusedSystemId) return;

    const focusedPos = this.systemPositions.get(focusedSystemId);
    if (!focusedPos) return;

    const texKey = getOrCreateSparkTexture(this.scene);

    const planetCount = this.planetCounts.get(focusedSystemId) ?? 0;
    const densityT = Math.min(1, planetCount / TRAFFIC_MAX_PLANETS);
    const gateFreqMs = Math.round(
      lerp(
        TRAFFIC_SYSTEM_FREQ_SPARSE_MS,
        TRAFFIC_SYSTEM_FREQ_DENSE_MS,
        densityT,
      ),
    );

    // One emitter per hypergate — positioned at the gate, aimed toward the star.
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

      const emitter = this.scene.add.particles(0, 0, texKey, {
        lifespan: TRAFFIC_SYSTEM_LIFESPAN,
        speed: TRAFFIC_SYSTEM_SPEED_BASE,
        scale: { start: 0.4, end: 0 },
        alpha: { start: 0.65, end: 0 },
        blendMode: "ADD",
        frequency: gateFreqMs,
        quantity: 1,
        angle: 0,
      });
      emitter.setDepth(TRAFFIC_SYSTEM_DEPTH);
      emitter.stop();
      this.container.add(emitter);

      this.systemGateEmitters.push({
        emitter,
        gateWorldPos,
        running: false,
      });
    }

    // Ambient emitter at the star — low-density omnidirectional background traffic.
    const ambientFreqMs = Math.round(lerp(400, 120, densityT));
    const ambientEmitter = this.scene.add.particles(0, 0, texKey, {
      lifespan: TRAFFIC_SYSTEM_LIFESPAN,
      speed: { min: 15, max: 35 },
      scale: { start: 0.25, end: 0 },
      alpha: { start: 0.35, end: 0 },
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
  ): void {
    if (!focusedSystemId) return;

    const focusedPos = this.systemPositions.get(focusedSystemId);
    if (!focusedPos) return;

    // Project the star — this is the TARGET for gate emitters (traffic flows gate → star/system).
    const starProj = projectToScreenDesignInto(
      this.scratchA,
      focusedPos,
      viewProj,
      viewport,
    );

    if (!starProj.visible) {
      this.stopSystemEmitters();
      return;
    }

    // Each gate emitter sits at the gate's screen position and fires toward the star.
    for (const entry of this.systemGateEmitters) {
      const gateProj = projectToScreenDesignInto(
        this.scratchB,
        entry.gateWorldPos,
        viewProj,
        viewport,
      );

      if (!gateProj.visible) {
        if (entry.running) {
          entry.emitter.stop();
          entry.running = false;
        }
        continue;
      }

      // Direction from gate toward star.
      const dx = starProj.x - gateProj.x;
      const dy = starProj.y - gateProj.y;
      const screenDist = Math.sqrt(dx * dx + dy * dy);

      if (screenDist < 4) {
        if (entry.running) {
          entry.emitter.stop();
          entry.running = false;
        }
        continue;
      }

      const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
      const speed = screenDist / (TRAFFIC_SYSTEM_LIFESPAN / 1000);

      // Emitter sits at the gate, not the star.
      entry.emitter.x = gateProj.x;
      entry.emitter.y = gateProj.y;
      entry.emitter.setEmitterAngle({ min: angleDeg - 8, max: angleDeg + 8 });
      entry.emitter.setParticleSpeed(speed);

      if (!entry.running) {
        entry.emitter.start();
        entry.running = true;
      }
    }

    // Ambient emitter stays at the star.
    if (this.systemAmbientEmitter) {
      this.systemAmbientEmitter.x = starProj.x;
      this.systemAmbientEmitter.y = starProj.y;
      if (!this.systemAmbientRunning) {
        this.systemAmbientEmitter.start();
        this.systemAmbientRunning = true;
      }
    }
  }

  private stopSystemEmitters(): void {
    for (const e of this.systemGateEmitters) {
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
    for (const e of this.systemGateEmitters) e.emitter.destroy();
    this.systemGateEmitters = [];
    if (this.systemAmbientEmitter) {
      this.systemAmbientEmitter.destroy();
      this.systemAmbientEmitter = null;
    }
    this.systemAmbientRunning = false;
  }
}

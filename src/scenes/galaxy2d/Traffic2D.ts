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
const TRAFFIC_GALAXY_SPEED_BASE = 55; // px/s — updated per-frame but set at creation

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

  private _hyperlanes: Hyperlane[] = [];
  private _systemPositions = new Map<string, Vec3>();
  private _planetCounts = new Map<string, number>();

  private lastFocusedSystemId: string | null = null;

  private readonly _scratchA: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly _scratchB: Vec3 = { x: 0, y: 0, z: 0 };

  constructor(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.container = container;
  }

  setGalaxyData(
    hyperlanes: Hyperlane[],
    systemPositions: Map<string, Vec3>,
  ): void {
    this._hyperlanes = hyperlanes;
    this._systemPositions = systemPositions;
    this.rebuildGalaxyEmitters();
  }

  setPlanetCounts(counts: Map<string, number>): void {
    this._planetCounts = counts;
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
    if (this._hyperlanes.length === 0) return;

    const texKey = getOrCreateSparkTexture(this.scene);

    // Compute per-lane weight (sum of planet counts at both endpoints).
    let maxWeight = 1;
    const weights: number[] = [];
    for (const hl of this._hyperlanes) {
      const a = this._planetCounts.get(hl.systemA) ?? 0;
      const b = this._planetCounts.get(hl.systemB) ?? 0;
      const w = a + b;
      weights.push(w);
      if (w > maxWeight) maxWeight = w;
    }

    for (let i = 0; i < this._hyperlanes.length; i++) {
      const hl = this._hyperlanes[i];
      const worldA = this._systemPositions.get(hl.systemA);
      const worldB = this._systemPositions.get(hl.systemB);
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
        this._scratchA,
        entry.worldA,
        viewProj,
        viewport,
      );
      const projB = projectToScreenDesignInto(
        this._scratchB,
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
      (entry.emitterFwd.angle as any) = {
        min: angleDeg - 10,
        max: angleDeg + 10,
      };
      (entry.emitterFwd.speed as any) = speed;

      const reverseAngle = angleDeg + 180;
      entry.emitterBwd.x = midX;
      entry.emitterBwd.y = midY;
      (entry.emitterBwd.angle as any) = {
        min: reverseAngle - 10,
        max: reverseAngle + 10,
      };
      (entry.emitterBwd.speed as any) = speed;

      if (!entry.running) {
        entry.emitterFwd.start();
        entry.emitterBwd.start();
        entry.running = true;
      }
    }
  }

  private stopGalaxyEmitters(): void {
    // Scratch vectors used in updateGalaxyEmitters when implemented
    void this._scratchA;
    void this._scratchB;
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

  private rebuildSystemEmitters(_focusedSystemId: string | null): void {
    this.clearSystemEmitters();
  }

  private updateSystemEmitters(
    _viewProj: Mat4,
    _viewport: ViewportRect,
    _focusedSystemId: string | null,
  ): void {}

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

import * as Phaser from "phaser";
import type { Hyperlane } from "../../data/types.ts";
import type { Mat4 } from "./Camera3D.ts";
import type { Vec3, ViewportRect } from "./types.ts";
import { perspectiveScale, projectToScreenDesignInto } from "./projection.ts";

// Custom particle/ship traffic system. Particles store world-space position
// and velocity so they stay anchored to the map under any camera pan/zoom —
// we re-project them to screen every frame for rendering. We bypass Phaser's
// ParticleEmitter because the projected-endpoint use case fights its
// radial/angle/speed model.

const TRAFFIC_SPARK_TEX_KEY = "traffic2d:spark";
const TRAFFIC_SPARK_SIZE = 24;

// Galaxy traffic: ships drift between connected star systems along hyperlanes.
const TRAFFIC_GALAXY_LIFESPAN_MS = 4000;
const TRAFFIC_GALAXY_FREQ_SPARSE_MS = 900;
const TRAFFIC_GALAXY_FREQ_DENSE_MS = 280;
const TRAFFIC_GALAXY_DEPTH = 350;
const TRAFFIC_GALAXY_BASE_SCALE = 0.5;
const TRAFFIC_GALAXY_ALPHA = 0.75;

// System traffic: ships shuttle from each hypergate to each planet.
const TRAFFIC_SYSTEM_LIFESPAN_MS = 3200;
const TRAFFIC_SYSTEM_FREQ_SPARSE_MS = 700;
const TRAFFIC_SYSTEM_FREQ_DENSE_MS = 220;
const TRAFFIC_SYSTEM_DEPTH = 785;
const TRAFFIC_SYSTEM_BASE_SCALE = 0.55;
const TRAFFIC_SYSTEM_ALPHA = 0.85;

// Pixel size targets for the spark sprite at any zoom level. Perspective scale
// is clamped to this range so particles never become invisible or fill the
// screen at extreme zooms.
const TRAFFIC_MIN_DISPLAY_PX = 3;
const TRAFFIC_MAX_DISPLAY_PX = 14;

// Each spawn waits intervalMs * (1 ± JITTER) so the rhythm feels organic
// instead of metronomic.
const TRAFFIC_JITTER = 0.55;

// Per-particle speed variation: lifespan is multiplied by (1 ± SPEED_JITTER),
// so the same source→target trip takes anywhere from ~70% to ~140% of the
// base time. Faster ships zip across; slower ones drift.
const TRAFFIC_SPEED_JITTER = 0.35;

const GATE_RADIUS_WORLD = 4.2; // must match HyperGates2D
const POOL_INITIAL_SIZE = 64;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function jitteredInterval(baseMs: number): number {
  return baseMs * (1 + (Math.random() * 2 - 1) * TRAFFIC_JITTER);
}

function jitteredLifespan(baseMs: number): number {
  return baseMs * (1 + (Math.random() * 2 - 1) * TRAFFIC_SPEED_JITTER);
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
  grad.addColorStop(0.35, "rgba(200, 230, 255, 0.7)");
  grad.addColorStop(1, "rgba(150, 210, 255, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  tex.refresh();
  return TRAFFIC_SPARK_TEX_KEY;
}

interface Particle {
  sprite: Phaser.GameObjects.Image;
  active: boolean;
  ageMs: number;
  lifeMs: number;
  // World-space position and velocity. Re-projected to screen every frame so
  // particles follow camera pan/zoom and stay anchored to the map.
  wx: number;
  wy: number;
  wz: number;
  vwx: number; // world units / sec
  vwy: number;
  vwz: number;
  baseAlpha: number;
  baseScale: number;
}

interface GalaxyStream {
  worldA: Vec3;
  worldB: Vec3;
  nextSpawnAtMs: number;
  intervalMs: number;
  // Alternates A→B and B→A so the lane has bidirectional traffic.
  fwdNext: boolean;
}

interface SystemStream {
  gateWorldPos: Vec3;
  planetId: string;
  nextSpawnAtMs: number;
  intervalMs: number;
  // Alternates gate→planet and planet→gate so the route has two-way traffic.
  outboundNext: boolean;
}

export class Traffic2D {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;

  private hyperlanes: Hyperlane[] = [];
  private systemPositions = new Map<string, Vec3>();
  private planetCounts = new Map<string, number>();

  private galaxyStreams: GalaxyStream[] = [];
  private systemStreams: SystemStream[] = [];

  private particles: Particle[] = [];
  private lastFocusedSystemId: string | null = null;
  private lastPlanetIdsKey = "";
  private lastUpdateMs = 0;

  private readonly scratchA: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly scratchWorld: Vec3 = { x: 0, y: 0, z: 0 };

  constructor(scene: Phaser.Scene, container: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.container = container;
    getOrCreateSparkTexture(scene);
    for (let i = 0; i < POOL_INITIAL_SIZE; i++)
      this.particles.push(this.createParticle());
  }

  setGalaxyData(
    hyperlanes: Hyperlane[],
    systemPositions: Map<string, Vec3>,
  ): void {
    this.hyperlanes = hyperlanes;
    this.systemPositions = systemPositions;
    this.rebuildGalaxyStreams();
  }

  setPlanetCounts(counts: Map<string, number>): void {
    this.planetCounts = counts;
    this.rebuildGalaxyStreams();
  }

  update(
    viewProj: Mat4,
    viewMat: Mat4,
    focalLength: number,
    viewport: ViewportRect,
    inSystemMode: boolean,
    focusedSystemId: string | null,
    focusedPlanetWorldPositions: ReadonlyMap<string, Vec3>,
  ): void {
    const nowMs = this.scene.time.now;
    const dtMs = this.lastUpdateMs === 0 ? 16 : nowMs - this.lastUpdateMs;
    this.lastUpdateMs = nowMs;

    if (inSystemMode) {
      const planetIdsKey = sortedKeysJoined(focusedPlanetWorldPositions);
      if (
        focusedSystemId !== this.lastFocusedSystemId ||
        planetIdsKey !== this.lastPlanetIdsKey
      ) {
        this.rebuildSystemStreams(focusedSystemId, focusedPlanetWorldPositions);
        this.lastFocusedSystemId = focusedSystemId;
        this.lastPlanetIdsKey = planetIdsKey;
      }
      this.spawnSystemParticles(focusedPlanetWorldPositions, nowMs);
    } else {
      if (this.lastFocusedSystemId !== null || this.systemStreams.length > 0) {
        this.systemStreams = [];
        this.lastFocusedSystemId = null;
        this.lastPlanetIdsKey = "";
      }
      this.spawnGalaxyParticles(nowMs);
    }

    this.advanceParticles(dtMs, viewProj, viewMat, focalLength, viewport);
  }

  destroy(): void {
    for (const p of this.particles) p.sprite.destroy();
    this.particles = [];
    if (this.scene.textures.exists(TRAFFIC_SPARK_TEX_KEY)) {
      this.scene.textures.remove(TRAFFIC_SPARK_TEX_KEY);
    }
  }

  // ── Particle pool ──────────────────────────────────────────────────────

  private createParticle(): Particle {
    const sprite = this.scene.add.image(0, 0, TRAFFIC_SPARK_TEX_KEY);
    sprite.setVisible(false);
    sprite.setBlendMode(Phaser.BlendModes.ADD);
    sprite.setActive(false);
    this.container.add(sprite);
    return {
      sprite,
      active: false,
      ageMs: 0,
      lifeMs: 0,
      wx: 0,
      wy: 0,
      wz: 0,
      vwx: 0,
      vwy: 0,
      vwz: 0,
      baseAlpha: 1,
      baseScale: 1,
    };
  }

  private acquireParticle(): Particle {
    for (const p of this.particles) if (!p.active) return p;
    const grown = this.createParticle();
    this.particles.push(grown);
    return grown;
  }

  private launchParticle(
    p: Particle,
    source: Vec3,
    target: Vec3,
    lifeMs: number,
    baseAlpha: number,
    baseScale: number,
    depth: number,
  ): void {
    const lifeSec = lifeMs / 1000;
    p.active = true;
    p.ageMs = 0;
    p.lifeMs = lifeMs;
    p.wx = source.x;
    p.wy = source.y;
    p.wz = source.z;
    p.vwx = (target.x - source.x) / lifeSec;
    p.vwy = (target.y - source.y) / lifeSec;
    p.vwz = (target.z - source.z) / lifeSec;
    p.baseAlpha = baseAlpha;
    p.baseScale = baseScale;
    p.sprite.setActive(true);
    p.sprite.setDepth(depth);
    p.sprite.setVisible(false); // will be set true in advance once projected
  }

  private advanceParticles(
    dtMs: number,
    viewProj: Mat4,
    viewMat: Mat4,
    focalLength: number,
    viewport: ViewportRect,
  ): void {
    const dtSec = dtMs / 1000;
    for (const p of this.particles) {
      if (!p.active) continue;
      p.ageMs += dtMs;
      if (p.ageMs >= p.lifeMs) {
        p.active = false;
        p.sprite.setActive(false);
        p.sprite.setVisible(false);
        continue;
      }
      p.wx += p.vwx * dtSec;
      p.wy += p.vwy * dtSec;
      p.wz += p.vwz * dtSec;

      this.scratchWorld.x = p.wx;
      this.scratchWorld.y = p.wy;
      this.scratchWorld.z = p.wz;
      const proj = projectToScreenDesignInto(
        this.scratchA,
        this.scratchWorld,
        viewProj,
        viewport,
      );
      if (!proj.visible) {
        p.sprite.setVisible(false);
        continue;
      }

      const persp = perspectiveScale(this.scratchWorld, viewMat, focalLength);
      if (persp <= 0) {
        p.sprite.setVisible(false);
        continue;
      }
      // Convert "world-scale" sparkle size to a pixel size, clamped so it
      // stays readable at galaxy zoom and doesn't blow up in system zoom.
      const desiredPx = clamp(
        p.baseScale * persp * 0.04,
        TRAFFIC_MIN_DISPLAY_PX,
        TRAFFIC_MAX_DISPLAY_PX,
      );

      // Smooth fade-in over first 15% of life, fade-out across the rest.
      const t = p.ageMs / p.lifeMs;
      const fade = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;

      p.sprite.setPosition(proj.x, proj.y);
      p.sprite.setDisplaySize(desiredPx, desiredPx);
      p.sprite.setAlpha(p.baseAlpha * fade);
      p.sprite.setVisible(true);
    }
  }

  // ── Galaxy lanes ───────────────────────────────────────────────────────

  private rebuildGalaxyStreams(): void {
    this.galaxyStreams = [];
    if (this.hyperlanes.length === 0) return;

    let maxWeight = 1;
    for (const hl of this.hyperlanes) {
      const a = this.planetCounts.get(hl.systemA) ?? 0;
      const b = this.planetCounts.get(hl.systemB) ?? 0;
      const w = a + b;
      if (w > maxWeight) maxWeight = w;
    }

    const baseMs = this.scene.time.now;
    for (const hl of this.hyperlanes) {
      const worldA = this.systemPositions.get(hl.systemA);
      const worldB = this.systemPositions.get(hl.systemB);
      if (!worldA || !worldB) continue;
      const a = this.planetCounts.get(hl.systemA) ?? 0;
      const b = this.planetCounts.get(hl.systemB) ?? 0;
      const t = (a + b) / maxWeight;
      const intervalMs = Math.round(
        lerp(TRAFFIC_GALAXY_FREQ_SPARSE_MS, TRAFFIC_GALAXY_FREQ_DENSE_MS, t),
      );
      this.galaxyStreams.push({
        worldA: { x: worldA.x, y: worldA.y, z: worldA.z },
        worldB: { x: worldB.x, y: worldB.y, z: worldB.z },
        nextSpawnAtMs: baseMs + Math.random() * intervalMs,
        intervalMs,
        fwdNext: Math.random() < 0.5,
      });
    }
  }

  private spawnGalaxyParticles(nowMs: number): void {
    for (const stream of this.galaxyStreams) {
      if (nowMs < stream.nextSpawnAtMs) continue;
      const fwd = stream.fwdNext;
      stream.fwdNext = !fwd;
      const source = fwd ? stream.worldA : stream.worldB;
      const target = fwd ? stream.worldB : stream.worldA;
      const p = this.acquireParticle();
      this.launchParticle(
        p,
        source,
        target,
        jitteredLifespan(TRAFFIC_GALAXY_LIFESPAN_MS),
        TRAFFIC_GALAXY_ALPHA,
        TRAFFIC_GALAXY_BASE_SCALE,
        TRAFFIC_GALAXY_DEPTH,
      );
      stream.nextSpawnAtMs = nowMs + jitteredInterval(stream.intervalMs);
    }
  }

  // ── System: gate → planet ─────────────────────────────────────────────

  private rebuildSystemStreams(
    focusedSystemId: string | null,
    focusedPlanetWorldPositions: ReadonlyMap<string, Vec3>,
  ): void {
    this.systemStreams = [];
    if (!focusedSystemId) return;
    const focusedPos = this.systemPositions.get(focusedSystemId);
    if (!focusedPos) return;

    const planetIds = Array.from(focusedPlanetWorldPositions.keys());
    const planetCount = planetIds.length;
    const densityT = Math.min(1, planetCount / 4);
    const perStreamFreqMs = Math.round(
      lerp(
        TRAFFIC_SYSTEM_FREQ_SPARSE_MS,
        TRAFFIC_SYSTEM_FREQ_DENSE_MS,
        densityT,
      ),
    );

    const baseMs = this.scene.time.now;
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
        this.systemStreams.push({
          gateWorldPos: { ...gateWorldPos },
          planetId,
          nextSpawnAtMs: baseMs + Math.random() * perStreamFreqMs,
          intervalMs: perStreamFreqMs,
          outboundNext: Math.random() < 0.5,
        });
      }
    }
  }

  private spawnSystemParticles(
    focusedPlanetWorldPositions: ReadonlyMap<string, Vec3>,
    nowMs: number,
  ): void {
    for (const stream of this.systemStreams) {
      if (nowMs < stream.nextSpawnAtMs) continue;
      const planetWorld = focusedPlanetWorldPositions.get(stream.planetId);
      if (!planetWorld) {
        stream.nextSpawnAtMs = nowMs + jitteredInterval(stream.intervalMs);
        continue;
      }
      const outbound = stream.outboundNext;
      stream.outboundNext = !outbound;
      const source = outbound ? stream.gateWorldPos : planetWorld;
      const target = outbound ? planetWorld : stream.gateWorldPos;
      const p = this.acquireParticle();
      this.launchParticle(
        p,
        source,
        target,
        jitteredLifespan(TRAFFIC_SYSTEM_LIFESPAN_MS),
        TRAFFIC_SYSTEM_ALPHA,
        TRAFFIC_SYSTEM_BASE_SCALE,
        TRAFFIC_SYSTEM_DEPTH,
      );
      stream.nextSpawnAtMs = nowMs + jitteredInterval(stream.intervalMs);
    }
  }
}

function sortedKeysJoined(map: ReadonlyMap<string, unknown>): string {
  const keys = Array.from(map.keys());
  keys.sort();
  return keys.join("|");
}

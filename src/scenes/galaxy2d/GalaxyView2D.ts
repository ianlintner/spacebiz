import * as Phaser from "phaser";
import type {
  BorderPort,
  Empire,
  Hyperlane,
  StarSystem,
} from "../../data/types.ts";
import type { RouteTrafficVisual } from "../../game/routes/RouteManager.ts";
import { CAMERA_FOV_Y, Camera3D } from "./Camera3D.ts";
import { disposeAllGlowTextures, getStarGlowTexture } from "./GlowTextures.ts";
import {
  perspectiveScale,
  projectToScreenDesign,
  projectToScreenDesignInto,
} from "./projection.ts";
import type { ProjectedScreen, Vec3, ViewportRect } from "./types.ts";

// Phaser-only galaxy renderer. Phase 1 scope: stars + hyperlanes only. The
// rest of the public surface mirrors GalaxyView3D so callers can be ducked
// over without TypeScript noise; those methods are no-op stubs until later
// phases fill them in.
//
// Math: all projection goes through the pure helpers in ./projection.ts
// (parity-tested against THREE.Vector3.project to within 0.01 design pixels),
// so on-screen positions match GalaxyView3D exactly.

const COORD_SCALE = 0.16;
const Y_WOBBLE = 8;

const HYPERLANE_OPEN_COLOR = 0x6dc8ff;
const HYPERLANE_RESTRICTED_COLOR = 0xffaa00;
const HYPERLANE_CLOSED_COLOR = 0xff4444;

// Star halo world scale matches GalaxyView3D's halo Sprite (3.4 world units
// before sizeAttenuation). Multiplied by perspectiveScale() to get on-screen
// pixels.
const STAR_HALO_WORLD_SIZE = 3.4;
// Alpha and depth tuning constants pulled out so future visual passes have
// one place to tweak.
const STAR_ALPHA = 0.95;
const HYPERLANE_LINE_WIDTH = 1.2;
const HYPERLANE_LINE_ALPHA = 0.5;
const HYPERLANE_DEPTH = 300;
const STAR_DEPTH_BASE = 800;
const STAR_DEPTH_RANGE = -10;

export interface GalaxyView2DOptions {
  scene: Phaser.Scene;
  designWidth: number;
  designHeight: number;
}

// Re-exported for callers that want to import HQ marker shape from the new
// path. Kept structurally identical to GalaxyView3D.HQMarker3D so the duck
// type works either way.
export interface HQMarker3D {
  systemId: string;
  isPlayer: boolean;
}

interface HyperlaneSegment {
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  color: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Stable string hash for deterministic per-system y-wobble. Mirrors the
 * inline hashString used in GalaxyView3D so worldPosFor() returns identical
 * vec3s for the same system id.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export class GalaxyView2D {
  private readonly scene: Phaser.Scene;
  private readonly designWidth: number;
  private readonly designHeight: number;

  private readonly camera = new Camera3D();
  private viewport: ViewportRect = { x: 0, y: 0, w: 0, h: 0 };

  private readonly galaxyContainer: Phaser.GameObjects.Container;

  private readonly systemPositions = new Map<string, Vec3>();
  private centroidX = 0;
  private centroidZ = 0;
  private galaxyHalfExtent = 80;
  private cameraDistanceMin = 50;
  private cameraDistanceMax = 220;

  private readonly starSprites = new Map<string, Phaser.GameObjects.Image>();
  private hyperlanesGfx: Phaser.GameObjects.Graphics | null = null;
  private hyperlaneSegments: HyperlaneSegment[] = [];

  // Reusable scratch vectors so per-frame projection doesn't allocate.
  private readonly scratchNdcA: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly scratchNdcB: Vec3 = { x: 0, y: 0, z: 0 };

  private destroyed = false;

  constructor(opts: GalaxyView2DOptions) {
    this.scene = opts.scene;
    this.designWidth = opts.designWidth;
    this.designHeight = opts.designHeight;

    // Default aspect; setViewport() will overwrite once the viz rect arrives.
    this.camera.aspect = this.designWidth / Math.max(1, this.designHeight);
    this.camera.recompute();

    this.galaxyContainer = this.scene.add.container(0, 0);
  }

  // ── Real implementations ────────────────────────────────────────────────

  setViewport(rect: ViewportRect): void {
    if (this.destroyed) return;
    this.viewport = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
    if (this.viewport.w > 0 && this.viewport.h > 0) {
      this.camera.aspect = this.viewport.w / this.viewport.h;
      this.camera.recompute();
    }
  }

  /**
   * No-op for the Phaser-only renderer — the viewport rect is the source of
   * truth for sizing. Kept on the public surface to match GalaxyView3D.
   */
  setSize(_w: number, _h: number): void {
    // Intentionally empty; see setViewport().
  }

  setGalaxy(
    systems: StarSystem[],
    hyperlanes: Hyperlane[],
    borderPorts: BorderPort[],
    _empires: Empire[],
  ): void {
    if (this.destroyed) return;

    this.computeCentroidAndExtent(systems);
    this.rebuildSystems(systems);
    this.rebuildHyperlanes(hyperlanes, borderPorts);
  }

  update(_dt: number): void {
    if (this.destroyed) return;
    if (this.viewport.w <= 0 || this.viewport.h <= 0) return;

    const viewProj = this.camera.getViewProj();
    const viewMat = this.camera.getView();
    const focalLength = this.viewport.h / (2 * Math.tan(CAMERA_FOV_Y / 2));

    // Stars — project + scale + depth-sort.
    for (const [systemId, sprite] of this.starSprites) {
      const world = this.systemPositions.get(systemId);
      if (!world) {
        sprite.setVisible(false);
        continue;
      }
      const proj = projectToScreenDesignInto(
        this.scratchNdcA,
        world,
        viewProj,
        this.viewport,
      );
      if (!proj.visible) {
        sprite.setVisible(false);
        continue;
      }
      const screenScale = perspectiveScale(world, viewMat, focalLength);
      if (screenScale <= 0) {
        sprite.setVisible(false);
        continue;
      }
      const displaySize = STAR_HALO_WORLD_SIZE * screenScale;
      sprite.setPosition(proj.x, proj.y);
      sprite.setDisplaySize(displaySize, displaySize);
      sprite.setDepth(
        Math.floor(STAR_DEPTH_BASE + proj.depth * STAR_DEPTH_RANGE),
      );
      sprite.setVisible(true);
    }

    // Hyperlanes — single Graphics, redrawn per frame.
    if (this.hyperlanesGfx) {
      this.hyperlanesGfx.clear();
      for (const seg of this.hyperlaneSegments) {
        this.scratchNdcA.x = seg.ax;
        this.scratchNdcA.y = seg.ay;
        this.scratchNdcA.z = seg.az;
        const a = projectToScreenDesignInto(
          this.scratchNdcB, // reuse as ndc scratch
          this.scratchNdcA,
          viewProj,
          this.viewport,
        );
        if (!a.visible) continue;
        // Save endpoint A coords before reusing scratch for B.
        const ax = a.x;
        const ay = a.y;

        this.scratchNdcA.x = seg.bx;
        this.scratchNdcA.y = seg.by;
        this.scratchNdcA.z = seg.bz;
        const b = projectToScreenDesignInto(
          this.scratchNdcB,
          this.scratchNdcA,
          viewProj,
          this.viewport,
        );
        if (!b.visible) continue;

        this.hyperlanesGfx.lineStyle(
          HYPERLANE_LINE_WIDTH,
          seg.color,
          HYPERLANE_LINE_ALPHA,
        );
        this.hyperlanesGfx.lineBetween(ax, ay, b.x, b.y);
      }
    }
  }

  pan(dxScreen: number, dyScreen: number): void {
    if (this.destroyed) return;
    this.camera.pan(dxScreen, dyScreen);
    this.camera.recompute();
  }

  zoom(delta: number): void {
    if (this.destroyed) return;
    this.camera.zoom(delta, this.cameraDistanceMin, this.cameraDistanceMax);
    this.camera.recompute();
  }

  getCameraDistance(): number {
    return this.camera.distance;
  }

  getGalaxyHalfExtent(): number {
    return this.galaxyHalfExtent;
  }

  getSystemWorldPosition(systemId: string): Vec3 | null {
    return this.systemPositions.get(systemId) ?? null;
  }

  projectToScreenDesign(world: Vec3): ProjectedScreen {
    return projectToScreenDesign(
      world,
      this.camera.getViewProj(),
      this.viewport,
    );
  }

  focusOnSystem(systemId: string): void {
    if (this.destroyed) return;
    const pos = this.systemPositions.get(systemId);
    if (!pos) return;
    this.camera.focusOnWorldPoint(pos);
    // Distance: keep galaxy context while zooming toward the target.
    const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    const targetDist = clamp(
      this.galaxyHalfExtent * 0.9 + dist * 0.4,
      this.cameraDistanceMin,
      this.cameraDistanceMax,
    );
    this.camera.distance = targetDist;
    this.camera.recompute();
  }

  /** Phase 1 has no route data; kept on the surface as a no-op. */
  focusOnRoute(_routeId: string): void {
    // No-op until route rendering lands.
  }

  setVisible(visible: boolean): void {
    this.galaxyContainer.setVisible(visible);
  }

  setCanvasOpacity(opacity: number): void {
    const a = clamp(opacity, 0, 1);
    this.galaxyContainer.setAlpha(a);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    for (const sprite of this.starSprites.values()) {
      sprite.destroy();
    }
    this.starSprites.clear();

    if (this.hyperlanesGfx) {
      this.hyperlanesGfx.destroy();
      this.hyperlanesGfx = null;
    }
    this.hyperlaneSegments = [];

    this.galaxyContainer.destroy();

    disposeAllGlowTextures(this.scene);
  }

  // ── Stubs (filled in later phases) ──────────────────────────────────────

  setRoutes(_visuals: RouteTrafficVisual[]): void {
    // Phase 2.
  }

  setShips(
    _visuals: RouteTrafficVisual[],
    _isPlayerOwned: (routeId: string) => boolean,
  ): void {
    // Phase 3.
  }

  setShipsVisible(_v: boolean): void {
    // Phase 3.
  }

  setShipSpeedMultiplier(_m: number): void {
    // Phase 3.
  }

  setHQMarkers3D(_markers: HQMarker3D[]): void {
    // Phase 4.
  }

  setHighlightedSystem(_id: string | null): void {
    // Phase 4.
  }

  setRouteOriginSystem(_id: string | null): void {
    // Phase 4.
  }

  setEmpireHalosVisible(_v: boolean): void {
    // Phase 5.
  }

  setEmpireLabelsVisible(_v: boolean): void {
    // Phase 5.
  }

  setRouteCompanyFilter(_id: string | null): void {
    // Phase 2/3.
  }

  updateSystemLabelLOD(
    _camDist: number,
    _halfExtent: number,
    _on: boolean,
  ): void {
    // Phase 5 (system labels).
  }

  getRouteCurve(_routeId: string): null {
    // Phase 2.
    return null;
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private computeCentroidAndExtent(systems: StarSystem[]): void {
    if (systems.length === 0) {
      this.centroidX = 0;
      this.centroidZ = 0;
      this.galaxyHalfExtent = 80;
      this.cameraDistanceMin = 50;
      this.cameraDistanceMax = 220;
      this.camera.distance = clamp(
        this.galaxyHalfExtent * 1.8,
        this.cameraDistanceMin,
        this.cameraDistanceMax,
      );
      this.camera.recompute();
      return;
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let sumX = 0;
    let sumY = 0;
    for (const s of systems) {
      sumX += s.x;
      sumY += s.y;
      if (s.x < minX) minX = s.x;
      if (s.x > maxX) maxX = s.x;
      if (s.y < minY) minY = s.y;
      if (s.y > maxY) maxY = s.y;
    }
    const cx2D = sumX / systems.length;
    const cy2D = sumY / systems.length;
    this.centroidX = cx2D * COORD_SCALE;
    this.centroidZ = cy2D * COORD_SCALE;
    const halfWidth = ((maxX - minX) / 2) * COORD_SCALE;
    const halfHeight = ((maxY - minY) / 2) * COORD_SCALE;
    this.galaxyHalfExtent = Math.max(20, Math.max(halfWidth, halfHeight));
    this.cameraDistanceMin = Math.max(30, this.galaxyHalfExtent * 0.6);
    this.cameraDistanceMax = this.galaxyHalfExtent * 8;
    this.camera.distance = clamp(
      this.galaxyHalfExtent * 1.8,
      this.cameraDistanceMin,
      this.cameraDistanceMax,
    );
    this.camera.recompute();
  }

  private worldPosFor(system: StarSystem): Vec3 {
    const x = system.x * COORD_SCALE - this.centroidX;
    const z = system.y * COORD_SCALE - this.centroidZ;
    const seed = hashString(system.id);
    const y = ((seed % 1000) / 1000 - 0.5) * 2 * Y_WOBBLE;
    return { x, y, z };
  }

  private rebuildSystems(systems: StarSystem[]): void {
    for (const sprite of this.starSprites.values()) {
      sprite.destroy();
    }
    this.starSprites.clear();
    this.systemPositions.clear();

    for (const sys of systems) {
      const pos = this.worldPosFor(sys);
      this.systemPositions.set(sys.id, pos);

      const key = getStarGlowTexture(this.scene, sys.starColor);
      const img = this.scene.add.image(0, 0, key);
      img.setBlendMode(Phaser.BlendModes.ADD);
      img.setTint(sys.starColor);
      img.setAlpha(STAR_ALPHA);
      img.setVisible(false); // update() will reveal once projected
      this.galaxyContainer.add(img);
      this.starSprites.set(sys.id, img);
    }
  }

  private rebuildHyperlanes(
    hyperlanes: Hyperlane[],
    borderPorts: BorderPort[],
  ): void {
    if (!this.hyperlanesGfx) {
      this.hyperlanesGfx = this.scene.add.graphics();
      this.hyperlanesGfx.setDepth(HYPERLANE_DEPTH);
      this.galaxyContainer.add(this.hyperlanesGfx);
    } else {
      this.hyperlanesGfx.clear();
    }

    this.hyperlaneSegments = [];
    if (hyperlanes.length === 0) return;

    // Lane status by hyperlane id — closed wins over restricted wins over
    // open, matching GalaxyView3D.rebuildHyperlanes.
    const status = new Map<string, "open" | "restricted" | "closed">();
    for (const bp of borderPorts) {
      const cur = status.get(bp.hyperlaneId);
      if (bp.status === "closed" || cur === "closed") {
        status.set(bp.hyperlaneId, "closed");
      } else if (bp.status === "restricted") {
        status.set(bp.hyperlaneId, "restricted");
      } else if (!cur) {
        status.set(
          bp.hyperlaneId,
          bp.status as "open" | "restricted" | "closed",
        );
      }
    }

    for (const hl of hyperlanes) {
      const a = this.systemPositions.get(hl.systemA);
      const b = this.systemPositions.get(hl.systemB);
      if (!a || !b) continue;
      const s = status.get(hl.id) ?? "open";
      const color =
        s === "closed"
          ? HYPERLANE_CLOSED_COLOR
          : s === "restricted"
            ? HYPERLANE_RESTRICTED_COLOR
            : HYPERLANE_OPEN_COLOR;
      this.hyperlaneSegments.push({
        ax: a.x,
        ay: a.y,
        az: a.z,
        bx: b.x,
        by: b.y,
        bz: b.z,
        color,
      });
    }
  }
}

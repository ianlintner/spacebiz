import * as Phaser from "phaser";
import earcut from "earcut";
import type {
  BorderPort,
  Empire,
  Hyperlane,
  StarSystem,
} from "../../data/types.ts";
import type { RouteTrafficVisual } from "../../game/routes/RouteManager.ts";
import {
  SPIRAL_ARMS,
  SPIRAL_ARM_SWEEP,
  SPIRAL_RADIAL_END,
  SPIRAL_RADIAL_START,
} from "../../generation/GalaxyGenerator.ts";
import { CAMERA_FOV_Y, Camera3D } from "./Camera3D.ts";
import type { Mat4 } from "./Camera3D.ts";
import { Background2D } from "./Background2D.ts";
import { HyperGates2D } from "./HyperGates2D.ts";
import { Traffic2D } from "./Traffic2D.ts";
import { Planets2D } from "./Planets2D.ts";
import { Routes2D } from "./Routes2D.ts";
import { Ships2D } from "./Ships2D.ts";
import { disposeAllGlowTextures, getStarGlowTexture } from "./GlowTextures.ts";
import {
  perspectiveScale,
  projectToScreenDesign,
  projectToScreenDesignInto,
  softCapSize,
} from "./projection.ts";
import type { ProjectedScreen, Vec3, ViewportRect } from "./types.ts";

// Phaser-only galaxy renderer — coordinator layer.
// Math sub-modules: Camera3D + projection.ts (parity-tested to 0.01px vs Three.js).
// Rendering sub-modules: Routes2D, Ships2D, Background2D.

const COORD_SCALE = 0.224; // ~40% more spacing between systems
const Y_WOBBLE = 8;

// Star size by color: white dwarfs are small, blue giants are large.
const STAR_SIZE_BY_COLOR: Record<number, number> = {
  0xffffff: 0.8, // white dwarf = small
  0x88aaff: 1.8, // blue giant = large
  0xff8866: 1.0, // orange-red = medium
  0xffcc88: 1.0, // golden yellow = medium
  0xffffee: 1.0, // warm yellow = medium
  0xffaa44: 1.0, // orange K-type = medium
};

function getStarSizeMultiplier(starColor: number): number {
  return STAR_SIZE_BY_COLOR[starColor] ?? 1.0;
}

const HYPERLANE_OPEN_COLOR = 0x6dc8ff;
const HYPERLANE_RESTRICTED_COLOR = 0xffaa00;
const HYPERLANE_CLOSED_COLOR = 0xff4444;
const HYPERLANE_LINE_WIDTH = 1.2;
const HYPERLANE_LINE_ALPHA = 0.5;
const HYPERLANE_DEPTH = 300;

const STAR_HALO_WORLD_SIZE = 1.5;
const STAR_ALPHA = 0.95;
// Soft cap on rendered star halo size in pixels. Stars below this size scale
// linearly with perspective; above this they grow logarithmically so the halo
// never fills the viewport at close zoom.
const STAR_DISPLAY_SOFT_CAP_PX = 220;
const STAR_DEPTH_BASE = 800;
const STAR_DEPTH_RANGE = -10;

// System name labels — billboarded above each star, hidden when far out.
const SYSTEM_LABEL_DEPTH = 850;
const SYSTEM_LABEL_DEFAULT_VISIBLE = true;

// Empire name labels — large, faint, centered on each empire's territory.
const EMPIRE_LABEL_DEPTH = 700;

// Empire territory polygons — colored borders only (no fill). The "3D bubble"
// look comes from the additive empire halos in Background2D; this is just a
// thin colored outline so each empire's region reads at a glance.
const TERRITORY_DEPTH = 140; // above nebulae/halos so the border isn't lost

// Hysteresis thresholds for entering/leaving "system mode" (only the focused
// star + its planets render; galaxy-scale chrome hides). Enter at 8 so the
// default fly-to landing distance of 6 triggers system view reliably; exit
// at 15 gives a wide sticky range so small zoom-outs don't flicker the LOD.
const SYSTEM_MODE_ENTER_DISTANCE = 8;
const SYSTEM_MODE_EXIT_DISTANCE = 15;

// HQ markers — sprite above the home system. Hidden in system view.
const HQ_MARKER_DEPTH = 880;
const HQ_MARKER_Y_OFFSET_WORLD = 2.4;
const HQ_MARKER_WORLD_SIZE = 2;

// Station — player HQ orbiting body shown in system mode.
// Orbit at 3.8 world units: outside max planet orbit (3.0) but inside hyper gates (4.2).
const STATION_DEPTH = 840;
const STATION_ORBIT_DEPTH = 755; // just below planet orbit rings (760)
const STATION_ORBIT_RADIUS = 3.8;
const STATION_WORLD_RADIUS = 0.2; // physical display size, independent of orbit
const STATION_SIZE_PX_MIN = 12;
const STATION_SIZE_PX_CAP = 30;

// Highlight + origin rings — drawn under stars but above hyperlanes.
const RING_DEPTH = 750;

const HQ_MARKER_TEX_PLAYER = "galaxy2d:hq-marker:player";
const HQ_MARKER_TEX_RIVAL = "galaxy2d:hq-marker:rival";

/**
 * Build a small chevron icon as a canvas texture, cached per (player|rival).
 * The player marker is bright cyan-white; rivals are muted gold.
 */
function getOrCreateHQMarkerTexture(
  scene: Phaser.Scene,
  isPlayer: boolean,
): string {
  const key = isPlayer ? HQ_MARKER_TEX_PLAYER : HQ_MARKER_TEX_RIVAL;
  if (scene.textures.exists(key)) return key;

  const size = 32;
  const tex = scene.textures.createCanvas(key, size, size);
  if (!tex) return key;
  const ctx = tex.getContext();
  const fill = isPlayer
    ? "rgba(180, 240, 255, 0.95)"
    : "rgba(210, 170, 80, 0.9)";
  const stroke = "rgba(0, 0, 0, 0.85)";

  // Downward-pointing chevron — wide top edge tapers to a point at the bottom.
  ctx.beginPath();
  ctx.moveTo(4, 6);
  ctx.lineTo(size - 4, 6);
  ctx.lineTo(size / 2, size - 4);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();

  tex.refresh();
  return key;
}

export interface GalaxyView2DOptions {
  scene: Phaser.Scene;
  designWidth: number;
  designHeight: number;
}

// Structurally identical to GalaxyView3D.HQMarker3D so the duck type works.
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
  private readonly systemColors = new Map<string, number>();
  private readonly systemEmpireIds = new Map<string, string>();
  private readonly empireColors = new Map<string, number>();
  private accessibleEmpireIds: Set<string> = new Set();
  // Per-system label suppression set by the grid-collision pass in GalaxyMapScene.
  private suppressedSystemLabels: Set<string> = new Set();
  private centroidX = 0;
  private centroidZ = 0;
  private galaxyHalfExtent = 80;
  private cameraDistanceMin = 8;
  private cameraDistanceMax = 220;

  private readonly starSprites = new Map<string, Phaser.GameObjects.Image>();
  private hyperlanesGfx: Phaser.GameObjects.Graphics | null = null;
  private hyperlaneSegments: HyperlaneSegment[] = [];

  // Per-system text label, billboarded above the star. Visibility flips with
  // camera distance + the user's "Names" toggle (see updateSystemLabelLOD).
  private readonly systemLabels = new Map<string, Phaser.GameObjects.Text>();
  private systemLabelsVisible = SYSTEM_LABEL_DEFAULT_VISIBLE;

  // Per-empire centroid + label. Centroids are computed when halos are built
  // and reused for label positioning so the two stay aligned.
  private readonly empireCentroids = new Map<string, Vec3>();
  private readonly empireLabels = new Map<string, Phaser.GameObjects.Text>();
  private empireLabelsVisible = true;
  private hyperlanesVisible = true;
  private systemsVisible = true;

  // HQ markers — small chevron sprites above home systems.
  private readonly hqMarkerSprites: Phaser.GameObjects.Image[] = [];
  private readonly hqMarkerSystemIds: string[] = [];

  // Empire territory polygons (Voronoi cells) — translucent fills.
  private fillTerritoryGfx: Phaser.GameObjects.Graphics | null = null;
  private territoryGfx: Phaser.GameObjects.Graphics | null = null;
  private territoryPolygons: Array<{
    color: number;
    worldVerts: Array<{ x: number; y: number; z: number }>;
    triangleIndices: number[];
    // Pre-computed polygon centroid + max vertex radius for centroid-fade fills.
    polyCx: number;
    polyCz: number;
    polyMaxR: number;
  }> = [];

  // Highlight (white) and route-origin (teal) rings, drawn via a single Graphics.
  private ringsGfx: Phaser.GameObjects.Graphics | null = null;
  private highlightSystemId: string | null = null;
  private originSystemId: string | null = null;

  private readonly routes: Routes2D;
  private readonly ships: Ships2D;
  private readonly background: Background2D;
  private readonly planets: Planets2D;
  private readonly gates: HyperGates2D;
  private readonly traffic: Traffic2D;

  // Station — the player's HQ orbits its home star in system view.
  private playerHQSystemId: string | null = null;
  private hubLevel = 1;
  private stationSprite: Phaser.GameObjects.Image | null = null;
  private stationHitbox: Phaser.GameObjects.Zone | null = null;
  private stationOrbitGfx: Phaser.GameObjects.Graphics | null = null;
  private stationHoverHandler: ((hovered: boolean) => void) | null = null;
  private stationClickHandler: (() => void) | null = null;
  private readonly scratchStationNdc: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly scratchStationWorld: Vec3 = { x: 0, y: 0, z: 0 };

  // System view mode — set when camera zooms inside a star (distance crosses
  // SYSTEM_MODE_ENTER_DISTANCE), released when it pulls back past
  // SYSTEM_MODE_EXIT_DISTANCE. The hysteresis gap prevents flicker on small
  // zoom-out movements inside a system. Only the focused star + its planets
  // render when this is true.
  private focusedSystemId: string | null = null;
  private inSystemMode = false;

  // 3D-projected background star field — distant stars that parallax naturally
  // through perspective. Each star has a parallax factor (0..1): 0 means it
  // follows the camera (infinity/skybox feel), 1 means it's fixed in world
  // (rotates fully with the galaxy). Mid-range gives true parallax depth.
  private bgStarsGfx: Phaser.GameObjects.Graphics | null = null;
  private bgStarPositions: Vec3[] = [];
  private bgStarAlphas: number[] = [];
  private bgStarRadii: number[] = [];
  private bgStarColors: number[] = [];
  private bgStarParallax: number[] = [];
  private readonly scratchBgStarPos: Vec3 = { x: 0, y: 0, z: 0 };

  // Reusable scratch vectors — stars + hyperlane projection only (sub-modules own theirs).
  private readonly scratchNdcA: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly scratchNdcB: Vec3 = { x: 0, y: 0, z: 0 };

  private destroyed = false;
  private flyToTween: Phaser.Tweens.Tween | null = null;

  constructor(opts: GalaxyView2DOptions) {
    this.scene = opts.scene;
    this.designWidth = opts.designWidth;
    this.designHeight = opts.designHeight;

    this.camera.aspect = this.designWidth / Math.max(1, this.designHeight);
    this.camera.recompute();

    this.galaxyContainer = this.scene.add.container(0, 0);

    this.background = new Background2D(this.scene, this.galaxyContainer);
    this.buildParallaxLayers();
    this.routes = new Routes2D(
      this.scene,
      this.galaxyContainer,
      this.systemPositions,
    );
    this.ships = new Ships2D(this.scene, this.galaxyContainer, (id) =>
      this.routes.getCurve(id),
    );
    this.planets = new Planets2D(this.scene, this.galaxyContainer);
    this.gates = new HyperGates2D(this.scene, this.galaxyContainer);
    this.traffic = new Traffic2D(this.scene, this.galaxyContainer);
  }

  private buildParallaxLayers(): void {
    // Background star field — Graphics with ~800 randomly positioned stars
    // in 3D world space. Parallax happens automatically via perspective.
    this.bgStarsGfx = this.scene.add.graphics();
    this.bgStarsGfx.setDepth(15);
    this.galaxyContainer.add(this.bgStarsGfx);

    this.generateBackgroundStars();
  }

  private generateBackgroundStars(): void {
    // Seeded RNG so the starfield is stable across rebuilds.
    let seed = 0x9e3779b1;
    const rng = (): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };

    this.bgStarPositions = [];
    this.bgStarAlphas = [];
    this.bgStarRadii = [];
    this.bgStarColors = [];
    this.bgStarParallax = [];

    // Generate 600 stars in a wide cylindrical volume around the galaxy.
    // Radius is large so stars surround the camera at any zoom level.
    const STAR_COUNT = 600;
    const FIELD_RADIUS = 600; // wide volume in world units
    const FIELD_HEIGHT = 200;

    // Tinted color palette — mostly white, occasionally bluish or yellowish.
    const colors = [
      0xffffff,
      0xffffff,
      0xffffff,
      0xffffff,
      0xffffff, // white (most)
      0xeef0ff,
      0xeef0ff, // pale blue-white
      0xffeedd, // pale yellow
      0xddeeff, // pale blue
    ];

    for (let i = 0; i < STAR_COUNT; i++) {
      // Distribute on a disc with some height variance
      const angle = rng() * Math.PI * 2;
      // Skip the inner galaxy area so bg stars don't overlap with system stars
      const r = 80 + rng() * (FIELD_RADIUS - 80);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = (rng() - 0.5) * FIELD_HEIGHT;

      // Size and brightness — most are very dim, a few brighter highlights.
      const brightnessRoll = rng();
      const alpha =
        brightnessRoll < 0.7
          ? 0.15 + rng() * 0.2 // 70%: dim
          : brightnessRoll < 0.95
            ? 0.4 + rng() * 0.3 // 25%: medium
            : 0.7 + rng() * 0.3; // 5%: bright

      const sizeRoll = rng();
      const radius =
        sizeRoll < 0.85
          ? 0.4 + rng() * 0.4 // tiny
          : 0.9 + rng() * 0.6; // larger highlight stars

      // Parallax factor: 0 = pure skybox (no movement), 1 = full world parallax.
      // Most stars are skybox-like (low parallax), a few feel mid-distance.
      const parallaxRoll = rng();
      const parallax =
        parallaxRoll < 0.7
          ? 0.05 + rng() * 0.1 // 70%: very far, near-static
          : parallaxRoll < 0.95
            ? 0.15 + rng() * 0.15 // 25%: mid-distance
            : 0.3 + rng() * 0.2; // 5%: nearer, more parallax

      this.bgStarPositions.push({ x, y, z });
      this.bgStarAlphas.push(alpha);
      this.bgStarRadii.push(radius);
      this.bgStarColors.push(colors[Math.floor(rng() * colors.length)]);
      this.bgStarParallax.push(parallax);
    }

    // Spiral-arm dust stars — dense field of dim stars laid along the same
    // logarithmic spiral arms the empires sit on. These have parallax = 1
    // (full world space) so they rotate with the galaxy and reinforce the
    // 2-arm structure visually.
    this.generateSpiralDustStars(rng, colors);
  }

  private generateSpiralDustStars(rng: () => number, colors: number[]): void {
    const DUST_PER_ARM = 600;
    const galaxyRadius = this.galaxyHalfExtent || 80;

    for (let arm = 0; arm < SPIRAL_ARMS; arm++) {
      const armOffset = (arm / SPIRAL_ARMS) * Math.PI * 2;
      for (let i = 0; i < DUST_PER_ARM; i++) {
        const t = i / DUST_PER_ARM;
        // Tangential jitter — stars don't sit exactly on the arm centerline.
        const tangentJitter = (rng() - 0.5) * 0.35;
        const angle = armOffset + t * SPIRAL_ARM_SWEEP + tangentJitter;
        // Radial jitter — perpendicular thickness of the arm band.
        const baseR =
          SPIRAL_RADIAL_START + t * (SPIRAL_RADIAL_END - SPIRAL_RADIAL_START);
        // Arms are thicker at the outside, thinner at the core.
        const armThickness = 0.06 + t * 0.1;
        const radialJitter = (rng() - 0.5) * armThickness * 2;
        const r = (baseR + radialJitter) * galaxyRadius;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const y = (rng() - 0.5) * 4; // thin disc

        // Mostly very dim — these are dust, not features.
        const alpha = 0.1 + rng() * 0.18;
        const radius = 0.3 + rng() * 0.35;

        this.bgStarPositions.push({ x, y, z });
        this.bgStarAlphas.push(alpha);
        this.bgStarRadii.push(radius);
        this.bgStarColors.push(colors[Math.floor(rng() * colors.length)]);
        // parallax = 1 → these stars are firmly in the galaxy disc and move with it
        this.bgStarParallax.push(1);
      }
    }
  }

  // ── Real implementations ────────────────────────────────────────────────

  setViewport(rect: ViewportRect): void {
    if (this.destroyed) return;
    this.viewport = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
    if (this.viewport.w > 0 && this.viewport.h > 0) {
      this.camera.aspect = this.viewport.w / this.viewport.h;
      this.camera.recompute();
      this.background.rebuildStarfield(this.viewport);
    }
  }

  setSize(_w: number, _h: number): void {
    // Intentionally empty; setViewport() is the source of truth for sizing.
  }

  setGalaxy(
    systems: StarSystem[],
    hyperlanes: Hyperlane[],
    borderPorts: BorderPort[],
    empires: Empire[],
  ): void {
    if (this.destroyed) return;

    // Cache empire colors and per-system empire id so labels can be tinted.
    this.empireColors.clear();
    for (const emp of empires) this.empireColors.set(emp.id, emp.color);
    this.systemEmpireIds.clear();
    for (const sys of systems) this.systemEmpireIds.set(sys.id, sys.empireId);

    this.computeCentroidAndExtent(systems);
    this.rebuildSystems(systems);
    this.rebuildHyperlanes(hyperlanes, borderPorts);

    // System world positions are centered at origin (worldPosFor subtracts
    // the centroid), so the core and nebulae anchor at (0, 0) — not at the
    // game-space centroid which would put them far from the systems.
    this.background.buildGalacticCore(this.galaxyHalfExtent, 0, 0);
    // Regenerate bg stars now that we know the actual galaxy extent. The
    // spiral dust stars depend on `galaxyHalfExtent` to align with the arms.
    this.generateBackgroundStars();
    this.background.buildNebulae(this.galaxyHalfExtent, 0, 0);
    this.background.buildEmpireHalos(systems, empires, this.systemPositions);
    this.background.buildTerritoryGlows(systems, empires, this.systemPositions);

    this.computeEmpireCentroids(systems, empires);
    this.rebuildEmpireLabels(empires);
    this.rebuildTerritoryPolygons(empires);

    this.gates.setData(hyperlanes, systems, this.systemPositions);
    this.traffic.setGalaxyData(hyperlanes, this.systemPositions);
  }

  private rebuildTerritoryPolygons(empires: Empire[]): void {
    this.territoryPolygons = [];

    if (!this.fillTerritoryGfx) {
      this.fillTerritoryGfx = this.scene.add.graphics();
      this.fillTerritoryGfx.setDepth(TERRITORY_DEPTH - 1);
      this.galaxyContainer.add(this.fillTerritoryGfx);
    } else {
      this.fillTerritoryGfx.clear();
    }
    if (!this.territoryGfx) {
      this.territoryGfx = this.scene.add.graphics();
      this.territoryGfx.setDepth(TERRITORY_DEPTH);
      this.galaxyContainer.add(this.territoryGfx);
    } else {
      this.territoryGfx.clear();
    }

    for (const emp of empires) {
      const poly = emp.territoryPolygon;
      if (!poly || poly.vertices.length < 3) continue;
      const worldVerts = poly.vertices.map((v) => ({
        x: v.x * COORD_SCALE - this.centroidX,
        y: -0.6,
        z: v.y * COORD_SCALE - this.centroidZ,
      }));

      const flatCoords: number[] = [];
      for (const wv of worldVerts) {
        flatCoords.push(wv.x, wv.z);
      }
      const triangleIndices = earcut(flatCoords);

      // Polygon centroid + max radius for centroid-based fill fade.
      let sumCx = 0;
      let sumCz = 0;
      for (const wv of worldVerts) {
        sumCx += wv.x;
        sumCz += wv.z;
      }
      const polyCx = sumCx / worldVerts.length;
      const polyCz = sumCz / worldVerts.length;
      let polyMaxR = 0;
      for (const wv of worldVerts) {
        const d = Math.sqrt((wv.x - polyCx) ** 2 + (wv.z - polyCz) ** 2);
        if (d > polyMaxR) polyMaxR = d;
      }

      this.territoryPolygons.push({
        color: emp.color,
        worldVerts,
        triangleIndices,
        polyCx,
        polyCz,
        polyMaxR,
      });
    }
  }

  update(dt: number): void {
    if (this.destroyed) return;
    if (this.viewport.w <= 0 || this.viewport.h <= 0) return;

    const viewProj = this.camera.getViewProj();
    const viewMat = this.camera.getView();
    const focalLength = this.viewport.h / (2 * Math.tan(CAMERA_FOV_Y / 2));

    // System view LOD with hysteresis: enter when zoomed tight, exit only when
    // pulled clearly back. Without the gap, small zoom-out wiggles inside a
    // system would flicker the galaxy chrome back on every frame.
    const hasFocus =
      this.focusedSystemId !== null &&
      this.systemPositions.has(this.focusedSystemId);
    if (!hasFocus) {
      this.inSystemMode = false;
    } else if (
      !this.inSystemMode &&
      this.camera.distance < SYSTEM_MODE_ENTER_DISTANCE
    ) {
      this.inSystemMode = true;
    } else if (
      this.inSystemMode &&
      this.camera.distance > SYSTEM_MODE_EXIT_DISTANCE
    ) {
      this.inSystemMode = false;
    }
    const systemMode = this.inSystemMode;

    // Stars — project + scale + depth-sort. Also projects co-located labels
    // (system name above star, HQ marker further above) using the same screen
    // anchor so they track perfectly.
    for (const [systemId, sprite] of this.starSprites) {
      // In system mode, hide every star except the one being focused.
      if (systemMode && systemId !== this.focusedSystemId) {
        sprite.setVisible(false);
        this.systemLabels.get(systemId)?.setVisible(false);
        continue;
      }
      const world = this.systemPositions.get(systemId);
      if (!world) {
        sprite.setVisible(false);
        this.systemLabels.get(systemId)?.setVisible(false);
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
        this.systemLabels.get(systemId)?.setVisible(false);
        continue;
      }
      const screenScale = perspectiveScale(world, viewMat, focalLength);
      if (screenScale <= 0) {
        sprite.setVisible(false);
        this.systemLabels.get(systemId)?.setVisible(false);
        continue;
      }
      const starColor = this.systemColors.get(systemId) ?? 0xffffff;
      const sizeMultiplier = getStarSizeMultiplier(starColor);
      // Single continuous formula: perspective-scale, then soft-cap so the
      // halo doesn't fill the viewport at close zoom. Planets + orbits use
      // the same softCapSize pattern so their ratio to the star stays
      // consistent at every zoom level.
      const desiredSize = STAR_HALO_WORLD_SIZE * sizeMultiplier * screenScale;
      const displaySize = softCapSize(desiredSize, STAR_DISPLAY_SOFT_CAP_PX);
      sprite.setPosition(proj.x, proj.y);
      sprite.setDisplaySize(displaySize, displaySize);
      sprite.setDepth(
        Math.floor(STAR_DEPTH_BASE + proj.depth * STAR_DEPTH_RANGE),
      );
      // Smooth alpha taper: full bright at galactic distances, gently dimmed
      // at close zoom so the halo doesn't blow out the system view.
      const alphaTaper = clamp(this.camera.distance / 10, 0.7, 1.0);
      sprite.setAlpha(STAR_ALPHA * alphaTaper);
      sprite.setVisible(this.systemsVisible);

      const label = this.systemLabels.get(systemId);
      if (label && this.systemLabelsVisible && this.systemsVisible) {
        // Float the label above the star halo. Offset shrinks with screenScale
        // so it stays anchored as the camera pulls back.
        const offset = displaySize * 0.55;
        label.setPosition(proj.x, proj.y - offset);
        // Scale label with perspective so it shrinks/grows with zoom.
        // Clamped so text never gets unreadably small or comically huge.
        const labelScale = Phaser.Math.Clamp(screenScale * 0.45, 0.65, 1.4);
        label.setScale(labelScale);
        // Fade label alpha based on camera distance: full opacity when close,
        // fade out as camera pulls back.
        const camDist = this.camera.distance;
        const fadeStart = this.galaxyHalfExtent * 1.3;
        const fadeEnd = this.galaxyHalfExtent * 1.6;
        let labelAlpha = 1;
        if (camDist > fadeStart) {
          labelAlpha = Math.max(
            0,
            1 - (camDist - fadeStart) / (fadeEnd - fadeStart),
          );
        }
        label.setAlpha(labelAlpha * 0.85);
        label.setVisible(!this.suppressedSystemLabels.has(systemId));
      } else if (label) {
        label.setVisible(false);
      }
    }

    // Empire labels — projected at empire centroid, depth-sorted behind stars.
    for (const [empireId, label] of this.empireLabels) {
      if (!this.empireLabelsVisible) {
        label.setVisible(false);
        continue;
      }
      const centroid = this.empireCentroids.get(empireId);
      if (!centroid) {
        label.setVisible(false);
        continue;
      }
      const proj = projectToScreenDesignInto(
        this.scratchNdcA,
        centroid,
        viewProj,
        this.viewport,
      );
      if (!proj.visible) {
        label.setVisible(false);
        continue;
      }
      // Fade empire labels: visible at mid-zoom, fade at close AND far zoom.
      const camDist = this.camera.distance;
      const closeZoomFadeEnd = this.galaxyHalfExtent * 0.8;
      const farZoomFadeStart = this.galaxyHalfExtent * 1.2;
      const farZoomFadeEnd = this.galaxyHalfExtent * 1.5;
      let empireAlpha = 1;
      if (camDist < closeZoomFadeEnd) {
        empireAlpha = Math.max(0, camDist / closeZoomFadeEnd);
      } else if (camDist > farZoomFadeStart) {
        empireAlpha = Math.max(
          0,
          1 -
            (camDist - farZoomFadeStart) / (farZoomFadeEnd - farZoomFadeStart),
        );
      }
      // Scale empire labels with perspective so they shrink at zoom-out.
      const empireScreenScale = perspectiveScale(
        centroid,
        viewMat,
        focalLength,
      );
      const empireLabelScale = Phaser.Math.Clamp(
        empireScreenScale * 0.5,
        0.6,
        1.6,
      );
      label.setScale(empireLabelScale);
      label.setPosition(proj.x, proj.y);
      label.setAlpha(empireAlpha);
      label.setVisible(empireAlpha > 0.01);
    }

    // HQ markers — projected above the home system. Hidden in system view
    // because the station orbit replaces them as the in-system indicator.
    for (let i = 0; i < this.hqMarkerSprites.length; i++) {
      const sprite = this.hqMarkerSprites[i];
      if (systemMode) {
        sprite.setVisible(false);
        continue;
      }
      const sysId = this.hqMarkerSystemIds[i];
      const world = this.systemPositions.get(sysId);
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
      const scale = perspectiveScale(world, viewMat, focalLength);
      if (scale <= 0) {
        sprite.setVisible(false);
        continue;
      }
      const size = HQ_MARKER_WORLD_SIZE * scale;
      sprite.setPosition(proj.x, proj.y - HQ_MARKER_Y_OFFSET_WORLD * scale);
      sprite.setDisplaySize(size, size);
      sprite.setDepth(HQ_MARKER_DEPTH);
      sprite.setVisible(true);
    }

    // Highlight + origin rings — redrawn each frame at projected positions.
    if (this.ringsGfx) {
      this.ringsGfx.clear();
      const drawRing = (
        sysId: string | null,
        outerColor: number,
        outerAlpha: number,
      ): void => {
        if (!sysId) return;
        const world = this.systemPositions.get(sysId);
        if (!world) return;
        const proj = projectToScreenDesignInto(
          this.scratchNdcA,
          world,
          viewProj,
          this.viewport,
        );
        if (!proj.visible) return;
        const scale = perspectiveScale(world, viewMat, focalLength);
        if (scale <= 0) return;
        const r = STAR_HALO_WORLD_SIZE * 0.7 * scale;
        this.ringsGfx!.lineStyle(2.4, outerColor, outerAlpha);
        this.ringsGfx!.strokeCircle(proj.x, proj.y, r);
      };
      drawRing(this.highlightSystemId, 0xffffff, 0.85);
      drawRing(this.originSystemId, 0x4dd0e1, 0.9);
    }

    // Empire territories are now rendered as per-star tinted glow sprites
    // (Background2D.territoryGlows). The polygon-fill approach is gone because
    // flat-shaded triangles can't avoid geometric edges. Per-star glows blend
    // additively into organic clouds whose shape follows the actual star
    // distribution — no polygon, no edges, no triangulation artifacts.
    this.fillTerritoryGfx?.clear();
    this.territoryGfx?.clear();

    // Hyperlanes — redrawn per frame. Hidden entirely in system view.
    if (this.hyperlanesGfx) {
      this.hyperlanesGfx.clear();
      if (this.hyperlanesVisible && !systemMode) {
        for (const seg of this.hyperlaneSegments) {
          this.scratchNdcA.x = seg.ax;
          this.scratchNdcA.y = seg.ay;
          this.scratchNdcA.z = seg.az;
          const a = projectToScreenDesignInto(
            this.scratchNdcB,
            this.scratchNdcA,
            viewProj,
            this.viewport,
          );
          if (!a.visible) continue;
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

    // Background (nebulae + empire halos + territory glows). In system mode,
    // tell Background2D to suppress galaxy-scale chrome; we want a clean
    // single-system view.
    this.background.setSystemMode(systemMode);
    this.background.update(viewProj, viewMat, focalLength, this.viewport);

    // Parallax star layers — always visible (deep-space backdrop).
    this.renderBackgroundStars(viewProj);

    // Routes + ships — galaxy-scale entities, hidden in system mode.
    if (!systemMode) {
      this.routes.render(viewProj, this.viewport);
      this.ships.update(
        dt,
        viewProj,
        viewMat,
        focalLength,
        this.viewport,
        this.camera.distance,
        this.galaxyHalfExtent,
      );
    } else {
      this.routes.clear();
      this.ships.setVisible(false);
    }

    // Planets — only the focused system's planets render, others stay hidden.
    this.planets.setFocusedSystem(systemMode ? this.focusedSystemId : null);
    this.planets.update(
      0, // turn — visual-only; real-time drift carries the animation
      this.scene.time.now / 1000,
      viewProj,
      viewMat,
      focalLength,
      this.viewport,
    );

    // Hyperlane gates — visible only in system mode, one per connected lane.
    this.gates.setFocusedSystem(systemMode ? this.focusedSystemId : null);
    this.gates.update(
      viewProj,
      viewMat,
      focalLength,
      this.viewport,
      systemMode,
    );

    this.traffic.update(
      viewProj,
      viewMat,
      focalLength,
      this.viewport,
      systemMode,
      this.focusedSystemId,
      this.planets.getFocusedPlanetWorldPositions(),
    );

    // Station orbit — player HQ system only, replaces the chevron in close view.
    this.updateStationVisual(systemMode, viewProj, viewMat, focalLength);
  }

  private renderBackgroundStars(viewProj: Mat4): void {
    if (!this.bgStarsGfx) return;
    this.bgStarsGfx.clear();

    const camPos = this.camera.getPosition();
    const sp = this.scratchBgStarPos;

    for (let i = 0; i < this.bgStarPositions.length; i++) {
      const pos = this.bgStarPositions[i];
      const parallax = this.bgStarParallax[i];

      // Add a fraction of camera position to star: low parallax means star
      // follows camera (skybox feel), high parallax means star stays put in
      // world (full parallax with galaxy).
      const follow = 1 - parallax;
      sp.x = pos.x + camPos.x * follow;
      sp.y = pos.y + camPos.y * follow;
      sp.z = pos.z + camPos.z * follow;

      const proj = projectToScreenDesignInto(
        this.scratchNdcA,
        sp,
        viewProj,
        this.viewport,
      );
      if (!proj.visible) continue;

      this.bgStarsGfx.fillStyle(this.bgStarColors[i], this.bgStarAlphas[i]);
      this.bgStarsGfx.fillCircle(proj.x, proj.y, this.bgStarRadii[i]);
    }
  }

  private updateStationVisual(
    systemMode: boolean,
    viewProj: Mat4,
    viewMat: Mat4,
    focalLength: number,
  ): void {
    const show =
      systemMode &&
      this.focusedSystemId !== null &&
      this.focusedSystemId === this.playerHQSystemId;

    if (!show) {
      this.stationSprite?.setVisible(false);
      this.stationHitbox?.setVisible(false);
      this.stationOrbitGfx?.clear();
      return;
    }

    const systemPos = this.systemPositions.get(this.focusedSystemId!)!;

    // Lazily create station objects on first system-view entry.
    const stationKey = `station:level${this.hubLevel}`;
    if (!this.stationSprite) {
      this.stationSprite = this.scene.add.image(0, 0, stationKey);
      this.stationSprite.setDepth(STATION_DEPTH);
      this.stationSprite.setVisible(false);
      this.galaxyContainer.add(this.stationSprite);
    } else {
      this.stationSprite.setTexture(stationKey);
    }
    if (!this.stationHitbox) {
      this.stationHitbox = this.scene.add.zone(0, 0, 40, 40);
      this.stationHitbox.setInteractive({ useHandCursor: true });
      this.stationHitbox.setDepth(STATION_DEPTH + 10);
      this.stationHitbox.on("pointerover", () =>
        this.stationHoverHandler?.(true),
      );
      this.stationHitbox.on("pointerout", () =>
        this.stationHoverHandler?.(false),
      );
      this.stationHitbox.on("pointerup", () => this.stationClickHandler?.());
      this.galaxyContainer.add(this.stationHitbox);
    }
    if (!this.stationOrbitGfx) {
      this.stationOrbitGfx = this.scene.add.graphics();
      this.stationOrbitGfx.setDepth(STATION_ORBIT_DEPTH);
      this.galaxyContainer.add(this.stationOrbitGfx);
    }

    // Slow real-time orbit — one revolution per 80 s.
    const t = this.scene.time.now / 1000;
    const angle = (t / 80) * Math.PI * 2;
    this.scratchStationWorld.x =
      systemPos.x + Math.cos(angle) * STATION_ORBIT_RADIUS;
    this.scratchStationWorld.y = systemPos.y;
    this.scratchStationWorld.z =
      systemPos.z + Math.sin(angle) * STATION_ORBIT_RADIUS;

    const proj = projectToScreenDesignInto(
      this.scratchStationNdc,
      this.scratchStationWorld,
      viewProj,
      this.viewport,
    );
    const scale = perspectiveScale(
      this.scratchStationWorld,
      viewMat,
      focalLength,
    );

    if (!proj.visible || scale <= 0) {
      this.stationSprite.setVisible(false);
      this.stationHitbox?.setVisible(false);
      this.stationOrbitGfx.clear();
      return;
    }

    const size = Math.max(
      STATION_SIZE_PX_MIN,
      softCapSize(STATION_WORLD_RADIUS * 2 * scale, STATION_SIZE_PX_CAP),
    );
    this.stationSprite.setPosition(proj.x, proj.y);
    this.stationSprite.setDisplaySize(size, size);
    this.stationSprite.setVisible(true);

    if (this.stationHitbox) {
      const hitSize = size + 16;
      this.stationHitbox.setPosition(proj.x, proj.y);
      this.stationHitbox.setSize(hitSize, hitSize);
      this.stationHitbox.setVisible(true);
    }

    // Draw station orbit ring — lighter style than planet rings.
    this.stationOrbitGfx.clear();
    this.stationOrbitGfx.lineStyle(1, 0x88ccff, 0.28);
    const SEGS = 64;
    let prevX = 0;
    let prevY = 0;
    let prevVis = false;
    for (let i = 0; i <= SEGS; i++) {
      const a = (i / SEGS) * Math.PI * 2;
      this.scratchStationWorld.x =
        systemPos.x + Math.cos(a) * STATION_ORBIT_RADIUS;
      this.scratchStationWorld.y = systemPos.y;
      this.scratchStationWorld.z =
        systemPos.z + Math.sin(a) * STATION_ORBIT_RADIUS;
      const p = projectToScreenDesignInto(
        this.scratchStationNdc,
        this.scratchStationWorld,
        viewProj,
        this.viewport,
      );
      if (i > 0 && prevVis && p.visible) {
        this.stationOrbitGfx.lineBetween(prevX, prevY, p.x, p.y);
      }
      prevX = p.x;
      prevY = p.y;
      prevVis = p.visible;
    }
  }

  pan(dxScreen: number, dyScreen: number): void {
    if (this.destroyed) return;
    this.camera.pan(dxScreen, dyScreen);
    this.camera.recompute();
  }

  /**
   * Translate the camera target (move the view in X/Y on the disc plane).
   * dx/dy are in screen-aligned units; magnitude scales with camera distance
   * so the feel is consistent at any zoom. Target is clamped to the galaxy
   * extent so the user can't pan off into empty space.
   */
  translate(dxScreen: number, dyScreen: number): void {
    if (this.destroyed) return;
    const scale = this.camera.distance / 120;
    this.camera.translate(dxScreen * scale, dyScreen * scale);
    // Clamp target to the galaxy disc with a small breathing margin.
    const limit = this.galaxyHalfExtent * 1.1;
    this.camera.targetX = clamp(this.camera.targetX, -limit, limit);
    this.camera.targetZ = clamp(this.camera.targetZ, -limit, limit);
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

  focusOnSystem(systemId: string, zoomedIn = false): void {
    if (this.destroyed) return;
    const pos = this.systemPositions.get(systemId);
    if (!pos) return;
    // Translate the camera target onto the system so it's centered on screen.
    this.camera.targetX = pos.x;
    this.camera.targetZ = pos.z;
    if (zoomedIn) {
      // Tight zoom for "start on homeworld" — see ~30% of galaxy.
      this.camera.distance = clamp(
        this.galaxyHalfExtent * 0.6,
        this.cameraDistanceMin,
        this.cameraDistanceMax,
      );
    } else {
      // Looser frame — show the system in context of nearby empires.
      this.camera.distance = clamp(
        this.galaxyHalfExtent * 0.9,
        this.cameraDistanceMin,
        this.cameraDistanceMax,
      );
    }
    this.camera.recompute();
  }

  /**
   * Animate the camera to zoom into a specific star. Tweens targetX/targetZ
   * onto the star and tweens distance down to "system scale" (~5 units) so
   * the player sees the system's planets orbiting in place. Cancels any
   * existing fly-to tween.
   */
  flyToSystem(
    systemId: string,
    opts: { distance?: number; durationMs?: number } = {},
  ): void {
    if (this.destroyed) return;
    const pos = this.systemPositions.get(systemId);
    if (!pos) return;
    // Default lands at 7 — solidly in system mode (<8) with enough field of
    // view to show hyper gates at GATE_RADIUS_WORLD=4.2 without clipping.
    const targetDistance = clamp(
      opts.distance ?? 7,
      this.cameraDistanceMin,
      this.cameraDistanceMax,
    );
    const duration = opts.durationMs ?? 700;

    // Mark this system as focused so update() can switch into system-view LOD
    // as the camera distance drops below the threshold.
    this.focusedSystemId = systemId;

    this.cancelFlyTo();
    this.flyToTween = this.scene.tweens.add({
      targets: {
        x: this.camera.targetX,
        y: this.camera.targetY,
        z: this.camera.targetZ,
        d: this.camera.distance,
      },
      x: pos.x,
      // Star sits at its own y (the Y_WOBBLE offset) — track it so the camera
      // looks dead-center on the system at close zoom instead of looking at
      // y=0 with the star offset above/below frame.
      y: pos.y,
      z: pos.z,
      d: targetDistance,
      duration,
      ease: "Cubic.easeInOut",
      onUpdate: (
        _tween,
        target: { x: number; y: number; z: number; d: number },
      ) => {
        if (this.destroyed) return;
        this.camera.targetX = target.x;
        this.camera.targetY = target.y;
        this.camera.targetZ = target.z;
        this.camera.distance = target.d;
        this.camera.recompute();
      },
      onComplete: () => {
        this.flyToTween = null;
      },
    });
  }

  cancelFlyTo(): void {
    if (this.flyToTween) {
      this.flyToTween.stop();
      this.flyToTween = null;
    }
  }

  setPlanets(planets: import("../../data/types.ts").Planet[]): void {
    if (this.destroyed) return;
    this.planets.setPlanets(planets, this.systemPositions);
    const counts = new Map<string, number>();
    for (const planet of planets) {
      counts.set(planet.systemId, (counts.get(planet.systemId) ?? 0) + 1);
    }
    this.traffic.setPlanetCounts(counts);
    this.traffic.setPlanets(planets);
  }

  setPlanetHoverHandler(
    handler: ((planetId: string | null) => void) | null,
  ): void {
    this.planets.setHoverHandler(handler);
  }

  setPlanetClickHandler(handler: ((planetId: string) => void) | null): void {
    this.planets.setClickHandler(handler);
  }

  setHyperGateClickHandler(handler: ((systemId: string) => void) | null): void {
    this.gates.setClickHandler(handler);
  }

  getFocusedSystemId(): string | null {
    return this.focusedSystemId;
  }

  focusOnRoute(_routeId: string): void {
    // No-op stub.
  }

  setVisible(visible: boolean): void {
    this.galaxyContainer.setVisible(visible);
  }

  setCanvasOpacity(opacity: number): void {
    this.galaxyContainer.setAlpha(clamp(opacity, 0, 1));
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    for (const sprite of this.starSprites.values()) {
      sprite.destroy();
    }
    this.starSprites.clear();
    this.systemColors.clear();

    for (const label of this.systemLabels.values()) {
      label.destroy();
    }
    this.systemLabels.clear();

    for (const label of this.empireLabels.values()) {
      label.destroy();
    }
    this.empireLabels.clear();
    this.empireCentroids.clear();

    for (const sprite of this.hqMarkerSprites) {
      sprite.destroy();
    }
    this.hqMarkerSprites.length = 0;
    this.hqMarkerSystemIds.length = 0;

    if (this.ringsGfx) {
      this.ringsGfx.destroy();
      this.ringsGfx = null;
    }

    if (this.hyperlanesGfx) {
      this.hyperlanesGfx.destroy();
      this.hyperlanesGfx = null;
    }
    this.hyperlaneSegments = [];

    if (this.fillTerritoryGfx) {
      this.fillTerritoryGfx.destroy();
      this.fillTerritoryGfx = null;
    }

    if (this.territoryGfx) {
      this.territoryGfx.destroy();
      this.territoryGfx = null;
    }
    this.territoryPolygons = [];

    if (this.bgStarsGfx) {
      this.bgStarsGfx.destroy();
      this.bgStarsGfx = null;
    }
    this.bgStarPositions = [];
    this.bgStarAlphas = [];
    this.bgStarRadii = [];
    this.bgStarColors = [];
    this.bgStarParallax = [];

    this.stationSprite?.destroy();
    this.stationSprite = null;
    this.stationHitbox?.destroy();
    this.stationHitbox = null;
    this.stationOrbitGfx?.destroy();
    this.stationOrbitGfx = null;

    this.routes.destroy();
    this.ships.destroy();
    this.background.destroy();
    this.planets.destroy();
    this.gates.destroy();
    this.traffic.destroy();

    this.galaxyContainer.destroy();
    disposeAllGlowTextures(this.scene);

    if (this.scene.textures.exists(HQ_MARKER_TEX_PLAYER)) {
      this.scene.textures.remove(HQ_MARKER_TEX_PLAYER);
    }
    if (this.scene.textures.exists(HQ_MARKER_TEX_RIVAL)) {
      this.scene.textures.remove(HQ_MARKER_TEX_RIVAL);
    }
  }

  // ── Phase 2: routes & ships ─────────────────────────────────────────────

  setRoutes(visuals: RouteTrafficVisual[]): void {
    if (this.destroyed) return;
    this.routes.set(visuals);
  }

  setShips(
    visuals: RouteTrafficVisual[],
    isPlayerOwned: (routeId: string) => boolean,
  ): void {
    if (this.destroyed) return;
    this.ships.set(visuals, isPlayerOwned);
  }

  setShipsVisible(v: boolean): void {
    if (this.destroyed) return;
    this.ships.setVisible(v);
  }

  setTrafficVisible(v: boolean): void {
    if (this.destroyed) return;
    this.traffic.setVisible(v);
  }

  setShipSpeedMultiplier(m: number): void {
    this.ships.setSpeedMultiplier(m);
  }

  setRouteCompanyFilter(id: string | null): void {
    if (this.destroyed) return;
    this.routes.setCompanyFilter(id);
    this.ships.setCompanyFilter(id);
  }

  getRouteCurve(routeId: string) {
    return this.routes.getCurve(routeId);
  }

  // ── Phase 3: background (empire halos + nebulae + starfield) ────────────

  setEmpireHalosVisible(v: boolean): void {
    if (this.destroyed) return;
    this.background.setEmpireHalosVisible(v);
  }

  // ── Phase 4: HQ markers + selection rings + label LOD ──────────────────

  setHubLevel(level: number): void {
    this.hubLevel = Math.max(1, Math.min(4, level));
  }

  setStationHoverHandler(fn: ((hovered: boolean) => void) | null): void {
    this.stationHoverHandler = fn;
  }

  setStationClickHandler(fn: (() => void) | null): void {
    this.stationClickHandler = fn;
  }

  setHQMarkers3D(markers: HQMarker3D[]): void {
    if (this.destroyed) return;
    for (const sprite of this.hqMarkerSprites) {
      sprite.destroy();
    }
    this.hqMarkerSprites.length = 0;
    this.hqMarkerSystemIds.length = 0;
    this.playerHQSystemId = null;

    for (const m of markers) {
      if (m.isPlayer) this.playerHQSystemId = m.systemId;
      if (!this.systemPositions.has(m.systemId)) continue;
      const key = getOrCreateHQMarkerTexture(this.scene, m.isPlayer);
      const img = this.scene.add.image(0, 0, key);
      img.setVisible(false);
      img.setDepth(HQ_MARKER_DEPTH);
      this.galaxyContainer.add(img);
      this.hqMarkerSprites.push(img);
      this.hqMarkerSystemIds.push(m.systemId);
    }
  }

  setHighlightedSystem(id: string | null): void {
    if (this.destroyed) return;
    this.highlightSystemId = id;
    this.ensureRingsGfx();
  }

  setRouteOriginSystem(id: string | null): void {
    if (this.destroyed) return;
    this.originSystemId = id;
    this.ensureRingsGfx();
  }

  /**
   * Replace the set of system labels that the grid-collision pass has decided
   * to suppress (too crowded). Called once per frame from GalaxyMapScene before
   * view3D.update() so the render loop can skip showing suppressed labels.
   */
  setSuppressedSystemLabels(suppressed: Iterable<string>): void {
    this.suppressedSystemLabels = new Set(suppressed);
  }

  setEmpireLabelsVisible(v: boolean): void {
    if (this.destroyed) return;
    this.empireLabelsVisible = v;
    if (!v) {
      for (const label of this.empireLabels.values()) {
        label.setVisible(false);
      }
    }
  }

  setHyperlanesVisible(on: boolean): void {
    if (this.destroyed) return;
    this.hyperlanesVisible = on;
    if (!on && this.hyperlanesGfx) this.hyperlanesGfx.clear();
  }

  setTerritoryBordersVisible(on: boolean): void {
    if (this.destroyed) return;
    this.background.setTerritoryGlowsVisible(on);
    if (!on) {
      this.fillTerritoryGfx?.clear();
      this.territoryGfx?.clear();
    }
  }

  setSystemsVisible(on: boolean): void {
    if (this.destroyed) return;
    this.systemsVisible = on;
    if (!on) {
      for (const sprite of this.starSprites.values()) {
        sprite.setVisible(false);
      }
      for (const label of this.systemLabels.values()) {
        label.setVisible(false);
      }
    }
  }

  updateSystemLabelLOD(
    camDist: number,
    halfExtent: number,
    namesOn: boolean,
  ): void {
    // Match GalaxyView3D behavior: hide names when zoomed out past 2.2× the
    // galaxy's half-extent (labels would crowd unreadable) or when toggled off.
    this.systemLabelsVisible = namesOn && camDist < halfExtent * 1.6;
    if (!this.systemLabelsVisible) {
      for (const label of this.systemLabels.values()) {
        label.setVisible(false);
      }
    }
  }

  private ensureRingsGfx(): void {
    if (this.ringsGfx) return;
    this.ringsGfx = this.scene.add.graphics();
    this.ringsGfx.setDepth(RING_DEPTH);
    this.galaxyContainer.add(this.ringsGfx);
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private computeCentroidAndExtent(systems: StarSystem[]): void {
    if (systems.length === 0) {
      this.centroidX = 0;
      this.centroidZ = 0;
      this.galaxyHalfExtent = 80;
      this.cameraDistanceMin = 8;
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
    // Min distance is now very small (2 units) so the player can zoom all the
    // way INTO a system and see its planets orbiting the star. Planet orbit
    // radii are 4–16 units, so distance ~3–6 frames a system nicely.
    this.cameraDistanceMin = 2;
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
    for (const label of this.systemLabels.values()) {
      label.destroy();
    }
    this.systemLabels.clear();
    this.systemPositions.clear();
    this.systemColors.clear();

    for (const sys of systems) {
      const pos = this.worldPosFor(sys);
      this.systemPositions.set(sys.id, pos);
      this.systemColors.set(sys.id, sys.starColor);

      const key = getStarGlowTexture(this.scene, sys.starColor);
      const img = this.scene.add.image(0, 0, key);
      img.setBlendMode(Phaser.BlendModes.ADD);
      img.setTint(sys.starColor);
      img.setAlpha(STAR_ALPHA);
      img.setVisible(false);
      this.galaxyContainer.add(img);
      this.starSprites.set(sys.id, img);

      const label = this.scene.add.text(0, 0, sys.name, {
        fontSize: "10px",
        fontFamily: "monospace",
        color: this.computeSystemLabelColor(sys.empireId),
        stroke: "#000000",
        strokeThickness: 2,
      });
      label.setOrigin(0.5, 1); // bottom-center: text grows up from the star
      label.setAlpha(0.9);
      label.setDepth(SYSTEM_LABEL_DEPTH);
      label.setVisible(false);
      this.galaxyContainer.add(label);
      this.systemLabels.set(sys.id, label);
    }
  }

  /**
   * Compute the hex color string for a system label, tinted by its empire
   * and dimmed if that empire is not accessible to the player.
   */
  private computeSystemLabelColor(empireId: string): string {
    const empColor = this.empireColors.get(empireId) ?? 0xa8b4c4;
    // Mix empire color toward neutral so names stay readable against the
    // black backdrop without being a saturated blob.
    const mix = 0.55; // 0 = pure empire color, 1 = neutral gray
    const neutral = 0xb8c0cc;
    const er = (empColor >> 16) & 0xff;
    const eg = (empColor >> 8) & 0xff;
    const eb = empColor & 0xff;
    const nr = (neutral >> 16) & 0xff;
    const ng = (neutral >> 8) & 0xff;
    const nb = neutral & 0xff;
    let r = Math.floor(er * (1 - mix) + nr * mix);
    let g = Math.floor(eg * (1 - mix) + ng * mix);
    let b = Math.floor(eb * (1 - mix) + nb * mix);
    // Inaccessible empires: dim 50% so they read as "not yours / closed".
    if (
      this.accessibleEmpireIds.size > 0 &&
      !this.accessibleEmpireIds.has(empireId)
    ) {
      r = Math.floor(r * 0.5);
      g = Math.floor(g * 0.5);
      b = Math.floor(b * 0.5);
    }
    return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
  }

  /**
   * Update the set of empires the player can interact with. Re-tints all
   * existing system labels so inaccessible-empire systems appear dimmer.
   */
  setAccessibleEmpireIds(ids: Iterable<string>): void {
    this.accessibleEmpireIds = new Set(ids);
    for (const [systemId, label] of this.systemLabels) {
      const empireId = this.systemEmpireIds.get(systemId);
      if (!empireId) continue;
      label.setColor(this.computeSystemLabelColor(empireId));
    }
  }

  private rebuildEmpireLabels(empires: Empire[]): void {
    for (const label of this.empireLabels.values()) {
      label.destroy();
    }
    this.empireLabels.clear();

    for (const emp of empires) {
      if (!this.empireCentroids.has(emp.id)) continue;
      // Dim the empire color by 30% so the label isn't too bright/saturated.
      const r = Math.floor(((emp.color >> 16) & 0xff) * 0.7);
      const g = Math.floor(((emp.color >> 8) & 0xff) * 0.7);
      const b = Math.floor((emp.color & 0xff) * 0.7);
      const dimColor = ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
      const text = this.scene.add.text(0, 0, emp.name.toUpperCase(), {
        fontSize: "14px",
        fontFamily: "monospace",
        color: "#" + dimColor,
        stroke: "#000000",
        strokeThickness: 3,
      });
      text.setOrigin(0.5, 0.5);
      text.setAlpha(0.4);
      text.setDepth(EMPIRE_LABEL_DEPTH);
      text.setVisible(false);
      this.galaxyContainer.add(text);
      this.empireLabels.set(emp.id, text);
    }
  }

  private computeEmpireCentroids(
    systems: StarSystem[],
    empires: Empire[],
  ): void {
    this.empireCentroids.clear();
    const empireSystems = new Map<string, Vec3[]>();
    for (const sys of systems) {
      const pos = this.systemPositions.get(sys.id);
      if (!pos) continue;
      const arr = empireSystems.get(sys.empireId) ?? [];
      arr.push(pos);
      empireSystems.set(sys.empireId, arr);
    }
    for (const emp of empires) {
      const positions = empireSystems.get(emp.id);
      if (!positions || positions.length === 0) continue;
      let cx = 0;
      let cz = 0;
      for (const p of positions) {
        cx += p.x;
        cz += p.z;
      }
      cx /= positions.length;
      cz /= positions.length;
      this.empireCentroids.set(emp.id, { x: cx, y: -0.5, z: cz });
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

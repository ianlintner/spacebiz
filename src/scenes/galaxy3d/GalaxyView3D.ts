import * as THREE from "three";
import type {
  BorderPort,
  Empire,
  Hyperlane,
  StarSystem,
} from "../../data/types.ts";
import type { RouteTrafficVisual } from "../../game/routes/RouteManager.ts";

/**
 * Three.js controller for the 3D galaxy view. Renders star systems as glowing
 * spheres on a near-flat plane (small deterministic y wobble for depth),
 * hyperlanes as faint lines, empire territories as additive halos around home
 * systems, and active trade routes as 3D curves. Mirrors the architecture of
 * SystemView3D — sibling canvas to Phaser, pointer-events disabled, camera
 * orbits a fixed centroid with bounds.
 */

export interface ViewportRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ProjectedScreen {
  x: number;
  y: number;
  depth: number;
  visible: boolean;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface GalaxyView3DOptions {
  phaserCanvas: HTMLCanvasElement;
  designWidth: number;
  designHeight: number;
}

const COORD_SCALE = 0.08;
const Y_WOBBLE = 4;

/**
 * Stable DOM class for every Three.js galaxy canvas. Multiple scenes
 * (GalaxyMapScene, SimPlaybackScene) can host their own 3D view at different
 * times; the class lets any modal/overlay scene hide all of them via
 * setGalaxy3DVisible(false) without needing a reference to the owning scene.
 * The Phaser canvas at zIndex 0 cannot occlude these canvases (zIndex 2), so
 * DOM-level hiding is the only reliable way to keep galaxy pixels from
 * bleeding through Phaser-drawn modals.
 */
export const GALAXY_3D_CANVAS_CLASS = "galaxy-3d-canvas";

/**
 * Hide or show every 3D galaxy canvas currently in the DOM. Idempotent and
 * safe to call when no canvas is mounted.
 */
export function setGalaxy3DVisible(visible: boolean): void {
  const els = document.querySelectorAll<HTMLCanvasElement>(
    `.${GALAXY_3D_CANVAS_CLASS}`,
  );
  els.forEach((el) => {
    el.style.display = visible ? "" : "none";
  });
}

const HYPERLANE_OPEN_COLOR = 0x6dc8ff;
const HYPERLANE_RESTRICTED_COLOR = 0xffaa00;
const HYPERLANE_CLOSED_COLOR = 0xff4444;
const ROUTE_PLAYER_COLOR = 0xffd178;
const ROUTE_AI_COLOR = 0x9aa6c8;

export class GalaxyView3D {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;

  private readonly systemMeshes = new Map<string, THREE.Mesh>();
  private readonly systemHalos = new Map<string, THREE.Sprite>();
  private readonly empireHalos = new Map<string, THREE.Sprite>();
  private readonly empireCentroids = new Map<string, Vec3>();
  private readonly systemPositions = new Map<string, Vec3>();
  private hyperlaneLines: THREE.LineSegments | null = null;
  private routeLines: THREE.Line[] = [];
  private readonly routeCurves = new Map<string, THREE.CatmullRomCurve3>();
  // Map of route line → ownerId, for the company filter. Same length and
  // order as routeLines so we can ghost non-matching routes per filter.
  private readonly routeOwners: string[] = [];
  // Base opacity per route line (player vs AI), captured at build time so the
  // filter can restore the correct full-strength alpha when cleared.
  private readonly routeBaseOpacity: number[] = [];
  private routeCompanyFilter: string | null = null;
  private starfield: THREE.Points | null = null;

  private viewport: ViewportRect = { x: 0, y: 0, w: 0, h: 0 };

  private readonly phaserCanvas: HTMLCanvasElement;
  private readonly designWidth: number;
  private readonly designHeight: number;

  private rafId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private destroyed = false;

  // Galaxy centroid in 3D world coords — camera always looks here.
  private centroidX = 0;
  private centroidZ = 0;
  // Approximate galaxy half-extent in world units, computed from systems on
  // load and used to size the camera distance bounds.
  private galaxyHalfExtent = 80;

  // Camera state: orbit around centroid.
  private cameraDistance = 120;
  private cameraYaw = 0;
  private cameraPitch = Math.PI * 0.3;
  private cameraDistanceMin = 50;
  private cameraDistanceMax = 220;
  private static readonly CAMERA_PITCH_MIN = Math.PI * 0.18;
  private static readonly CAMERA_PITCH_MAX = Math.PI * 0.46;
  private static readonly CAMERA_YAW_RANGE = Math.PI * 0.5;

  // Reusable scratch — avoid per-frame allocation in render hot path.
  private readonly tmpVec = new THREE.Vector3();

  constructor(opts: GalaxyView3DOptions) {
    this.phaserCanvas = opts.phaserCanvas;
    this.designWidth = opts.designWidth;
    this.designHeight = opts.designHeight;

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.designWidth;
    this.canvas.height = this.designHeight;
    this.canvas.style.position = "absolute";
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.zIndex = "2";
    this.canvas.style.left = "0px";
    this.canvas.style.top = "0px";
    // Stable class so any scene can hide the 3D canvas from the DOM. The
    // Phaser canvas sits at zIndex 0; this canvas at zIndex 2 paints above it,
    // so Phaser-side opaque rectangles cannot occlude it. Modal/overlay scenes
    // call setGalaxy3DVisible(false) to display:none every matching element.
    this.canvas.classList.add(GALAXY_3D_CANVAS_CLASS);

    const parent = this.phaserCanvas.parentElement;
    if (!parent) {
      throw new Error("Phaser canvas has no parent element");
    }
    if (!parent.style.position) {
      parent.style.position = "relative";
    }
    parent.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.designWidth, this.designHeight, false);
    this.renderer.autoClear = false;

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
    this.applyCameraOrbit();

    // Galaxy doesn't have a "sun" — every star is its own light source. We
    // just use ambient + tone the emissive material on stars to do the
    // glowing-from-within look without having to rig N point lights.
    this.scene.add(new THREE.AmbientLight(0xc0c8e0, 1.0));

    this.buildStarfield();
    this.syncCanvasPosition();
    this.observeResize();
    this.startRenderLoop();
  }

  setViewport(rect: ViewportRect): void {
    this.viewport = rect;
  }

  setGalaxy(
    systems: StarSystem[],
    hyperlanes: Hyperlane[],
    borderPorts: BorderPort[],
    empires: Empire[],
  ): void {
    this.computeCentroidAndExtent(systems);
    this.rebuildSystems(systems);
    this.rebuildEmpireHalos(systems, empires);
    this.rebuildHyperlanes(hyperlanes, borderPorts);
  }

  setRoutes(trafficVisuals: RouteTrafficVisual[]): void {
    this.rebuildRouteLines(trafficVisuals);
  }

  /** Toggle the empire territory bubbles. */
  setEmpireHalosVisible(visible: boolean): void {
    for (const halo of this.empireHalos.values()) {
      halo.visible = visible;
    }
  }

  /**
   * Filter route line opacity by company. `null` = full opacity for all.
   * When set, routes whose owner doesn't match get ghosted to a dim alpha so
   * the player can still see the lane network without the visual noise of
   * unrelated companies' traffic.
   */
  setRouteCompanyFilter(ownerId: string | null): void {
    this.routeCompanyFilter = ownerId;
    this.applyRouteFilterAlpha();
  }

  /**
   * Project a galaxy-world 3D position into Phaser design-space screen coords.
   */
  projectToScreenDesign(world: Vec3): ProjectedScreen {
    this.tmpVec.set(world.x, world.y, world.z);
    this.tmpVec.project(this.camera);
    const sx = this.viewport.x + (this.tmpVec.x * 0.5 + 0.5) * this.viewport.w;
    const sy = this.viewport.y + (-this.tmpVec.y * 0.5 + 0.5) * this.viewport.h;
    const visible =
      this.tmpVec.z > -1 &&
      this.tmpVec.z < 1 &&
      this.tmpVec.x >= -1 &&
      this.tmpVec.x <= 1 &&
      this.tmpVec.y >= -1 &&
      this.tmpVec.y <= 1;
    return { x: sx, y: sy, depth: this.tmpVec.z, visible };
  }

  getSystemWorldPosition(systemId: string): Vec3 | null {
    return this.systemPositions.get(systemId) ?? null;
  }

  getRouteCurve(routeId: string): THREE.CatmullRomCurve3 | null {
    return this.routeCurves.get(routeId) ?? null;
  }

  setVisible(visible: boolean): void {
    this.canvas.style.display = visible ? "" : "none";
  }

  zoom(delta: number): void {
    this.cameraDistance = clamp(
      this.cameraDistance + delta,
      this.cameraDistanceMin,
      this.cameraDistanceMax,
    );
    this.applyCameraOrbit();
  }

  pan(dxScreen: number, dyScreen: number): void {
    const yawDelta = (-dxScreen / 320) * Math.PI;
    const pitchDelta = (-dyScreen / 320) * Math.PI;
    this.cameraYaw = clamp(
      this.cameraYaw + yawDelta,
      -GalaxyView3D.CAMERA_YAW_RANGE,
      GalaxyView3D.CAMERA_YAW_RANGE,
    );
    this.cameraPitch = clamp(
      this.cameraPitch + pitchDelta,
      GalaxyView3D.CAMERA_PITCH_MIN,
      GalaxyView3D.CAMERA_PITCH_MAX,
    );
    this.applyCameraOrbit();
  }

  resetCamera(): void {
    this.cameraDistance = clamp(
      this.galaxyHalfExtent * 1.8,
      this.cameraDistanceMin,
      this.cameraDistanceMax,
    );
    this.cameraYaw = 0;
    this.cameraPitch = Math.PI * 0.3;
    this.applyCameraOrbit();
  }

  destroy(): void {
    this.destroyed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    for (const mesh of this.systemMeshes.values()) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.systemMeshes.clear();
    for (const halo of this.systemHalos.values()) {
      const mat = halo.material as THREE.SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
    this.systemHalos.clear();
    for (const halo of this.empireHalos.values()) {
      const mat = halo.material as THREE.SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
    this.empireHalos.clear();
    this.empireCentroids.clear();
    this.systemPositions.clear();
    if (this.hyperlaneLines) {
      this.hyperlaneLines.geometry.dispose();
      (this.hyperlaneLines.material as THREE.Material).dispose();
      this.hyperlaneLines = null;
    }
    for (const line of this.routeLines) {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.routeLines = [];
    this.routeCurves.clear();
    this.starfield?.geometry.dispose();
    if (this.starfield) (this.starfield.material as THREE.Material).dispose();

    this.renderer.dispose();
    this.canvas.parentElement?.removeChild(this.canvas);
  }

  private computeCentroidAndExtent(systems: StarSystem[]): void {
    if (systems.length === 0) {
      this.centroidX = 0;
      this.centroidZ = 0;
      this.galaxyHalfExtent = 80;
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
    // Re-derive camera distance bounds and reset to a sensible framing now
    // that we know how big the galaxy actually is.
    this.cameraDistanceMin = Math.max(30, this.galaxyHalfExtent * 0.6);
    // Generous zoom-out so players can see the entire galaxy from afar — but
    // still gated so the galaxy can't shrink to a single pixel and the
    // starfield stays meaningful.
    this.cameraDistanceMax = this.galaxyHalfExtent * 8;
    this.cameraDistance = clamp(
      this.galaxyHalfExtent * 1.8,
      this.cameraDistanceMin,
      this.cameraDistanceMax,
    );
    this.applyCameraOrbit();
  }

  private worldPosFor(system: StarSystem): Vec3 {
    const x = system.x * COORD_SCALE - this.centroidX;
    const z = system.y * COORD_SCALE - this.centroidZ;
    const seed = hashString(system.id);
    const y = ((seed % 1000) / 1000 - 0.5) * 2 * Y_WOBBLE;
    return { x, y, z };
  }

  private rebuildSystems(systems: StarSystem[]): void {
    for (const mesh of this.systemMeshes.values()) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.systemMeshes.clear();
    for (const halo of this.systemHalos.values()) {
      this.scene.remove(halo);
      const mat = halo.material as THREE.SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
    this.systemHalos.clear();
    this.systemPositions.clear();

    for (const sys of systems) {
      const pos = this.worldPosFor(sys);
      this.systemPositions.set(sys.id, pos);

      const radius = 0.7;
      const mat = new THREE.MeshStandardMaterial({
        color: sys.starColor,
        roughness: 0.5,
        metalness: 0.0,
        emissive: sys.starColor,
        emissiveIntensity: 1.4,
      });
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 12),
        mat,
      );
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.userData.systemId = sys.id;
      this.scene.add(mesh);
      this.systemMeshes.set(sys.id, mesh);

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createRadialGradientTexture(sys.starColor),
          color: sys.starColor,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      halo.position.set(pos.x, pos.y, pos.z);
      halo.scale.set(3.4, 3.4, 1);
      this.scene.add(halo);
      this.systemHalos.set(sys.id, halo);
    }
  }

  private rebuildEmpireHalos(systems: StarSystem[], empires: Empire[]): void {
    for (const halo of this.empireHalos.values()) {
      this.scene.remove(halo);
      const mat = halo.material as THREE.SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
    this.empireHalos.clear();
    this.empireCentroids.clear();

    // Group systems by empire, derive a centroid + bounding radius per
    // empire. Empire territory is then visualized as one large additive
    // bubble per empire that hugs the actual member systems instead of
    // floating over just the home system.
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

      let maxDist = 0;
      for (const p of positions) {
        const d = Math.hypot(p.x - cx, p.z - cz);
        if (d > maxDist) maxDist = d;
      }
      // Padding so the bubble extends past outermost system rather than
      // clipping it. Floor avoids a degenerate radius for single-system empires.
      const radius = Math.max(8, maxDist + 6);

      const centroid: Vec3 = { x: cx, y: -0.5, z: cz };
      this.empireCentroids.set(emp.id, centroid);

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createRadialGradientTexture(emp.color),
          color: emp.color,
          transparent: true,
          opacity: 0.16,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      halo.position.set(centroid.x, centroid.y, centroid.z);
      halo.scale.set(radius * 2.2, radius * 2.2, 1);
      this.scene.add(halo);
      this.empireHalos.set(emp.id, halo);
    }
  }

  /** Returns the world position of an empire's territory centroid. */
  getEmpireCentroid(empireId: string): Vec3 | null {
    return this.empireCentroids.get(empireId) ?? null;
  }

  /** Current camera distance from the galaxy origin — used by the scene
   *  to LOD label visibility (system labels at close range, empire labels
   *  always visible). */
  getCameraDistance(): number {
    return this.cameraDistance;
  }

  /** Half-extent the camera bounds were sized to. Useful for the scene to
   *  pick zoom thresholds proportional to galaxy size. */
  getGalaxyHalfExtent(): number {
    return this.galaxyHalfExtent;
  }

  private rebuildHyperlanes(
    hyperlanes: Hyperlane[],
    borderPorts: BorderPort[],
  ): void {
    if (this.hyperlaneLines) {
      this.scene.remove(this.hyperlaneLines);
      this.hyperlaneLines.geometry.dispose();
      (this.hyperlaneLines.material as THREE.Material).dispose();
      this.hyperlaneLines = null;
    }
    if (hyperlanes.length === 0) return;

    // Lane status by hyperlane id — closed wins over restricted wins over
    // open, matching the 2D rendering rule.
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

    const positions: number[] = [];
    const colors: number[] = [];
    const tmpColor = new THREE.Color();
    for (const hl of hyperlanes) {
      const a = this.systemPositions.get(hl.systemA);
      const b = this.systemPositions.get(hl.systemB);
      if (!a || !b) continue;
      const s = status.get(hl.id) ?? "open";
      const hex =
        s === "closed"
          ? HYPERLANE_CLOSED_COLOR
          : s === "restricted"
            ? HYPERLANE_RESTRICTED_COLOR
            : HYPERLANE_OPEN_COLOR;
      tmpColor.setHex(hex);
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      colors.push(
        tmpColor.r,
        tmpColor.g,
        tmpColor.b,
        tmpColor.r,
        tmpColor.g,
        tmpColor.b,
      );
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(positions), 3),
    );
    geom.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(colors), 3),
    );
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.hyperlaneLines = new THREE.LineSegments(geom, mat);
    this.scene.add(this.hyperlaneLines);
  }

  private rebuildRouteLines(visuals: RouteTrafficVisual[]): void {
    for (const line of this.routeLines) {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.routeLines = [];
    this.routeCurves.clear();
    this.routeOwners.length = 0;
    this.routeBaseOpacity.length = 0;

    for (const visual of visuals) {
      const path = visual.pathSystemIds;
      if (path.length < 2) continue;

      // Ships travel along the hyperlane network — straight segments between
      // adjacent path systems, no arch. The route line is drawn brighter than
      // the hyperlane base layer so active trade lanes read clearly through
      // the network.
      const controlPoints: THREE.Vector3[] = [];
      for (const id of path) {
        const pos = this.systemPositions.get(id);
        if (!pos) continue;
        // Tiny y offset so the route line sits just above the hyperlane line
        // and doesn't z-fight when the camera is near-coplanar.
        controlPoints.push(new THREE.Vector3(pos.x, pos.y + 0.15, pos.z));
      }
      if (controlPoints.length < 2) continue;

      // CatmullRom on collinear-ish points still smooths slightly; force
      // chordal+centripetal off and use linear "curve type" for tight
      // adherence to the lane.
      const curve = new THREE.CatmullRomCurve3(
        controlPoints,
        false,
        "catmullrom",
        0,
      );
      this.routeCurves.set(visual.routeId, curve);
      // Sample once per segment endpoint — straight lanes don't need many
      // intermediate points and this keeps geometry cheap.
      const points = curve.getPoints(Math.max(2, controlPoints.length - 1) * 4);
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const isPlayer = visual.ownerId === "player";
      const baseOpacity = isPlayer ? 0.7 : 0.4;
      const mat = new THREE.LineBasicMaterial({
        color: isPlayer ? ROUTE_PLAYER_COLOR : ROUTE_AI_COLOR,
        transparent: true,
        opacity: baseOpacity,
        depthWrite: false,
      });
      const line = new THREE.Line(geom, mat);
      this.scene.add(line);
      this.routeLines.push(line);
      this.routeOwners.push(visual.ownerId);
      this.routeBaseOpacity.push(baseOpacity);
    }
    this.applyRouteFilterAlpha();
  }

  private applyRouteFilterAlpha(): void {
    const filter = this.routeCompanyFilter;
    for (let i = 0; i < this.routeLines.length; i++) {
      const line = this.routeLines[i];
      const owner = this.routeOwners[i];
      const base = this.routeBaseOpacity[i];
      const mat = line.material as THREE.LineBasicMaterial;
      // Ghost non-matching routes; matching (or no filter) get full strength.
      mat.opacity = filter && owner !== filter ? base * 0.18 : base;
    }
  }

  private buildStarfield(): void {
    const count = 1200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 600;
      positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    this.starfield = new THREE.Points(geom, mat);
    this.scene.add(this.starfield);
  }

  private applyCameraOrbit(): void {
    const r = this.cameraDistance;
    const x = Math.sin(this.cameraYaw) * Math.sin(this.cameraPitch) * r;
    const z = Math.cos(this.cameraYaw) * Math.sin(this.cameraPitch) * r;
    const y = Math.cos(this.cameraPitch) * r;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private startRenderLoop(): void {
    const loop = (): void => {
      if (this.destroyed) return;
      this.rafId = requestAnimationFrame(loop);
      this.render();
    };
    loop();
  }

  private render(): void {
    if (this.viewport.w <= 1 || this.viewport.h <= 1) {
      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, this.designWidth, this.designHeight);
      this.renderer.clear();
      return;
    }
    const aspect = this.viewport.w / this.viewport.h;
    if (Math.abs(this.camera.aspect - aspect) > 1e-3) {
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }

    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, this.designWidth, this.designHeight);
    this.renderer.clear();

    const yFromBottom = this.designHeight - this.viewport.y - this.viewport.h;
    this.renderer.setViewport(
      this.viewport.x,
      yFromBottom,
      this.viewport.w,
      this.viewport.h,
    );
    this.renderer.setScissor(
      this.viewport.x,
      yFromBottom,
      this.viewport.w,
      this.viewport.h,
    );
    this.renderer.setScissorTest(true);
    this.renderer.render(this.scene, this.camera);
  }

  private syncCanvasPosition(): void {
    const left = this.phaserCanvas.offsetLeft;
    const top = this.phaserCanvas.offsetTop;
    const w = this.phaserCanvas.offsetWidth;
    const h = this.phaserCanvas.offsetHeight;
    this.canvas.style.left = `${left}px`;
    this.canvas.style.top = `${top}px`;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  private observeResize(): void {
    if (typeof ResizeObserver === "undefined") return;
    this.resizeObserver = new ResizeObserver(() => this.syncCanvasPosition());
    this.resizeObserver.observe(this.phaserCanvas);
    if (this.phaserCanvas.parentElement) {
      this.resizeObserver.observe(this.phaserCanvas.parentElement);
    }
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function createRadialGradientTexture(centerColor: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }
  const r = (centerColor >> 16) & 0xff;
  const g = (centerColor >> 8) & 0xff;
  const b = centerColor & 0xff;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
  grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.4)`);
  grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

import * as THREE from "three";
import type {
  ActiveRoute,
  Planet,
  PlanetType,
  StarSystem,
} from "../../data/types.ts";
import {
  getOrbitalParams,
  planetPositionAtTurn,
  type Vec3,
} from "../../game/system/OrbitalMechanics.ts";

const PLANET_BASE_COLORS: Record<PlanetType, number> = {
  terran: 0x4b86d6,
  industrial: 0x9b8870,
  mining: 0x8b8e97,
  agricultural: 0x68b45a,
  hubStation: 0xf6b04f,
  resort: 0xff7fd3,
  research: 0x73ddff,
};

const PLANET_RADIUS_BY_TYPE: Record<PlanetType, number> = {
  terran: 0.85,
  industrial: 0.75,
  mining: 0.55,
  agricultural: 0.7,
  hubStation: 0.65,
  resort: 0.65,
  research: 0.6,
};

const SUN_RADIUS = 1.6;

export interface ViewportRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SystemView3DOptions {
  phaserCanvas: HTMLCanvasElement;
  designWidth: number;
  designHeight: number;
}

export interface ProjectedScreen {
  x: number;
  y: number;
  depth: number;
  visible: boolean;
}

export class SystemView3D {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly sunMesh: THREE.Mesh;
  private readonly sunHalo: THREE.Sprite;
  private readonly planetMeshes = new Map<string, THREE.Mesh>();
  private readonly orbitLines = new Map<string, THREE.LineLoop>();
  private routeLines: THREE.Line[] = [];
  private readonly routeCurves = new Map<string, THREE.CatmullRomCurve3>();
  private starfield: THREE.Points | null = null;

  private viewport: ViewportRect = { x: 0, y: 0, w: 0, h: 0 };
  private currentTurn = 1;
  private system: StarSystem | null = null;
  private planets: Planet[] = [];
  private routes: ActiveRoute[] = [];

  private readonly phaserCanvas: HTMLCanvasElement;
  private readonly designWidth: number;
  private readonly designHeight: number;

  private rafId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private destroyed = false;

  constructor(opts: SystemView3DOptions) {
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

    // Camera tilted ~35° off top-down. y is "up", camera looks at the sun
    // which sits at the origin in system-local space.
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
    this.camera.position.set(0, 18, 24);
    this.camera.lookAt(0, 0, 0);

    // Lighting: sun-as-point-light at origin + faint cool ambient
    this.scene.add(new THREE.AmbientLight(0x4a5680, 0.55));
    const sunLight = new THREE.PointLight(0xfff0c8, 2.2, 0, 1.4);
    sunLight.position.set(0, 0, 0);
    this.scene.add(sunLight);

    // Sun mesh and additive halo sprite (camera-facing for free corona look)
    this.sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(SUN_RADIUS, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0xffe89a }),
    );
    this.scene.add(this.sunMesh);

    this.sunHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createRadialGradientTexture(0xfff0c8),
        color: 0xffe89a,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.sunHalo.scale.set(SUN_RADIUS * 6, SUN_RADIUS * 6, 1);
    this.scene.add(this.sunHalo);

    this.buildStarfield();
    this.syncCanvasPosition();
    this.observeResize();
    this.startRenderLoop();
  }

  setViewport(rect: ViewportRect): void {
    this.viewport = rect;
  }

  setSystem(
    system: StarSystem,
    planets: Planet[],
    routes: ActiveRoute[],
  ): void {
    this.system = system;
    this.planets = planets;
    this.routes = routes;

    // Sun color from system
    (this.sunMesh.material as THREE.MeshBasicMaterial).color.setHex(
      system.starColor,
    );
    (this.sunHalo.material as THREE.SpriteMaterial).color.setHex(
      system.starColor,
    );

    this.rebuildPlanets();
    this.rebuildOrbitLines();
    this.rebuildRouteLines();
  }

  setTurn(turn: number): void {
    this.currentTurn = turn;
    this.updatePlanetPositions();
    this.rebuildRouteLines();
  }

  /**
   * Project a system-local 3D position to screen coords in Phaser design
   * space. Returns visibility of the projected point inside the viewport.
   */
  projectToScreenDesign(world: Vec3): ProjectedScreen {
    const v = new THREE.Vector3(world.x, world.y, world.z);
    v.project(this.camera);
    const sx = this.viewport.x + (v.x * 0.5 + 0.5) * this.viewport.w;
    const sy = this.viewport.y + (-v.y * 0.5 + 0.5) * this.viewport.h;
    const visible =
      v.z > -1 && v.z < 1 && v.x >= -1 && v.x <= 1 && v.y >= -1 && v.y <= 1;
    return { x: sx, y: sy, depth: v.z, visible };
  }

  /**
   * Returns the world position of a planet at the current turn. Used by
   * callers (Phaser scene) to project ship route endpoints and waypoints.
   */
  getPlanetWorldPosition(planetId: string): Vec3 | null {
    const planet = this.planets.find((p) => p.id === planetId);
    if (!planet) return null;
    return planetPositionAtTurn(planet, this.currentTurn);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    for (const mesh of this.planetMeshes.values()) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.planetMeshes.clear();
    for (const line of this.orbitLines.values()) {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.orbitLines.clear();
    for (const line of this.routeLines) {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.routeLines = [];
    this.routeCurves.clear();
    this.sunMesh.geometry.dispose();
    (this.sunMesh.material as THREE.Material).dispose();
    (this.sunHalo.material as THREE.SpriteMaterial).map?.dispose();
    (this.sunHalo.material as THREE.Material).dispose();
    this.starfield?.geometry.dispose();
    if (this.starfield) (this.starfield.material as THREE.Material).dispose();

    this.renderer.dispose();
    this.canvas.parentElement?.removeChild(this.canvas);
  }

  private buildStarfield(): void {
    const count = 600;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Distribute on a sphere shell at large radius so they sit "behind"
      // the system regardless of camera angle.
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 200;
      positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.6,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    this.starfield = new THREE.Points(geom, mat);
    this.scene.add(this.starfield);
  }

  private rebuildPlanets(): void {
    for (const mesh of this.planetMeshes.values()) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.planetMeshes.clear();

    for (const planet of this.planets) {
      const radius = PLANET_RADIUS_BY_TYPE[planet.type] ?? 0.65;
      const color = PLANET_BASE_COLORS[planet.type] ?? 0xcccccc;
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.85,
        metalness: 0.05,
        emissive: color,
        emissiveIntensity: 0.08,
      });
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 24, 18),
        mat,
      );
      mesh.userData.planetId = planet.id;
      this.scene.add(mesh);
      this.planetMeshes.set(planet.id, mesh);
    }
    this.updatePlanetPositions();
  }

  private updatePlanetPositions(): void {
    for (const planet of this.planets) {
      const mesh = this.planetMeshes.get(planet.id);
      if (!mesh) continue;
      const pos = planetPositionAtTurn(planet, this.currentTurn);
      mesh.position.set(pos.x, pos.y, pos.z);
    }
  }

  private rebuildOrbitLines(): void {
    for (const line of this.orbitLines.values()) {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.orbitLines.clear();

    const segments = 128;
    for (const planet of this.planets) {
      const o = getOrbitalParams(planet);
      const positions = new Float32Array((segments + 1) * 3);
      const sinIncl = Math.sin(o.orbitInclination);
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const x = Math.cos(a) * o.orbitRadius;
        const z = Math.sin(a) * o.orbitRadius;
        const y = Math.sin(a) * o.orbitRadius * sinIncl;
        positions[i * 3 + 0] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0x4d6da3,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
      const line = new THREE.LineLoop(geom, mat);
      this.scene.add(line);
      this.orbitLines.set(planet.id, line);
    }
  }

  private rebuildRouteLines(): void {
    for (const line of this.routeLines) {
      this.scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.routeLines = [];
    this.routeCurves.clear();

    if (!this.system) return;

    for (const route of this.routes) {
      const origin = this.planets.find((p) => p.id === route.originPlanetId);
      const dest = this.planets.find((p) => p.id === route.destinationPlanetId);
      if (!origin || !dest) continue;
      // Only render system-scope routes.
      if (origin.systemId !== this.system.id) continue;
      if (dest.systemId !== this.system.id) continue;

      const a = planetPositionAtTurn(origin, this.currentTurn);
      const b = planetPositionAtTurn(dest, this.currentTurn);
      // Midpoint lifted up so route arcs above ecliptic and avoids the sun.
      const mid: Vec3 = {
        x: (a.x + b.x) / 2,
        y: Math.max(2, (a.y + b.y) / 2 + 2.2),
        z: (a.z + b.z) / 2,
      };
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(a.x, a.y, a.z),
        new THREE.Vector3(mid.x, mid.y, mid.z),
        new THREE.Vector3(b.x, b.y, b.z),
      ]);
      this.routeCurves.set(route.id, curve);
      const points = curve.getPoints(48);
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: 0xffd178,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      const line = new THREE.Line(geom, mat);
      this.scene.add(line);
      this.routeLines.push(line);
    }
  }

  /**
   * Returns the cached 3D curve for a route, or null if the route is not
   * system-scope or the planets weren't found. Used by the Phaser scene to
   * interpolate ship sprite positions along the curve.
   */
  getRouteCurve(routeId: string): THREE.CatmullRomCurve3 | null {
    return this.routeCurves.get(routeId) ?? null;
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
      // Still need to clear the canvas so stale frames don't linger.
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

    // WebGL viewport y is from canvas bottom; flip from design (y-from-top).
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
    // Match Phaser canvas's offset within their shared parent. Both canvases
    // are siblings so offsetLeft/Top share the same coordinate basis.
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

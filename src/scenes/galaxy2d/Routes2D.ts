import * as Phaser from "phaser";
import type { RouteTrafficVisual } from "../../game/routes/RouteManager.ts";
import type { Mat4 } from "./Camera3D.ts";
import { Curve3 } from "./Curve3.ts";
import { projectToScreenDesignInto } from "./projection.ts";
import type { Vec3, ViewportRect } from "./types.ts";

const ROUTE_PLAYER_COLOR = 0xffd178;
const ROUTE_AI_COLOR = 0x9aa6c8;
const ROUTE_PLAYER_OPACITY = 0.7;
const ROUTE_AI_OPACITY = 0.4;
const ROUTE_GHOST_OPACITY_FACTOR = 0.18;
const ROUTE_LINE_WIDTH = 1.6;
const ROUTE_FULL_DEPTH = 400;
const ROUTE_GHOST_DEPTH = 350;
// Same y-lift as GalaxyView3D so route lines visually sit above hyperlanes.
const ROUTE_Y_OFFSET = 0.15;

interface RouteSegment2D {
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  ownerIdx: number;
}

export class Routes2D {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly systemPositions: Map<string, Vec3>;

  private routesFullGfx: Phaser.GameObjects.Graphics | null = null;
  private routesGhostGfx: Phaser.GameObjects.Graphics | null = null;
  private readonly routeCurves = new Map<string, Curve3>();
  private readonly routeOwners: string[] = [];
  private readonly routeBaseOpacity: number[] = [];
  private routeSegments: RouteSegment2D[] = [];
  private companyFilter: string | null = null;

  private readonly scratchA: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly scratchB: Vec3 = { x: 0, y: 0, z: 0 };

  constructor(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    systemPositions: Map<string, Vec3>,
  ) {
    this.scene = scene;
    this.container = container;
    this.systemPositions = systemPositions;
  }

  set(visuals: RouteTrafficVisual[]): void {
    this.ensureGraphics();
    this.routeCurves.clear();
    this.routeOwners.length = 0;
    this.routeBaseOpacity.length = 0;
    this.routeSegments.length = 0;

    for (const visual of visuals) {
      const path = visual.pathSystemIds;
      if (path.length < 2) continue;

      const controlPoints: Vec3[] = [];
      for (const id of path) {
        const pos = this.systemPositions.get(id);
        if (!pos) continue;
        controlPoints.push({ x: pos.x, y: pos.y + ROUTE_Y_OFFSET, z: pos.z });
      }
      if (controlPoints.length < 2) continue;

      const curve = new Curve3(controlPoints);
      this.routeCurves.set(visual.routeId, curve);

      const isPlayer = visual.ownerId === "player";
      const ownerIdx = this.routeOwners.length;
      this.routeOwners.push(visual.ownerId);
      this.routeBaseOpacity.push(
        isPlayer ? ROUTE_PLAYER_OPACITY : ROUTE_AI_OPACITY,
      );

      const pts = curve.getPoints();
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        this.routeSegments.push({
          ax: a.x,
          ay: a.y,
          az: a.z,
          bx: b.x,
          by: b.y,
          bz: b.z,
          ownerIdx,
        });
      }
    }
  }

  render(viewProj: Mat4, viewport: ViewportRect): void {
    if (!this.routesFullGfx || !this.routesGhostGfx) return;

    this.routesFullGfx.clear();
    this.routesGhostGfx.clear();
    if (this.routeSegments.length === 0) return;

    const filter = this.companyFilter;
    let lastGfx: Phaser.GameObjects.Graphics | null = null;
    let lastColor = -1;
    let lastOpacity = -1;

    for (const seg of this.routeSegments) {
      this.scratchA.x = seg.ax;
      this.scratchA.y = seg.ay;
      this.scratchA.z = seg.az;
      const a = projectToScreenDesignInto(
        this.scratchB,
        this.scratchA,
        viewProj,
        viewport,
      );
      if (!a.visible) continue;
      const ax = a.x;
      const ay = a.y;

      this.scratchA.x = seg.bx;
      this.scratchA.y = seg.by;
      this.scratchA.z = seg.bz;
      const b = projectToScreenDesignInto(
        this.scratchB,
        this.scratchA,
        viewProj,
        viewport,
      );
      if (!b.visible) continue;

      const owner = this.routeOwners[seg.ownerIdx];
      const baseOpacity = this.routeBaseOpacity[seg.ownerIdx];
      const isPlayer = owner === "player";
      const color = isPlayer ? ROUTE_PLAYER_COLOR : ROUTE_AI_COLOR;
      const ghosted = filter !== null && owner !== filter;
      const opacity = ghosted
        ? baseOpacity * ROUTE_GHOST_OPACITY_FACTOR
        : baseOpacity;
      const gfx = ghosted ? this.routesGhostGfx : this.routesFullGfx;

      if (gfx !== lastGfx || color !== lastColor || opacity !== lastOpacity) {
        gfx.lineStyle(ROUTE_LINE_WIDTH, color, opacity);
        lastGfx = gfx;
        lastColor = color;
        lastOpacity = opacity;
      }
      gfx.lineBetween(ax, ay, b.x, b.y);
    }
  }

  setCompanyFilter(id: string | null): void {
    this.companyFilter = id;
  }

  getCurve(routeId: string): Curve3 | null {
    return this.routeCurves.get(routeId) ?? null;
  }

  destroy(): void {
    if (this.routesFullGfx) {
      this.routesFullGfx.destroy();
      this.routesFullGfx = null;
    }
    if (this.routesGhostGfx) {
      this.routesGhostGfx.destroy();
      this.routesGhostGfx = null;
    }
    this.routeCurves.clear();
    this.routeOwners.length = 0;
    this.routeBaseOpacity.length = 0;
    this.routeSegments.length = 0;
  }

  private ensureGraphics(): void {
    if (!this.routesFullGfx) {
      this.routesFullGfx = this.scene.add.graphics();
      this.routesFullGfx.setDepth(ROUTE_FULL_DEPTH);
      this.container.add(this.routesFullGfx);
    }
    if (!this.routesGhostGfx) {
      this.routesGhostGfx = this.scene.add.graphics();
      this.routesGhostGfx.setDepth(ROUTE_GHOST_DEPTH);
      this.container.add(this.routesGhostGfx);
    }
  }
}

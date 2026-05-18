import * as Phaser from "phaser";
import type { RouteTrafficVisual } from "../../game/routes/RouteManager.ts";
import type { Mat4 } from "./Camera3D.ts";
import type { Curve3 } from "./Curve3.ts";
import { getStarGlowTexture } from "./GlowTextures.ts";
import { perspectiveScale, projectToScreenDesignInto } from "./projection.ts";
import type { Vec3, ViewportRect } from "./types.ts";

const SHIP_PLAYER_COLOR = 0xffe89a; // warm bright gold
const SHIP_DEPTH_BASE = 700;
const SHIP_DEPTH_RANGE = -10;
const SHIP_WORLD_SIZE = 10;
const SHIP_PLAYER_SIZE_MULT = 1.25; // player ships render 25% larger
const SHIP_PLAYER_ALPHA = 1.0;
const SHIP_AI_ALPHA = 0.7;

/**
 * Saturated palette of distinct hues for AI company ship glows. Picked by
 * a stable hash of the company id so the same company always reads the
 * same color across sessions.
 */
const SHIP_COMPANY_COLORS: readonly number[] = [
  0x6dc8ff, // cyan
  0xff7060, // coral red
  0xa78bfa, // violet
  0x66dd88, // emerald
  0xff9d3e, // orange
  0xff6dc8, // hot pink
  0x77ffe6, // teal
  0xffe066, // amber
  0x9bc4ff, // sky blue
  0xc0a07a, // tan
];

function hashCompanyToColor(ownerId: string): number {
  if (ownerId === "player") return SHIP_PLAYER_COLOR;
  let h = 0;
  for (let i = 0; i < ownerId.length; i++) {
    h = ((h << 5) - h + ownerId.charCodeAt(i)) | 0;
  }
  return SHIP_COMPANY_COLORS[Math.abs(h) % SHIP_COMPANY_COLORS.length];
}
const SHIP_Y_OFFSET = 0.5;
const SHIP_WAIT_CHANCE = 0.45;
const SHIP_WAIT_MIN = 0.8;
const SHIP_WAIT_RANGE = 2.5;
const SHIP_SPEED_BASE = 0.012;
const SHIP_SPEED_RANGE = 0.01;

interface ShipInstance2D {
  sprite: Phaser.GameObjects.Image;
  routeId: string;
  ownerId: string;
  isPlayer: boolean;
  // Captured at spawn time — avoids per-frame Map lookup in update().
  curve: Curve3;
  t: number;
  speed: number;
  dir: 1 | -1;
  waiting: boolean;
  waitRemaining: number;
}

export class Ships2D {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly getRouteCurve: (id: string) => Curve3 | null;

  private ships: ShipInstance2D[] = [];
  private speedMultiplier = 1;
  private showShips = true;
  private companyFilter: string | null = null;

  private readonly scratchWorld: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly scratchNdc: Vec3 = { x: 0, y: 0, z: 0 };

  constructor(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    getRouteCurve: (id: string) => Curve3 | null,
  ) {
    this.scene = scene;
    this.container = container;
    this.getRouteCurve = getRouteCurve;
  }

  set(
    visuals: RouteTrafficVisual[],
    isPlayerOwned: (routeId: string) => boolean,
  ): void {
    this.clear();
    const texKey = getStarGlowTexture(this.scene, 0xffffff);

    for (const visual of visuals) {
      if (visual.visibleUnits === 0) continue;

      // setRoutes() always runs before setShips() (GalaxyMapScene.rebuildTrafficShips).
      // Missing curve means the route had < 2 valid control points — skip silently.
      const curve = this.getRouteCurve(visual.routeId);
      if (!curve) continue;

      const player = isPlayerOwned(visual.routeId);
      const tint = hashCompanyToColor(visual.ownerId);

      for (let i = 0; i < visual.visibleUnits; i++) {
        const sprite = this.scene.add.image(0, 0, texKey);
        sprite.setBlendMode(Phaser.BlendModes.ADD);
        sprite.setTint(tint);
        sprite.setAlpha(player ? SHIP_PLAYER_ALPHA : SHIP_AI_ALPHA);
        sprite.setVisible(false);
        this.container.add(sprite);

        this.ships.push({
          sprite,
          routeId: visual.routeId,
          ownerId: visual.ownerId,
          isPlayer: player,
          curve,
          t: i / Math.max(1, visual.visibleUnits),
          speed: SHIP_SPEED_BASE + Math.random() * SHIP_SPEED_RANGE,
          dir: Math.random() < 0.5 ? 1 : -1,
          waiting: false,
          waitRemaining: 0,
        });
      }
    }

    this.applyFilter();
  }

  update(
    dt: number,
    viewProj: Mat4,
    viewMat: Mat4,
    focalLength: number,
    viewport: ViewportRect,
    camDist: number = Infinity,
    galaxyHalfExtent: number = 80,
  ): void {
    // Ships fade out when zoomed way out past the whole galaxy. Thresholds
    // scale with galaxy size so this stays correct regardless of world scale.
    const shipVisibilityStart = galaxyHalfExtent * 2.5;
    const shipVisibilityEnd = galaxyHalfExtent * 1.0;
    let shipAlpha = 1;
    if (camDist > shipVisibilityStart) {
      shipAlpha = 0;
    } else if (camDist > shipVisibilityEnd) {
      shipAlpha =
        1 -
        (camDist - shipVisibilityEnd) /
          (shipVisibilityStart - shipVisibilityEnd);
    }

    const filter = this.companyFilter;

    for (const ship of this.ships) {
      const filteredOut = filter !== null && ship.ownerId !== filter;
      if (!this.showShips || filteredOut) {
        ship.sprite.setVisible(false);
        continue;
      }

      if (ship.waiting) {
        ship.waitRemaining -= dt;
        if (ship.waitRemaining <= 0) {
          ship.waiting = false;
          ship.waitRemaining = 0;
        }
      } else {
        ship.t += ship.speed * this.speedMultiplier * ship.dir * dt;
        if (ship.t >= 1) {
          ship.t = 1;
          ship.dir = -1;
          if (Math.random() < SHIP_WAIT_CHANCE) {
            ship.waiting = true;
            ship.waitRemaining =
              SHIP_WAIT_MIN + Math.random() * SHIP_WAIT_RANGE;
          }
        } else if (ship.t <= 0) {
          ship.t = 0;
          ship.dir = 1;
          if (Math.random() < SHIP_WAIT_CHANCE) {
            ship.waiting = true;
            ship.waitRemaining =
              SHIP_WAIT_MIN + Math.random() * SHIP_WAIT_RANGE;
          }
        }
      }

      ship.curve.getPointAt(ship.t, this.scratchWorld);
      this.scratchWorld.y += SHIP_Y_OFFSET;

      const proj = projectToScreenDesignInto(
        this.scratchNdc,
        this.scratchWorld,
        viewProj,
        viewport,
      );
      if (!proj.visible) {
        ship.sprite.setVisible(false);
        continue;
      }

      const screenScale = perspectiveScale(
        this.scratchWorld,
        viewMat,
        focalLength,
      );
      if (screenScale <= 0) {
        ship.sprite.setVisible(false);
        continue;
      }

      const sizeMult = ship.isPlayer ? SHIP_PLAYER_SIZE_MULT : 1;
      const displaySize = SHIP_WORLD_SIZE * sizeMult * screenScale;
      ship.sprite.setPosition(proj.x, proj.y);
      ship.sprite.setDisplaySize(displaySize, displaySize);
      ship.sprite.setDepth(
        Math.floor(SHIP_DEPTH_BASE + proj.depth * SHIP_DEPTH_RANGE),
      );
      const baseAlpha = ship.isPlayer ? SHIP_PLAYER_ALPHA : SHIP_AI_ALPHA;
      ship.sprite.setAlpha(shipAlpha * baseAlpha);
      ship.sprite.setVisible(shipAlpha > 0.01);
    }
  }

  setVisible(v: boolean): void {
    this.showShips = v;
    this.applyFilter();
  }

  setSpeedMultiplier(m: number): void {
    this.speedMultiplier = m;
  }

  setCompanyFilter(id: string | null): void {
    this.companyFilter = id;
    this.applyFilter();
  }

  destroy(): void {
    this.clear();
  }

  private applyFilter(): void {
    const filter = this.companyFilter;
    if (!this.showShips) return;
    for (const ship of this.ships) {
      ship.sprite.setVisible(filter === null || ship.ownerId === filter);
    }
  }

  private clear(): void {
    for (const ship of this.ships) {
      ship.sprite.destroy();
    }
    this.ships.length = 0;
  }
}

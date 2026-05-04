import * as Phaser from "phaser";
import type {
  StarSystem,
  Planet,
  ActiveRoute,
  PlanetType,
  CargoType as CargoTypeValue,
} from "../data/types.ts";
import { PLANET_CARGO_PROFILES } from "../data/constants.ts";
import { getTheme } from "@spacebiz/ui";

const PLANET_TYPE_COLORS: Record<PlanetType, number> = {
  agricultural: 0x68b45a,
  mining: 0x8b8e97,
  techWorld: 0x73ddff,
  manufacturing: 0x9b8870,
  luxuryWorld: 0xff7fd3,
  coreWorld: 0xf6b04f,
  frontier: 0x4b86d6,
};

const PLANET_ZONE_RANK: Record<PlanetType, number> = {
  mining: 0,
  techWorld: 1,
  manufacturing: 2,
  agricultural: 3,
  luxuryWorld: 4,
  frontier: 5,
  coreWorld: 6,
};

export interface RoutePickerMapConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  onPlanetClick?: (planetId: string) => void;
  onPlanetHover?: (planetId: string | null) => void;
}

export interface RoutePickerDrawOptions {
  systems: StarSystem[];
  planets: Planet[];
  activeRoutes: ActiveRoute[];
  originPlanetId: string | null;
  destinationPlanetId: string | null;
  cargoType: CargoTypeValue | null;
  hoveredPlanetId?: string | null;
}

interface PlanetHit {
  id: string;
  mx: number;
  my: number;
  r: number;
}

export class RoutePickerMap {
  private readonly scene: Phaser.Scene;
  private readonly x: number;
  private readonly y: number;
  private readonly width: number;
  private readonly height: number;
  private readonly depth: number;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly hitZone: Phaser.GameObjects.Zone;
  private hoverLabel: Phaser.GameObjects.Text;
  private planetHits: PlanetHit[] = [];
  private planetById = new Map<string, Planet>();
  private currentHover: string | null = null;
  private readonly onPlanetClick?: (planetId: string) => void;
  private readonly onPlanetHover?: (planetId: string | null) => void;

  constructor(config: RoutePickerMapConfig) {
    this.scene = config.scene;
    this.x = config.x;
    this.y = config.y;
    this.width = config.width;
    this.height = config.height;
    this.depth = config.depth;
    this.onPlanetClick = config.onPlanetClick;
    this.onPlanetHover = config.onPlanetHover;

    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(this.depth);

    const theme = getTheme();
    this.hoverLabel = this.scene.add.text(
      this.x + this.width / 2,
      this.y + this.height - 4,
      "",
      {
        fontSize: `${theme.fonts.caption.size}px`,
        fontFamily: theme.fonts.caption.family,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2,
      },
    );
    this.hoverLabel.setOrigin(0.5, 1);
    this.hoverLabel.setDepth(this.depth + 1);

    this.hitZone = this.scene.add.zone(
      this.x + this.width / 2,
      this.y + this.height / 2,
      this.width,
      this.height,
    );
    this.hitZone.setOrigin(0.5);
    this.hitZone.setDepth(this.depth + 2);
    this.hitZone.setInteractive();

    this.hitZone.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const planetId = this.findPlanetAt(pointer.worldX, pointer.worldY);
      if (planetId !== this.currentHover) {
        this.currentHover = planetId;
        this.updateHoverLabel(planetId);
        this.onPlanetHover?.(planetId);
      }
    });
    this.hitZone.on("pointerout", () => {
      if (this.currentHover !== null) {
        this.currentHover = null;
        this.updateHoverLabel(null);
        this.onPlanetHover?.(null);
      }
    });
    this.hitZone.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      const planetId = this.findPlanetAt(pointer.worldX, pointer.worldY);
      if (planetId) {
        this.onPlanetClick?.(planetId);
      }
    });

    this.drawBackground();
  }

  /**
   * Render the galaxy with all systems + their planets.
   * Plants are clickable. If cargoType is set, planet halos scale with
   * demand-match (or production-match) for that cargo.
   */
  draw(opts: RoutePickerDrawOptions): void {
    this.graphics.clear();
    this.drawBackground();
    this.planetHits = [];
    this.planetById.clear();
    for (const p of opts.planets) this.planetById.set(p.id, p);

    if (opts.systems.length === 0) return;

    const theme = getTheme();
    const padding = 14;
    const innerX = this.x + padding;
    const innerY = this.y + padding;
    const innerW = this.width - padding * 2;
    const innerH = this.height - padding * 2;

    // Bounding box of systems
    let minSX = Infinity,
      maxSX = -Infinity,
      minSY = Infinity,
      maxSY = -Infinity;
    for (const sys of opts.systems) {
      if (sys.x < minSX) minSX = sys.x;
      if (sys.x > maxSX) maxSX = sys.x;
      if (sys.y < minSY) minSY = sys.y;
      if (sys.y > maxSY) maxSY = sys.y;
    }
    const rangeX = maxSX - minSX || 1;
    const rangeY = maxSY - minSY || 1;

    const mapSystem = (sx: number, sy: number) => ({
      mx: innerX + ((sx - minSX) / rangeX) * innerW,
      my: innerY + ((sy - minSY) / rangeY) * innerH,
    });

    // Compute system screen positions
    const sysPos = new Map<string, { mx: number; my: number }>();
    for (const sys of opts.systems) sysPos.set(sys.id, mapSystem(sys.x, sys.y));

    // Group planets by system, sort using same rule as MiniMap/SystemMapScene
    const planetsBySystem = new Map<string, Planet[]>();
    for (const p of opts.planets) {
      const arr = planetsBySystem.get(p.systemId) ?? [];
      arr.push(p);
      planetsBySystem.set(p.systemId, arr);
    }
    for (const list of planetsBySystem.values()) {
      list.sort((a, b) => {
        const z = PLANET_ZONE_RANK[a.type] - PLANET_ZONE_RANK[b.type];
        if (z !== 0) return z;
        const pop = b.population - a.population;
        if (pop !== 0) return pop;
        return a.id.localeCompare(b.id);
      });
    }

    // Compute planet screen positions: small orbit offsets around each star.
    const planetScreenPos = new Map<string, { mx: number; my: number }>();
    const orbitRadius = 7;
    for (const sys of opts.systems) {
      const center = sysPos.get(sys.id)!;
      const list = planetsBySystem.get(sys.id) ?? [];
      const seedAngle = (hashString(sys.id) % 360) * (Math.PI / 180);
      for (let i = 0; i < list.length; i++) {
        const angle = seedAngle + (i / Math.max(1, list.length)) * Math.PI * 2;
        const r = orbitRadius + (i % 2) * 2;
        const mx = center.mx + Math.cos(angle) * r;
        const my = center.my + Math.sin(angle) * r;
        planetScreenPos.set(list[i].id, { mx, my });
      }
    }

    // Draw existing active routes as dim lines (planet → planet)
    this.graphics.lineStyle(1, theme.colors.accent, 0.12);
    for (const route of opts.activeRoutes) {
      const a = planetScreenPos.get(route.originPlanetId);
      const b = planetScreenPos.get(route.destinationPlanetId);
      if (!a || !b) continue;
      this.graphics.beginPath();
      this.graphics.moveTo(a.mx, a.my);
      this.graphics.lineTo(b.mx, b.my);
      this.graphics.strokePath();
    }

    // Draw star centers (dim)
    for (const sys of opts.systems) {
      const p = sysPos.get(sys.id)!;
      this.graphics.fillStyle(sys.starColor, 0.55);
      this.graphics.fillCircle(p.mx, p.my, 1.4);
    }

    // Draw planets — base dot + optional demand halo + selection highlight
    const hits: PlanetHit[] = [];
    for (const planet of opts.planets) {
      const pos = planetScreenPos.get(planet.id);
      if (!pos) continue;

      const baseColor = PLANET_TYPE_COLORS[planet.type] ?? 0xcccccc;
      const isOrigin = planet.id === opts.originPlanetId;
      const isDest = planet.id === opts.destinationPlanetId;
      const isHover = planet.id === opts.hoveredPlanetId;

      // Demand halo when cargo selected
      if (opts.cargoType) {
        const intensity = demandIntensity(planet.type, opts.cargoType);
        if (intensity > 0) {
          this.graphics.fillStyle(theme.colors.profit, 0.18 * intensity);
          this.graphics.fillCircle(pos.mx, pos.my, 5 + 2 * intensity);
        }
      }

      // Selection rings
      if (isOrigin) {
        this.graphics.lineStyle(2, theme.colors.profit, 0.95);
        this.graphics.strokeCircle(pos.mx, pos.my, 5);
      } else if (isDest) {
        this.graphics.lineStyle(2, theme.colors.warning, 0.95);
        this.graphics.strokeCircle(pos.mx, pos.my, 5);
      } else if (isHover) {
        this.graphics.lineStyle(1, theme.colors.accent, 0.7);
        this.graphics.strokeCircle(pos.mx, pos.my, 4);
      }

      // Planet dot
      this.graphics.fillStyle(baseColor, isOrigin || isDest ? 1.0 : 0.85);
      this.graphics.fillCircle(pos.mx, pos.my, 2.3);

      hits.push({ id: planet.id, mx: pos.mx, my: pos.my, r: 6 });
    }

    // Draw the proposed route line (origin → destination) if both set
    if (opts.originPlanetId && opts.destinationPlanetId) {
      const a = planetScreenPos.get(opts.originPlanetId);
      const b = planetScreenPos.get(opts.destinationPlanetId);
      if (a && b) {
        this.graphics.lineStyle(
          2,
          opts.cargoType ? theme.colors.accent : theme.colors.text,
          0.85,
        );
        this.graphics.beginPath();
        this.graphics.moveTo(a.mx, a.my);
        this.graphics.lineTo(b.mx, b.my);
        this.graphics.strokePath();
      }
    }

    this.planetHits = hits;
    this.updateHoverLabel(this.currentHover);
  }

  /** Find planet under a world-space point, or null. */
  findPlanetAt(worldX: number, worldY: number): string | null {
    let bestId: string | null = null;
    let bestDist = Infinity;
    for (const hit of this.planetHits) {
      const dx = hit.mx - worldX;
      const dy = hit.my - worldY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < hit.r && d < bestDist) {
        bestDist = d;
        bestId = hit.id;
      }
    }
    return bestId;
  }

  destroy(): void {
    this.graphics.destroy();
    this.hitZone.destroy();
    this.hoverLabel.destroy();
  }

  getGameObjects(): Phaser.GameObjects.GameObject[] {
    return [this.graphics, this.hoverLabel, this.hitZone];
  }

  private drawBackground(): void {
    const theme = getTheme();
    this.graphics.fillStyle(theme.colors.background, 0.7);
    this.graphics.fillRect(this.x, this.y, this.width, this.height);
    this.graphics.lineStyle(1, theme.colors.panelBorder, 0.5);
    this.graphics.strokeRect(this.x, this.y, this.width, this.height);
  }

  private updateHoverLabel(planetId: string | null): void {
    if (!planetId) {
      this.hoverLabel.setText("");
      return;
    }
    const planet = this.planetById.get(planetId);
    if (!planet) {
      this.hoverLabel.setText("");
      return;
    }
    this.hoverLabel.setText(`${planet.name} (${planet.type})`);
  }
}

/**
 * Demand intensity (0..1) for a cargo type at a planet of the given type.
 * 1.0 = strong demand, 0.6 = strong production, 0 = no fit.
 * For Passengers we treat all planets as moderate demand.
 */
function demandIntensity(
  planetType: PlanetType,
  cargoType: CargoTypeValue,
): number {
  if (cargoType === "passengers") return 0.5;
  const profile = PLANET_CARGO_PROFILES[planetType];
  if (!profile) return 0;
  if (profile.demands.includes(cargoType as never)) return 1.0;
  if (profile.produces.includes(cargoType as never)) return 0.6;
  return 0;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

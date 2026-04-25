import * as Phaser from "phaser";
import type {
  StarSystem,
  Planet,
  ActiveRoute,
  PlanetType,
} from "../data/types.ts";
import { getTheme, colorToString } from "./Theme.ts";

const PLANET_TYPE_COLORS: Record<PlanetType, number> = {
  terran: 0x4b86d6,
  industrial: 0x9b8870,
  mining: 0x8b8e97,
  agricultural: 0x68b45a,
  hubStation: 0xf6b04f,
  resort: 0xff7fd3,
  research: 0x73ddff,
};

const PLANET_ZONE_RANK: Record<PlanetType, number> = {
  mining: 0,
  industrial: 1,
  terran: 2,
  agricultural: 3,
  research: 4,
  resort: 5,
  hubStation: 6,
};

export interface MiniMapConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

export class MiniMap {
  private readonly scene: Phaser.Scene;
  private readonly x: number;
  private readonly y: number;
  private readonly width: number;
  private readonly height: number;
  private readonly depth: number;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly labelText: Phaser.GameObjects.Text;

  constructor(config: MiniMapConfig) {
    this.scene = config.scene;
    this.x = config.x;
    this.y = config.y;
    this.width = config.width;
    this.height = config.height;
    this.depth = config.depth;

    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(this.depth);

    const theme = getTheme();
    this.labelText = this.scene.add.text(
      this.x + this.width / 2,
      this.y + 4,
      "",
      {
        fontSize: `${theme.fonts.caption.size}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(theme.colors.textDim),
        stroke: "#000000",
        strokeThickness: 1,
      },
    );
    this.labelText.setOrigin(0.5, 0);
    this.labelText.setDepth(this.depth);

    this.drawBackground();
  }

  /** Draw galaxy view highlighting the route between two systems */
  drawGalaxyRoute(
    systems: StarSystem[],
    originSystemId: string,
    destSystemId: string,
    activeRoutes: ActiveRoute[],
    planets: Planet[],
  ): void {
    this.clear();
    this.drawBackground();
    this.labelText.setText("");

    if (systems.length === 0) return;

    const theme = getTheme();
    const padding = 12;
    const innerX = this.x + padding;
    const innerY = this.y + padding;
    const innerW = this.width - padding * 2;
    const innerH = this.height - padding * 2;

    // Compute bounding box of all systems
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const sys of systems) {
      if (sys.x < minX) minX = sys.x;
      if (sys.x > maxX) maxX = sys.x;
      if (sys.y < minY) minY = sys.y;
      if (sys.y > maxY) maxY = sys.y;
    }

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const mapCoord = (sx: number, sy: number) => ({
      mx: innerX + ((sx - minX) / rangeX) * innerW,
      my: innerY + ((sy - minY) / rangeY) * innerH,
    });

    // Build planetId -> systemId lookup for route rendering
    const planetSystemMap = new Map<string, string>();
    for (const p of planets) {
      planetSystemMap.set(p.id, p.systemId);
    }

    // Build systemId -> mapped coords
    const systemCoords = new Map<string, { mx: number; my: number }>();
    for (const sys of systems) {
      systemCoords.set(sys.id, mapCoord(sys.x, sys.y));
    }

    // Draw existing active routes as dim lines
    this.graphics.lineStyle(1, theme.colors.accent, 0.15);
    for (const route of activeRoutes) {
      const oSysId = planetSystemMap.get(route.originPlanetId);
      const dSysId = planetSystemMap.get(route.destinationPlanetId);
      if (!oSysId || !dSysId) continue;
      // Skip the route we're about to highlight
      if (
        (oSysId === originSystemId && dSysId === destSystemId) ||
        (oSysId === destSystemId && dSysId === originSystemId)
      )
        continue;
      const oPos = systemCoords.get(oSysId);
      const dPos = systemCoords.get(dSysId);
      if (!oPos || !dPos) continue;
      this.graphics.beginPath();
      this.graphics.moveTo(oPos.mx, oPos.my);
      this.graphics.lineTo(dPos.mx, dPos.my);
      this.graphics.strokePath();
    }

    // Draw all systems as dim dots
    for (const sys of systems) {
      const { mx, my } = systemCoords.get(sys.id)!;
      const isOrigin = sys.id === originSystemId;
      const isDest = sys.id === destSystemId;

      if (isOrigin || isDest) continue; // draw highlighted ones after
      this.graphics.fillStyle(sys.starColor, 0.3);
      this.graphics.fillCircle(mx, my, 2);
    }

    // Draw the route line between origin and destination systems
    const originSys = systems.find((s) => s.id === originSystemId);
    const destSys = systems.find((s) => s.id === destSystemId);
    if (originSys && destSys) {
      const oCoord = systemCoords.get(originSystemId)!;
      const dCoord = systemCoords.get(destSystemId)!;

      // Route line
      this.graphics.lineStyle(1, theme.colors.accent, 0.7);
      this.graphics.beginPath();
      this.graphics.moveTo(oCoord.mx, oCoord.my);
      this.graphics.lineTo(dCoord.mx, dCoord.my);
      this.graphics.strokePath();

      // Origin system — bright with glow
      this.graphics.fillStyle(theme.colors.profit, 0.25);
      this.graphics.fillCircle(oCoord.mx, oCoord.my, 6);
      this.graphics.fillStyle(originSys.starColor, 0.9);
      this.graphics.fillCircle(oCoord.mx, oCoord.my, 3);

      // Destination system — bright with glow
      this.graphics.fillStyle(theme.colors.warning, 0.25);
      this.graphics.fillCircle(dCoord.mx, dCoord.my, 6);
      this.graphics.fillStyle(destSys.starColor, 0.9);
      this.graphics.fillCircle(dCoord.mx, dCoord.my, 3);
    }
  }

  /** Draw system view highlighting two planets within the same system */
  drawSystemRoute(
    system: StarSystem,
    planets: Planet[],
    originPlanetId: string,
    destPlanetId: string,
  ): void {
    this.clear();
    this.drawBackground();

    // Show system name at top
    this.labelText.setText(system.name);

    const theme = getTheme();
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2 + 6; // shift down a bit for label

    // Central star
    this.graphics.fillStyle(system.starColor, 0.15);
    this.graphics.fillCircle(cx, cy, 12);
    this.graphics.fillStyle(system.starColor, 0.5);
    this.graphics.fillCircle(cx, cy, 5);

    if (planets.length === 0) return;

    // Sort planets same way as SystemMapScene
    const sortedPlanets = [...planets].sort((a, b) => {
      const zoneDiff = PLANET_ZONE_RANK[a.type] - PLANET_ZONE_RANK[b.type];
      if (zoneDiff !== 0) return zoneDiff;
      const popDiff = b.population - a.population;
      if (popDiff !== 0) return popDiff;
      return a.id.localeCompare(b.id);
    });

    // Compute orbit radii scaled to mini-map
    const maxOrbitRadius = Math.min(this.width / 2 - 10, this.height / 2 - 16);
    const minOrbitRadius = 18;
    const orbitStep =
      sortedPlanets.length > 1
        ? Math.max(
            8,
            Math.min(
              16,
              (maxOrbitRadius - minOrbitRadius) / (sortedPlanets.length - 1),
            ),
          )
        : 0;

    const orbitRadii = sortedPlanets.map(
      (_p, i) => minOrbitRadius + i * orbitStep,
    );

    // Compute angular positions (same algorithm as SystemMapScene)
    const systemSeed = hashString(system.id);
    const baseAngle = -Math.PI / 2 + ((systemSeed % 360) * Math.PI) / 180;
    const angleStep =
      sortedPlanets.length > 0 ? (Math.PI * 2) / sortedPlanets.length : 0;

    // Draw orbit rings
    for (const r of orbitRadii) {
      this.graphics.lineStyle(1, theme.colors.panelBorder, 0.2);
      this.graphics.strokeCircle(cx, cy, r);
    }

    // Compute planet positions
    const planetPositions = new Map<string, { px: number; py: number }>();
    sortedPlanets.forEach((planet, index) => {
      const wobble = index % 2 === 0 ? 0.11 : -0.11;
      const angle = baseAngle + index * angleStep + wobble;
      const r = orbitRadii[index] ?? minOrbitRadius;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      planetPositions.set(planet.id, { px, py });
    });

    // Draw route line between origin and destination
    const oPos = planetPositions.get(originPlanetId);
    const dPos = planetPositions.get(destPlanetId);
    if (oPos && dPos) {
      this.graphics.lineStyle(1, theme.colors.accent, 0.6);
      this.graphics.beginPath();
      this.graphics.moveTo(oPos.px, oPos.py);
      this.graphics.lineTo(dPos.px, dPos.py);
      this.graphics.strokePath();
    }

    // Draw planets
    for (const planet of sortedPlanets) {
      const pos = planetPositions.get(planet.id);
      if (!pos) continue;

      const isOrigin = planet.id === originPlanetId;
      const isDest = planet.id === destPlanetId;
      const baseColor = PLANET_TYPE_COLORS[planet.type] ?? 0xcccccc;

      if (isOrigin || isDest) {
        // Highlighted planet — glow + larger dot
        const glowColor = isOrigin ? theme.colors.profit : theme.colors.warning;
        this.graphics.fillStyle(glowColor, 0.3);
        this.graphics.fillCircle(pos.px, pos.py, 5);
        this.graphics.fillStyle(baseColor, 1.0);
        this.graphics.fillCircle(pos.px, pos.py, 3);
      } else {
        // Normal planet — small dim dot
        this.graphics.fillStyle(baseColor, 0.5);
        this.graphics.fillCircle(pos.px, pos.py, 2);
      }
    }
  }

  /** Show a placeholder when no valid route is selected */
  drawEmpty(message?: string): void {
    this.clear();
    this.drawBackground();
    this.labelText.setText(message ?? "");
  }

  /** Clear drawn content (keeps background) */
  clear(): void {
    this.graphics.clear();
    this.labelText.setText("");
  }

  /** Remove all game objects */
  destroy(): void {
    this.graphics.destroy();
    this.labelText.destroy();
  }

  /** Return the graphics and label for layer tracking */
  getGameObjects(): Phaser.GameObjects.GameObject[] {
    return [this.graphics, this.labelText];
  }

  private drawBackground(): void {
    const theme = getTheme();
    // Dark background rect
    this.graphics.fillStyle(theme.colors.background, 0.7);
    this.graphics.fillRect(this.x, this.y, this.width, this.height);
    // Subtle border
    this.graphics.lineStyle(1, theme.colors.panelBorder, 0.4);
    this.graphics.strokeRect(this.x, this.y, this.width, this.height);
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

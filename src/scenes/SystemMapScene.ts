import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import type { PlanetType } from "../data/types.ts";
import { getTheme, colorToString } from "../ui/Theme.ts";
import { Label } from "../ui/Label.ts";
import { Button } from "../ui/Button.ts";
import { PortraitPanel } from "../ui/PortraitPanel.ts";
import { createStarfield } from "../ui/Starfield.ts";
import {
  CONTENT_TOP,
  CONTENT_HEIGHT,
  SIDEBAR_LEFT,
  SIDEBAR_WIDTH,
  MAIN_CONTENT_LEFT,
  MAIN_CONTENT_WIDTH,
} from "../ui/Layout.ts";

import type { GameHUDScene } from "./GameHUDScene.ts";

const PLANET_TYPE_COLORS: Record<PlanetType, number> = {
  terran: 0x4488ff,
  industrial: 0xaa8844,
  mining: 0x888888,
  agricultural: 0x44aa44,
  hubStation: 0xffaa00,
  resort: 0xff44ff,
  research: 0x44ffff,
};

export class SystemMapScene extends Phaser.Scene {
  private systemId = "";
  private portraitPanel: PortraitPanel | null = null;

  constructor() {
    super({ key: "SystemMapScene" });
  }

  init(data: { systemId: string }): void {
    this.systemId = data.systemId;
  }

  create(): void {
    const theme = getTheme();
    const state = gameStore.getState();
    const system = state.galaxy.systems.find((s) => s.id === this.systemId);
    if (!system) return;

    const planets = state.galaxy.planets.filter(
      (p) => p.systemId === this.systemId,
    );
    const routes = state.activeRoutes;

    // Starfield background
    createStarfield(this);

    // PortraitPanel as left sidebar showing system portrait
    this.portraitPanel = new PortraitPanel(this, {
      x: SIDEBAR_LEFT,
      y: CONTENT_TOP,
      width: SIDEBAR_WIDTH,
      height: CONTENT_HEIGHT,
    });
    this.portraitPanel.showSystem(system, planets.length);

    // Center the solar system visualization within the main content area
    const cx = MAIN_CONTENT_LEFT + MAIN_CONTENT_WIDTH / 2;
    const cy = CONTENT_TOP + CONTENT_HEIGHT / 2;

    // Title: small caption label at top center of content area
    new Label(this, {
      x: cx,
      y: CONTENT_TOP + 10,
      text: system.name,
      style: "caption",
      color: theme.colors.textDim,
    }).setOrigin(0.5, 0);

    // Back button: glass styled, using Layout constants
    new Button(this, {
      x: MAIN_CONTENT_LEFT,
      y: CONTENT_TOP + CONTENT_HEIGHT - 50,
      width: 160,
      label: "Back to Galaxy",
      onClick: () => {
        const hud = this.scene.get("GameHUDScene") as GameHUDScene;
        hud.switchContentScene("GalaxyMapScene");
      },
    });

    // Central star with multi-layer glow
    const starRadius = 30;

    // Outermost glow layer
    this.add
      .circle(cx, cy, starRadius * 3, system.starColor)
      .setAlpha(0.08);

    // Middle glow layer
    this.add
      .circle(cx, cy, starRadius * 2, system.starColor)
      .setAlpha(0.2);

    // Central star
    this.add.circle(cx, cy, starRadius, system.starColor);

    // Build planet positions in a circular layout
    const orbitRadius = Math.min(180, MAIN_CONTENT_WIDTH / 2 - 60, CONTENT_HEIGHT / 2 - 80);
    const planetPositions = new Map<string, { x: number; y: number }>();

    planets.forEach((planet, index) => {
      const angle =
        (index / Math.max(planets.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(angle) * orbitRadius;
      const py = cy + Math.sin(angle) * orbitRadius;
      planetPositions.set(planet.id, { x: px, y: py });
    });

    // Draw intra-system route lines
    const routeGraphics = this.add.graphics();
    routeGraphics.lineStyle(1, theme.colors.accent, 0.35);
    for (const route of routes) {
      const originPos = planetPositions.get(route.originPlanetId);
      const destPos = planetPositions.get(route.destinationPlanetId);
      if (!originPos || !destPos) continue;

      routeGraphics.beginPath();
      routeGraphics.moveTo(originPos.x, originPos.y);
      routeGraphics.lineTo(destPos.x, destPos.y);
      routeGraphics.strokePath();
    }

    // Draw orbit ring (decorative)
    const orbitGraphics = this.add.graphics();
    orbitGraphics.lineStyle(1, theme.colors.panelBorder, 0.3);
    orbitGraphics.strokeCircle(cx, cy, orbitRadius);

    // Draw planets
    for (let i = 0; i < planets.length; i++) {
      const planet = planets[i];
      const pos = planetPositions.get(planet.id);
      if (!pos) continue;

      const planetColor = PLANET_TYPE_COLORS[planet.type] ?? 0xcccccc;
      const planetRadius = 16;

      // Planet glow halo
      this.add
        .circle(pos.x, pos.y, planetRadius * 1.8, planetColor)
        .setAlpha(0.15);

      const planetCircle = this.add.circle(pos.x, pos.y, planetRadius, planetColor);
      planetCircle.setInteractive({ useHandCursor: true });

      // Planet name
      this.add
        .text(pos.x, pos.y + 22, planet.name, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.text),
        })
        .setOrigin(0.5, 0);

      // Planet type label
      this.add
        .text(pos.x, pos.y + 36, planet.type, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
        })
        .setOrigin(0.5, 0);

      // Click to see planet detail — launch as overlay
      const planetIndex = i;
      planetCircle.on("pointerup", () => {
        // Update the PortraitPanel to show the planet
        if (this.portraitPanel) {
          this.portraitPanel.showPlanet(planet, planetIndex);
        }
        // Launch PlanetDetail as overlay on top (don't pause self — HUD stays active)
        if (!this.scene.isActive("PlanetDetailScene")) {
          this.scene.launch("PlanetDetailScene", { planetId: planet.id });
        }
      });

      // Hover effect
      planetCircle.on("pointerover", () => {
        planetCircle.setRadius(20);
      });
      planetCircle.on("pointerout", () => {
        planetCircle.setRadius(planetRadius);
      });
    }
  }
}

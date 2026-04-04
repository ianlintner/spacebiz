import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import type { PlanetType } from "../data/types.ts";
import type { Planet } from "../data/types.ts";
import { getTheme, colorToString } from "../ui/Theme.ts";
import { Label } from "../ui/Label.ts";
import { Button } from "../ui/Button.ts";
import { PortraitPanel } from "../ui/PortraitPanel.ts";
import { createStarfield } from "../ui/Starfield.ts";
import { addPulseTween, addRotateTween } from "../ui/AmbientFX.ts";
import { DEPTH_AMBIENT_MID } from "../ui/DepthLayers.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import { SeededRNG } from "../utils/SeededRNG.ts";
import {
  CONTENT_TOP,
  CONTENT_HEIGHT,
  SIDEBAR_LEFT,
  SIDEBAR_WIDTH,
  MAIN_CONTENT_LEFT,
  MAIN_CONTENT_WIDTH,
} from "../ui/Layout.ts";

import type { GameHUDScene } from "./GameHUDScene.ts";

const PLANET_BASE_COLORS: Record<PlanetType, number> = {
  terran: 0x4b86d6,
  industrial: 0x9b8870,
  mining: 0x8b8e97,
  agricultural: 0x68b45a,
  hubStation: 0xf6b04f,
  resort: 0xff7fd3,
  research: 0x73ddff,
};

const PLANET_DETAIL_COLORS: Record<PlanetType, number> = {
  terran: 0x4bd06c,
  industrial: 0xc9a87b,
  mining: 0xb8bcc9,
  agricultural: 0xa7d56b,
  hubStation: 0xffd789,
  resort: 0xffc9f6,
  research: 0xbf96ff,
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

    this.events.once("shutdown", () => {
      if (this.scene.isActive("PlanetDetailScene")) {
        this.scene.stop("PlanetDetailScene");
      }
    });

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

    this.add
      .text(
        MAIN_CONTENT_LEFT + MAIN_CONTENT_WIDTH - 8,
        CONTENT_TOP + 10,
        "Concentric orbits: inner industry → outer leisure/hubs\nPlanet size scales with population",
        {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
          align: "right",
        },
      )
      .setOrigin(1, 0)
      .setAlpha(0.85);

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

    // Outermost glow layer — slow deep pulse
    const outerGlow = this.add
      .circle(cx, cy, starRadius * 3, system.starColor)
      .setAlpha(0.08);
    addPulseTween(this, outerGlow, {
      minAlpha: 0.04,
      maxAlpha: 0.14,
      duration: 3500,
    });

    // Middle glow layer — faster pulse offset in time for starburst depth
    const middleGlow = this.add
      .circle(cx, cy, starRadius * 2, system.starColor)
      .setAlpha(0.2);
    addPulseTween(this, middleGlow, {
      minAlpha: 0.12,
      maxAlpha: 0.32,
      duration: 2000,
      delay: 500,
    });

    // Central star
    this.add.circle(cx, cy, starRadius, system.starColor);

    // Ordered concentric orbits: inner worlds first, outer leisure/hub worlds last.
    const sortedPlanets = [...planets].sort((a, b) => {
      const zoneDiff = PLANET_ZONE_RANK[a.type] - PLANET_ZONE_RANK[b.type];
      if (zoneDiff !== 0) return zoneDiff;
      const popDiff = b.population - a.population;
      if (popDiff !== 0) return popDiff;
      return a.id.localeCompare(b.id);
    });

    const maxOrbitRadius = Math.min(
      MAIN_CONTENT_WIDTH / 2 - 64,
      CONTENT_HEIGHT / 2 - 56,
    );
    const minOrbitRadius = 86;
    const orbitStep =
      sortedPlanets.length > 1
        ? Math.max(
            34,
            Math.min(
              62,
              (maxOrbitRadius - minOrbitRadius) / (sortedPlanets.length - 1),
            ),
          )
        : 0;

    const orbitRadii = sortedPlanets.map(
      (_p, i) => minOrbitRadius + i * orbitStep,
    );

    const planetPositions = new Map<string, { x: number; y: number }>();
    const systemSeed = hashString(system.id);
    const baseAngle = -Math.PI / 2 + ((systemSeed % 360) * Math.PI) / 180;
    const angleStep =
      sortedPlanets.length > 0 ? (Math.PI * 2) / sortedPlanets.length : 0;

    sortedPlanets.forEach((planet, index) => {
      const wobble = index % 2 === 0 ? 0.11 : -0.11;
      const angle = baseAngle + index * angleStep + wobble;
      const r = orbitRadii[index] ?? minOrbitRadius;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
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

    // Route line breathing animation
    this.tweens.add({
      targets: routeGraphics,
      alpha: {
        from: theme.ambient.routePulseAlphaMin,
        to: theme.ambient.routePulseAlphaMax,
      },
      duration: theme.ambient.routePulseDuration,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Draw concentric orbital rings
    const orbitGraphics = this.add.graphics();
    for (let i = 0; i < orbitRadii.length; i++) {
      const r = orbitRadii[i];
      orbitGraphics.lineStyle(1, theme.colors.panelBorder, 0.14 + i * 0.01);
      orbitGraphics.strokeCircle(cx, cy, r);
    }

    // Slowly-rotating tick marks around the orbit — give the system a living feel
    const orbitalContainer = this.add
      .container(cx, cy)
      .setDepth(DEPTH_AMBIENT_MID);
    const orbDecoGraphics = this.add.graphics();
    orbDecoGraphics.lineStyle(1, theme.colors.panelBorder, 0.4);
    const tickLen = 7;
    const tickCount = 10;
    const decoRadius = orbitRadii[Math.max(0, orbitRadii.length - 1)] ?? 130;
    for (let t = 0; t < tickCount; t++) {
      const angle = (t / tickCount) * Math.PI * 2;
      const inner = decoRadius - tickLen * 0.5;
      const outer = decoRadius + tickLen * 0.5;
      orbDecoGraphics.beginPath();
      orbDecoGraphics.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      orbDecoGraphics.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      orbDecoGraphics.strokePath();
    }
    orbitalContainer.add(orbDecoGraphics);
    addRotateTween(
      this,
      orbitalContainer,
      theme.ambient.orbitalRotationDuration,
    );

    // Draw planets as generated pixel-sphere sprites with varied scale and color.
    for (let i = 0; i < sortedPlanets.length; i++) {
      const planet = sortedPlanets[i];
      const pos = planetPositions.get(planet.id);
      if (!pos) continue;

      const planetColor = PLANET_BASE_COLORS[planet.type] ?? 0xcccccc;
      const planetDiameter = getPlanetDiameter(planet);

      // Planet glow halo — gentle ambient pulse
      const planetHalo = this.add
        .circle(pos.x, pos.y, planetDiameter * 0.95, planetColor)
        .setAlpha(0.15);
      addPulseTween(this, planetHalo, {
        minAlpha: 0.07,
        maxAlpha: 0.25,
        duration: 2000 + Math.random() * 2000,
        delay: Math.random() * 2000,
      });

      const texKey = ensurePlanetTexture(
        this,
        planet.type,
        planetDiameter,
        hashString(planet.id),
      );
      const planetSprite = this.add
        .image(pos.x, pos.y, texKey)
        .setOrigin(0.5, 0.5);
      planetSprite.setInteractive(
        new Phaser.Geom.Circle(0, 0, Math.max(planetDiameter * 0.78, 16)),
        Phaser.Geom.Circle.Contains,
      );
      if (planetSprite.input) {
        planetSprite.input.cursor = "pointer";
      }

      // Planet name
      this.add
        .text(pos.x, pos.y + planetDiameter * 0.65 + 8, planet.name, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.text),
        })
        .setOrigin(0.5, 0);

      // Planet type label
      this.add
        .text(pos.x, pos.y + planetDiameter * 0.65 + 22, planet.type, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
        })
        .setOrigin(0.5, 0);

      // Click to see planet detail — launch as overlay
      const planetIndex = sortedPlanets.findIndex((p) => p.id === planet.id);
      planetSprite.on("pointerup", () => {
        getAudioDirector().sfx("map_star_select");
        // Update the PortraitPanel to show the planet
        if (this.portraitPanel) {
          this.portraitPanel.showPlanet(planet, planetIndex);
        }
        // Relaunch PlanetDetail so switching planets never leaves a stale overlay stacked up.
        if (this.scene.isActive("PlanetDetailScene")) {
          this.scene.stop("PlanetDetailScene");
        }
        this.scene.launch("PlanetDetailScene", { planetId: planet.id });
      });

      // Hover effect
      planetSprite.on("pointerover", () => {
        planetSprite.setScale(1.15);
        planetHalo.setAlpha(0.34);
      });
      planetSprite.on("pointerout", () => {
        planetSprite.setScale(1);
        planetHalo.setAlpha(0.15);
      });
    }
  }
}

function getPlanetDiameter(planet: Planet): number {
  const baseByType: Record<PlanetType, number> = {
    terran: 22,
    industrial: 20,
    mining: 16,
    agricultural: 19,
    hubStation: 18,
    resort: 18,
    research: 17,
  };

  const base = baseByType[planet.type] ?? 18;
  const popFactor = Phaser.Math.Clamp(
    Math.log10(Math.max(planet.population, 1)) - 4,
    0,
    3.4,
  );
  return Phaser.Math.Clamp(Math.round(base + popFactor * 1.5), 14, 28);
}

function ensurePlanetTexture(
  scene: Phaser.Scene,
  planetType: PlanetType,
  diameter: number,
  seed: number,
): string {
  const variant = seed % 7;
  const key = `planet-sphere-${planetType}-${diameter}-${variant}`;
  if (scene.textures.exists(key)) {
    return key;
  }

  const tex = scene.textures.createCanvas(key, diameter, diameter);
  if (!tex) {
    const fallback = scene.add.graphics();
    fallback.clear();
    fallback.fillStyle(PLANET_BASE_COLORS[planetType] ?? 0x999999, 1);
    fallback.fillCircle(diameter / 2, diameter / 2, diameter / 2 - 1);
    fallback.lineStyle(1, 0xffffff, 0.25);
    fallback.strokeCircle(diameter / 2, diameter / 2, diameter / 2 - 1);
    fallback.generateTexture(key, diameter, diameter);
    fallback.destroy();
    return key;
  }

  const ctx = tex.context;
  const rng = new SeededRNG(seed);
  const base = PLANET_BASE_COLORS[planetType] ?? 0x999999;
  const detail = PLANET_DETAIL_COLORS[planetType] ?? 0xbbbbbb;

  const r = diameter / 2;
  const cx = r - 0.5;
  const cy = r - 0.5;

  ctx.clearRect(0, 0, diameter, diameter);

  for (let y = 0; y < diameter; y++) {
    for (let x = 0; x < diameter; x++) {
      const dx = (x - cx) / r;
      const dy = (y - cy) / r;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;

      const nz = Math.sqrt(Math.max(0, 1 - d2));
      const light = dx * -0.45 + dy * -0.6 + nz * 0.95;
      let shade = Phaser.Math.Clamp(0.35 + light * 0.62, 0, 1);

      const swirl =
        Math.sin((x + seed * 0.17) * 0.9) * Math.cos((y - seed * 0.11) * 0.8);
      shade = Phaser.Math.Clamp(shade + swirl * 0.06, 0, 1);

      let color = multiplyColor(base, shade);

      const detailNoise =
        Math.sin((x + seed) * 0.57) +
        Math.cos((y + seed * 0.37) * 0.64) +
        Math.sin((x + y + variant) * 0.31);
      if (detailNoise > 1.35) {
        color = lerpColorInt(color, detail, 0.55);
      }

      if (d2 > 0.84) {
        color = multiplyColor(color, 0.72);
      }

      if (dx < -0.2 && dy < -0.2 && d2 < 0.46 && rng.chance(0.04)) {
        color = lerpColorInt(color, 0xffffff, 0.45);
      }

      ctx.fillStyle = colorToCss(color);
      ctx.fillRect(x, y, 1, 1);
    }
  }

  tex.refresh();
  return key;
}

function multiplyColor(color: number, amount: number): number {
  const r = ((color >> 16) & 0xff) * amount;
  const g = ((color >> 8) & 0xff) * amount;
  const b = (color & 0xff) * amount;
  return (clamp255(r) << 16) | (clamp255(g) << 8) | clamp255(b);
}

function lerpColorInt(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = ar + (br - ar) * t;
  const g = ag + (bg - ag) * t;
  const bl = ab + (bb - ab) * t;
  return (clamp255(r) << 16) | (clamp255(g) << 8) | clamp255(bl);
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

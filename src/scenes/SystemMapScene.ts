import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import type {
  ActiveRoute,
  GameState,
  Planet,
  PlanetType,
  Ship,
} from "../data/types.ts";
import {
  getTheme,
  colorToString,
  Label,
  Button,
  PortraitPanel,
  createStarfield,
  addPulseTween,
  addRotateTween,
  DEPTH_AMBIENT_MID,
  getLayout,
  getShipColor,
  getShipIconKey,
  getShipMapAnimKey,
  getShipMapKey,
  getCargoShortLabel,
} from "../ui/index.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import { SeededRNG } from "../utils/SeededRNG.ts";
import { isEmpireAccessible } from "../game/empire/EmpireAccessManager.ts";
import {
  buildSunAvoidingLocalRouteMotionPath,
  getVisibleRouteTrafficUnits,
} from "../game/routes/RouteManager.ts";

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
  private localTrafficLayer: LocalTrafficLayerHandle | null = null;

  constructor() {
    super({ key: "SystemMapScene" });
  }

  init(data: { systemId: string }): void {
    this.systemId = data.systemId;
  }

  create(): void {
    const theme = getTheme();
    const L = getLayout();
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

    // Starfield background with oversized layered coverage so the main scene
    // reads as deep space instead of a clipped rectangle.
    createStarfield(this, {
      depth: -220,
      drift: true,
      twinkle: true,
      shimmer: true,
      haze: true,
      width: L.gameWidth,
      height: L.gameHeight,
      centerX: L.gameWidth / 2,
      centerY: L.gameHeight / 2,
      minZoom: 1,
      overscan: 260,
      edgeFeather: 0.26,
    });

    // Check if this system's empire is accessible
    const systemEmpireAccessible = isEmpireAccessible(system.empireId, state);
    const systemEmpire = state.galaxy.empires.find(
      (e) => e.id === system.empireId,
    );

    // Trade policy for this system's empire
    const empirePolicy = state.empireTradePolicies[system.empireId];

    // PortraitPanel as left sidebar showing system portrait
    this.portraitPanel = new PortraitPanel(this, {
      x: L.sidebarLeft,
      y: L.contentTop,
      width: L.sidebarWidth,
      height: L.contentHeight,
    });
    this.portraitPanel.showSystem(system, planets.length);

    // Center the solar system visualization within the main content area
    const cx = L.mainContentLeft + L.mainContentWidth / 2;
    const cy = L.contentTop + L.contentHeight / 2;

    // Title: small caption label at top center of content area
    this.add
      .rectangle(cx, L.contentTop + 7, 220, 22, theme.colors.background, 0.42)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.2)
      .setOrigin(0.5, 0);
    new Label(this, {
      x: cx,
      y: L.contentTop + 10,
      text: system.name,
      style: "caption",
      color: theme.colors.textDim,
    }).setOrigin(0.5, 0);

    // Right-edge hint — placed BELOW the system title on its own row so the
    // 3-line hint can't bleed leftward into the centered title at narrow
    // widths (previously rendered as "GaLineos planet for local market …"
    // where the system name and hint collided on the same y coordinate).
    const hintBoxWidth = Math.min(280, L.mainContentWidth - 232);
    if (hintBoxWidth > 160) {
      const hintX = L.mainContentLeft + L.mainContentWidth - 8;
      const hintY = L.contentTop + 34;
      this.add
        .rectangle(
          hintX,
          hintY,
          hintBoxWidth,
          46,
          theme.colors.background,
          0.44,
        )
        .setStrokeStyle(1, theme.colors.panelBorder, 0.2)
        .setOrigin(1, 0);

      this.add
        .text(
          hintX - 6,
          hintY + 4,
          "Click a planet for local market details and route setup\nConcentric orbits: inner industry \u2192 outer leisure/hubs\nPlanet size scales with population",
          {
            fontSize: `${theme.fonts.caption.size}px`,
            fontFamily: theme.fonts.caption.family,
            color: colorToString(theme.colors.textDim),
            align: "right",
            fixedWidth: hintBoxWidth - 12,
          },
        )
        .setOrigin(1, 0)
        .setAlpha(0.85);
    }

    // Back button: glass styled, using Layout constants
    new Button(this, {
      x: L.mainContentLeft,
      y: L.contentTop + L.contentHeight - 50,
      width: 160,
      label: "Back to Galaxy",
      onClick: () => {
        const hud = this.scene.get("GameHUDScene") as GameHUDScene;
        hud.switchContentScene("GalaxyMapScene");
      },
    });

    // Locked empire overlay
    if (!systemEmpireAccessible) {
      const overlayBg = this.add.graphics();
      overlayBg.fillStyle(0x000000, 0.5);
      overlayBg.fillRect(
        L.mainContentLeft,
        L.contentTop,
        L.mainContentWidth,
        L.contentHeight,
      );
      overlayBg.setDepth(900);

      const lockMsg = this.add
        .text(
          cx,
          cy - 20,
          `\uD83D\uDD12 ${systemEmpire?.name ?? "Unknown Empire"}\nLocked — complete a contract to unlock trade`,
          {
            fontSize: `${theme.fonts.body.size}px`,
            fontFamily: theme.fonts.body.family,
            color: colorToString(theme.colors.textDim),
            align: "center",
            stroke: "#000000",
            strokeThickness: 2,
          },
        )
        .setOrigin(0.5, 0.5)
        .setDepth(901);

      addPulseTween(this, lockMsg, {
        minAlpha: 0.6,
        maxAlpha: 1.0,
        duration: 2000,
      });
    }

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
      L.mainContentWidth / 2 - 64,
      L.contentHeight / 2 - 56,
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

    const refreshLocalTraffic = (nextState: GameState): void => {
      this.localTrafficLayer?.destroy();
      this.localTrafficLayer = createLocalRouteTrafficLayer(
        this,
        nextState,
        system.id,
        { x: cx, y: cy },
        planetPositions,
      );
    };
    refreshLocalTraffic(state);
    const handleStateChanged = (nextState: unknown): void => {
      refreshLocalTraffic(nextState as GameState);
    };
    gameStore.on("stateChanged", handleStateChanged);

    // Draw intra-system route lines
    const routeGraphics = this.add.graphics();
    routeGraphics.lineStyle(1, theme.colors.accent, 0.35);
    for (const route of routes) {
      const originPos = planetPositions.get(route.originPlanetId);
      const destPos = planetPositions.get(route.destinationPlanetId);
      if (!originPos || !destPos) continue;

      const path = buildSunAvoidingLocalRouteMotionPath(
        route.id,
        originPos,
        destPos,
        { x: cx, y: cy },
      );

      routeGraphics.beginPath();
      routeGraphics.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        routeGraphics.lineTo(path[i].x, path[i].y);
      }
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

    this.events.once("shutdown", () => {
      gameStore.off("stateChanged", handleStateChanged);
      this.localTrafficLayer?.destroy();
      this.localTrafficLayer = null;
    });
    this.events.once("destroy", () => {
      gameStore.off("stateChanged", handleStateChanged);
      this.localTrafficLayer?.destroy();
      this.localTrafficLayer = null;
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
        new Phaser.Geom.Circle(
          planetSprite.displayWidth / 2,
          planetSprite.displayHeight / 2,
          Math.max(planetDiameter * 0.78, 16),
        ),
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
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0);

      // Planet type label
      this.add
        .text(pos.x, pos.y + planetDiameter * 0.65 + 22, planet.type, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0);

      // Trade policy restriction icons (show banned cargo types)
      if (empirePolicy && systemEmpireAccessible) {
        // Route through getCargoShortLabel so banned cargo types render
        // as e.g. "❌RAW" instead of the camelCase enum id "❌rawMaterials".
        const bans = [
          ...empirePolicy.bannedImports.map(
            (c) => `\u274C${getCargoShortLabel(c)}`,
          ),
          ...empirePolicy.bannedExports.map(
            (c) => `\u26D4${getCargoShortLabel(c)}`,
          ),
        ];
        if (bans.length > 0) {
          this.add
            .text(pos.x, pos.y + planetDiameter * 0.65 + 36, bans.join(" "), {
              fontSize: "9px",
              fontFamily: theme.fonts.caption.family,
              color: colorToString(theme.colors.loss),
              stroke: "#000000",
              strokeThickness: 1,
            })
            .setOrigin(0.5, 0)
            .setAlpha(0.8);
        }
      }

      // Dim planets in locked empires
      if (!systemEmpireAccessible) {
        planetSprite.setAlpha(0.35);
        planetHalo.setAlpha(0.05);
      }

      // Click to see planet detail — launch as overlay
      const planetIndex = sortedPlanets.findIndex((p) => p.id === planet.id);
      planetSprite.on("pointerup", () => {
        if (!systemEmpireAccessible) {
          // Locked — don't open planet detail
          return;
        }
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

type LocalTrafficSprite =
  | Phaser.GameObjects.Sprite
  | Phaser.GameObjects.Image
  | Phaser.GameObjects.Arc;

type LocalMovable = {
  x: number;
  y: number;
  active: boolean;
  setPosition: (x: number, y: number) => unknown;
  setRotation?: (r: number) => unknown;
};

interface LocalTrafficLayerHandle {
  sprites: LocalTrafficSprite[];
  tweens: Phaser.Tweens.Tween[];
  destroy: () => void;
}

function getLocalRouteAssignments(
  state: GameState,
  systemId: string,
): Array<{ route: ActiveRoute; assignedShips: Ship[]; visibleUnits: number }> {
  const planetById = new Map(
    state.galaxy.planets.map((planet) => [planet.id, planet]),
  );
  const sources = [
    { routes: state.activeRoutes, fleet: state.fleet },
    ...state.aiCompanies.map((company) => ({
      routes: company.activeRoutes,
      fleet: company.fleet,
    })),
  ];

  return sources.flatMap(({ routes, fleet }) => {
    const fleetById = new Map(fleet.map((ship) => [ship.id, ship]));

    return routes.flatMap((route) => {
      const origin = planetById.get(route.originPlanetId);
      const destination = planetById.get(route.destinationPlanetId);
      if (!origin || !destination) return [];
      if (origin.systemId !== systemId || destination.systemId !== systemId)
        return [];

      const assignedShips = route.assignedShipIds.flatMap((shipId) => {
        const ship = fleetById.get(shipId);
        return ship ? [ship] : [];
      });
      if (assignedShips.length === 0) return [];

      return [
        {
          route,
          assignedShips,
          visibleUnits: getVisibleRouteTrafficUnits(assignedShips.length),
        },
      ];
    });
  });
}

function createLocalRouteTrafficLayer(
  scene: Phaser.Scene,
  state: GameState,
  systemId: string,
  sun: { x: number; y: number },
  planetPositions: Map<string, { x: number; y: number }>,
): LocalTrafficLayerHandle {
  const sprites: LocalTrafficSprite[] = [];
  const tweens: Phaser.Tweens.Tween[] = [];

  const createTrafficSprite = (
    ship: Ship,
    start: { x: number; y: number },
    unitIndex: number,
    visibleUnits: number,
  ): LocalTrafficSprite => {
    const shipTint = getShipColor(ship.class);
    const mapSprKey = getShipMapKey(ship.class);
    const mapAnimKey = getShipMapAnimKey(ship.class);
    const shipIconKey = getShipIconKey(ship.class);

    if (mapSprKey && mapAnimKey && scene.textures.exists(mapSprKey)) {
      const sprite = scene.add
        .sprite(start.x, start.y, mapSprKey, "1")
        .setDisplaySize(24, 24)
        .setTint(shipTint)
        .setAlpha(Math.max(0.72, 0.92 - unitIndex * 0.04))
        .setDepth(4 + unitIndex * 0.01);
      sprite.play(mapAnimKey);
      return sprite;
    }

    if (shipIconKey && scene.textures.exists(shipIconKey)) {
      const size = 14 + Math.max(0, 3 - visibleUnits);
      return scene.add
        .image(start.x, start.y, shipIconKey)
        .setDisplaySize(size, size)
        .setTint(shipTint)
        .setAlpha(Math.max(0.7, 0.88 - unitIndex * 0.05))
        .setDepth(4 + unitIndex * 0.01);
    }

    return scene.add
      .circle(start.x, start.y, 2.5, shipTint, 0.78)
      .setDepth(4 + unitIndex * 0.01);
  };

  const animatePath = (
    sprite: LocalTrafficSprite,
    path: Array<{ x: number; y: number }>,
    delayMs: number,
  ): void => {
    const loop = [...path, ...path.slice(0, -1).reverse()];
    if (loop.length < 2) return;

    let index = 0;
    const step = (): void => {
      if (!sprite.active) return;

      const from = loop[index];
      const to = loop[(index + 1) % loop.length];
      const movable = sprite as unknown as LocalMovable;
      movable.setPosition(from.x, from.y);
      movable.setRotation?.(Math.atan2(to.y - from.y, to.x - from.x));

      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      const tween = scene.tweens.add({
        targets: sprite,
        x: to.x,
        y: to.y,
        duration: Math.max(650, (distance / 80) * 1000),
        ease: "Linear",
        delay: index === 0 ? delayMs : 0,
        onComplete: () => {
          index = (index + 1) % loop.length;
          step();
        },
      });
      tweens.push(tween);
    };

    step();
  };

  for (const visual of getLocalRouteAssignments(state, systemId)) {
    const origin = planetPositions.get(visual.route.originPlanetId);
    const destination = planetPositions.get(visual.route.destinationPlanetId);
    if (!origin || !destination) continue;

    const path = buildSunAvoidingLocalRouteMotionPath(
      visual.route.id,
      origin,
      destination,
      sun,
    ).map((point) => ({ x: point.x, y: point.y }));
    if (path.length < 2) continue;

    for (let unitIndex = 0; unitIndex < visual.visibleUnits; unitIndex++) {
      const ship =
        visual.assignedShips[unitIndex % visual.assignedShips.length];
      const sprite = createTrafficSprite(
        ship,
        path[0],
        unitIndex,
        visual.visibleUnits,
      );
      sprites.push(sprite);
      animatePath(
        sprite,
        path,
        Math.floor((unitIndex / visual.visibleUnits) * 1800),
      );
    }
  }

  return {
    sprites,
    tweens,
    destroy: () => {
      for (const tween of tweens) {
        tween.remove();
      }
      for (const sprite of sprites) {
        scene.tweens.killTweensOf(sprite);
        sprite.destroy();
      }
    },
  };
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

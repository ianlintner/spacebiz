import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import {
  getTheme,
  colorToString,
  Label,
  getLayout,
  addPulseTween,
  addTwinkleTween,
  registerAmbientCleanup,
  getShipIconKey,
  getShipColor,
} from "../ui/index.ts";
import { drawEmpireBorders } from "../ui/EmpireBorders.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";

import type { GameHUDScene } from "./GameHUDScene.ts";

// ── Camera zoom / pan constants ─────────────────────────────────────────────

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.6;
const ZOOM_STEP = 0.08;
const DEFAULT_ZOOM = 0.55;
const DRAG_THRESHOLD = 5; // px before a click becomes a drag

export class GalaxyMapScene extends Phaser.Scene {
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private camStartX = 0;
  private camStartY = 0;

  constructor() {
    super({ key: "GalaxyMapScene" });
  }

  create(): void {
    const L = getLayout();
    const theme = getTheme();
    const state = gameStore.getState();
    const { systems, planets, empires } = state.galaxy;
    const routes = state.activeRoutes;

    // ── World extents (from galaxy data) ──
    let wMinX = Infinity;
    let wMaxX = -Infinity;
    let wMinY = Infinity;
    let wMaxY = -Infinity;
    for (const sys of systems) {
      if (sys.x < wMinX) wMinX = sys.x;
      if (sys.x > wMaxX) wMaxX = sys.x;
      if (sys.y < wMinY) wMinY = sys.y;
      if (sys.y > wMaxY) wMaxY = sys.y;
    }

    // ── Parallax starfield (3 depth layers) ──
    // Stars are scattered across a large area centred on the galaxy.
    // Each layer scrolls at a different rate to create depth.
    const galCx = (wMinX + wMaxX) / 2;
    const galCy = (wMinY + wMaxY) / 2 + L.contentTop;
    const galW = wMaxX - wMinX;
    const galH = wMaxY - wMinY;

    const PARALLAX_LAYERS: Array<{
      count: number;
      scrollFactor: number;
      minAlpha: number;
      maxAlpha: number;
      minScale: number;
      maxScale: number;
      depth: number;
      tints: number[];
    }> = [
      {
        // Far — tiny dim specks, barely move
        count: 100,
        scrollFactor: 0.05,
        minAlpha: 0.08,
        maxAlpha: 0.25,
        minScale: 0.15,
        maxScale: 0.35,
        depth: -300,
        tints: [0xffffff, 0xffffff, 0xffffff, 0xaaccff],
      },
      {
        // Mid — moderate stars
        count: 70,
        scrollFactor: 0.15,
        minAlpha: 0.12,
        maxAlpha: 0.45,
        minScale: 0.25,
        maxScale: 0.55,
        depth: -200,
        tints: [0xffffff, 0xffffff, 0xaaccff, 0xffffcc],
      },
      {
        // Near — brighter, move more with camera
        count: 40,
        scrollFactor: 0.3,
        minAlpha: 0.2,
        maxAlpha: 0.6,
        minScale: 0.4,
        maxScale: 0.8,
        depth: -100,
        tints: [0xffffff, 0xaaccff, 0xffffcc],
      },
    ];

    const starTweens: Phaser.Tweens.Tween[] = [];
    // Spread area: enough to cover viewport at any camera position and zoom
    const spreadW = galW + 2400;
    const spreadH = galH + 1600;

    for (const layer of PARALLAX_LAYERS) {
      for (let i = 0; i < layer.count; i++) {
        const sx = galCx + (Math.random() - 0.5) * spreadW;
        const sy = galCy + (Math.random() - 0.5) * spreadH;
        const alpha =
          layer.minAlpha + Math.random() * (layer.maxAlpha - layer.minAlpha);
        const scale =
          layer.minScale + Math.random() * (layer.maxScale - layer.minScale);
        const tint =
          layer.tints[Math.floor(Math.random() * layer.tints.length)];

        const dot = this.add
          .image(sx, sy, "glow-dot")
          .setAlpha(alpha)
          .setScale(scale)
          .setTint(tint)
          .setDepth(layer.depth)
          .setScrollFactor(layer.scrollFactor);

        // ~30% of stars twinkle
        if (Math.random() > 0.7) {
          const tw = addTwinkleTween(this, dot, {
            minAlpha: Math.max(0.04, alpha * 0.3),
            maxAlpha: Math.min(0.95, alpha * 1.7),
            minDuration: 2000,
            maxDuration: 6000,
            delay: Math.random() * 5000,
          });
          starTweens.push(tw);
        }
      }
    }

    if (starTweens.length > 0) {
      registerAmbientCleanup(this, starTweens);
    }

    // ── Empire territory borders (Stellaris-inspired) ──
    drawEmpireBorders(this, systems, empires, {
      yOffset: L.contentTop,
      influence: 130,
      gridStep: 10,
    });

    // ── HUD overlay labels (fixed to camera via setScrollFactor) ──
    new Label(this, {
      x: 20,
      y: L.contentTop + 10,
      text: "Galaxy Map",
      style: "caption",
      color: theme.colors.textDim,
    }).setScrollFactor(0);

    this.add
      .text(
        L.gameWidth - 20,
        L.contentTop + 10,
        "Scroll to zoom \u00b7 Drag to pan\nStar size = planets in system\nLines = active trade routes",
        {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
          align: "right",
          stroke: "#000000",
          strokeThickness: 2,
        },
      )
      .setOrigin(1, 0)
      .setAlpha(0.85)
      .setScrollFactor(0);

    // ── Build lookups ──
    const planetSystemMap = new Map<string, string>();
    for (const planet of planets) {
      planetSystemMap.set(planet.id, planet.systemId);
    }
    const systemMap = new Map<string, { x: number; y: number }>();
    for (const sys of systems) {
      systemMap.set(sys.id, { x: sys.x, y: sys.y });
    }

    // ── Active route lines + ship sprites ──
    const routeGraphics = this.add.graphics();
    routeGraphics.lineStyle(1, theme.colors.accent, 0.4);
    const { fleet } = state;
    for (const route of routes) {
      const originSysId = planetSystemMap.get(route.originPlanetId);
      const destSysId = planetSystemMap.get(route.destinationPlanetId);
      if (!originSysId || !destSysId) continue;
      const originSys = systemMap.get(originSysId);
      const destSys = systemMap.get(destSysId);
      if (!originSys || !destSys) continue;

      routeGraphics.beginPath();
      routeGraphics.moveTo(originSys.x, originSys.y + L.contentTop);
      routeGraphics.lineTo(destSys.x, destSys.y + L.contentTop);
      routeGraphics.strokePath();

      // Determine ship class for icon — use first assigned ship, fallback to pip
      const firstShipId = route.assignedShipIds[0];
      const firstShip = firstShipId
        ? fleet.find((s) => s.id === firstShipId)
        : undefined;
      const shipIconKey = firstShip
        ? getShipIconKey(firstShip.class)
        : undefined;
      const shipTint = firstShip
        ? getShipColor(firstShip.class)
        : theme.colors.accent;

      const ox = originSys.x;
      const oy = originSys.y + L.contentTop;
      const dx = destSys.x;
      const dy = destSys.y + L.contentTop;

      // Calculate angle from origin to destination for rotation
      const angle = Math.atan2(dy - oy, dx - ox);

      if (shipIconKey && this.textures.exists(shipIconKey)) {
        // Ship sprite traveling the route
        const shipSprite = this.add
          .image(ox, oy, shipIconKey)
          .setDisplaySize(16, 16)
          .setTint(shipTint)
          .setAlpha(0.85)
          .setRotation(angle);

        this.tweens.add({
          targets: shipSprite,
          x: dx,
          y: dy,
          duration: theme.ambient.routeFlowDuration,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
          delay: Math.random() * theme.ambient.routeFlowDuration,
          onYoyo: () => {
            shipSprite.setRotation(angle + Math.PI);
          },
          onRepeat: () => {
            shipSprite.setRotation(angle);
          },
        });
      } else {
        // Fallback circle pip for routes without assigned ships
        const pip = this.add.circle(ox, oy, 2, theme.colors.accent, 0.7);
        this.tweens.add({
          targets: pip,
          x: dx,
          y: dy,
          duration: theme.ambient.routeFlowDuration,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
          delay: Math.random() * theme.ambient.routeFlowDuration,
        });
      }
    }

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

    // ── Star systems ──
    const planetCountsBySystem = new Map<string, number>();
    for (const p of planets) {
      planetCountsBySystem.set(
        p.systemId,
        (planetCountsBySystem.get(p.systemId) ?? 0) + 1,
      );
    }

    for (const system of systems) {
      const sysX = system.x;
      const sysY = system.y + L.contentTop;
      const planetCount = planetCountsBySystem.get(system.id) ?? 0;
      // Stars with more planets are slightly larger (3-7px radius)
      const mainRadius = 3 + Math.min(4, planetCount);

      // Outer soft halo — large and dim for atmosphere
      const outerHalo = this.add
        .circle(sysX, sysY, mainRadius * 4, system.starColor)
        .setAlpha(0.06);
      addPulseTween(this, outerHalo, {
        minAlpha: 0.03,
        maxAlpha: 0.1,
        duration: 4000 + Math.random() * 3000,
        delay: Math.random() * 3000,
      });

      // Inner glow halo
      const halo = this.add
        .circle(sysX, sysY, mainRadius * 2.2, system.starColor)
        .setAlpha(0.2);
      addPulseTween(this, halo, {
        minAlpha: 0.1,
        maxAlpha: 0.35,
        duration: 2500 + Math.random() * 2000,
        delay: Math.random() * 2000,
      });

      const star = this.add.circle(sysX, sysY, mainRadius, system.starColor);
      star.setInteractive(
        new Phaser.Geom.Circle(
          mainRadius,
          mainRadius,
          Math.max(mainRadius + 10, 16),
        ),
        Phaser.Geom.Circle.Contains,
      );
      if (star.input) {
        star.input.cursor = "pointer";
      }

      this.add
        .text(sysX, sysY + 12, system.name, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.text),
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0);

      star.on("pointerup", () => {
        getAudioDirector().sfx("map_star_select");
        const hud = this.scene.get("GameHUDScene") as GameHUDScene;
        hud.switchContentScene("SystemMapScene", { systemId: system.id });
      });

      star.on("pointerover", () => {
        star.setRadius(mainRadius + 3);
        halo.setAlpha(0.34);
      });
      star.on("pointerout", () => {
        star.setRadius(mainRadius);
        halo.setAlpha(0.18);
      });
    }

    // ── Camera setup: zoom + pan ──
    const cam = this.cameras.main;
    // Don't use setBounds — at low zoom the viewport exceeds world size
    // and Phaser locks the camera. We handle clamping manually in pan.
    cam.setZoom(DEFAULT_ZOOM);

    // Center camera on galaxy centroid (already computed for parallax above)
    cam.centerOn(galCx, galCy);

    // Mouse-wheel zoom (Phaser emits: pointer, currentlyOver, deltaX, deltaY, deltaZ)
    this.input.on(
      "wheel",
      (
        _pointer: Phaser.Input.Pointer,
        _over: Phaser.GameObjects.GameObject[],
        _dx: number,
        dy: number,
      ) => {
        const newZoom = Phaser.Math.Clamp(
          cam.zoom + (dy < 0 ? ZOOM_STEP : -ZOOM_STEP),
          MIN_ZOOM,
          MAX_ZOOM,
        );
        cam.setZoom(newZoom);
      },
    );

    // Click-drag pan (with threshold so clicks on stars aren't treated as drags)
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.isDragging = false;
      this.dragStartX = pointer.x;
      this.dragStartY = pointer.y;
      this.camStartX = cam.scrollX;
      this.camStartY = cam.scrollY;
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      const dx = pointer.x - this.dragStartX;
      const dy = pointer.y - this.dragStartY;
      if (!this.isDragging && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) {
        return;
      }
      this.isDragging = true;
      cam.scrollX = this.camStartX - dx / cam.zoom;
      cam.scrollY = this.camStartY - dy / cam.zoom;
    });

    this.input.on("pointerup", () => {
      this.isDragging = false;
    });
  }
}

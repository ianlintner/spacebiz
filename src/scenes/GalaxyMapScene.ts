import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import {
  getTheme,
  colorToString,
  Label,
  getLayout,
  createStarfield,
  addPulseTween,
} from "../ui/index.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";

import type { GameHUDScene } from "./GameHUDScene.ts";

export class GalaxyMapScene extends Phaser.Scene {
  constructor() {
    super({ key: "GalaxyMapScene" });
  }

  create(): void {
    const L = getLayout();
    const theme = getTheme();
    const state = gameStore.getState();
    const { sectors, systems, planets, empires } = state.galaxy;
    const routes = state.activeRoutes;

    // Starfield background
    createStarfield(this);

    // Subtle title (caption style, top-left)
    new Label(this, {
      x: 20,
      y: L.contentTop + 10,
      text: "Galaxy Map",
      style: "caption",
      color: theme.colors.textDim,
    });

    this.add
      .text(
        1260,
        L.contentTop + 10,
        "Star size = planets in system\nSector glow = regional influence\nLines = active trade routes",
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
      .setAlpha(0.85);

    // Sector visuals: empire-tinted influence fields
    // centered from actual system positions so clusters read naturally.
    const systemsBySector = new Map<string, typeof systems>();
    for (const sector of sectors) {
      systemsBySector.set(
        sector.id,
        systems.filter((s) => s.sectorId === sector.id),
      );
    }

    // Build empire lookup for coloring
    const empireMap = new Map<string, (typeof empires)[0]>();
    for (const empire of empires) {
      empireMap.set(empire.id, empire);
    }

    for (const sector of sectors) {
      const inSector = systemsBySector.get(sector.id) ?? [];
      if (inSector.length === 0) continue;

      // Find the empire that owns most systems in this sector
      const empireCounts = new Map<string, number>();
      for (const s of inSector) {
        empireCounts.set(s.empireId, (empireCounts.get(s.empireId) ?? 0) + 1);
      }
      let dominantEmpireId = "";
      let maxCount = 0;
      for (const [eId, count] of empireCounts) {
        if (count > maxCount) {
          maxCount = count;
          dominantEmpireId = eId;
        }
      }
      const empire = empireMap.get(dominantEmpireId);
      const empireColor = empire?.color ?? sector.color;

      let sumX = 0;
      let sumY = 0;
      for (const s of inSector) {
        sumX += s.x;
        sumY += s.y;
      }
      const centroidX = sumX / inSector.length;
      const centroidY = sumY / inSector.length;

      let maxDist = 50;
      for (const s of inSector) {
        const dx = s.x - centroidX;
        const dy = s.y - centroidY;
        maxDist = Math.max(maxDist, Math.sqrt(dx * dx + dy * dy));
      }

      const influenceRadius = Math.min(190, maxDist + 42);

      const outer = this.add
        .circle(
          centroidX,
          centroidY + L.contentTop,
          influenceRadius,
          empireColor,
          0.035,
        )
        .setOrigin(0.5, 0.5);
      addPulseTween(this, outer, {
        minAlpha: 0.02,
        maxAlpha: 0.055,
        duration: 4200 + Math.random() * 1600,
        delay: Math.random() * 1500,
      });

      const edge = this.add.graphics();
      edge.lineStyle(1, empireColor, 0.18);
      edge.strokeCircle(
        centroidX,
        centroidY + L.contentTop,
        Math.max(36, influenceRadius - 4),
      );

      // Empire name label (replacing sector name)
      const displayName = empire ? empire.name : sector.name;
      this.add
        .text(
          centroidX,
          centroidY + L.contentTop - influenceRadius - 14,
          displayName,
          {
            fontSize: `${theme.fonts.caption.size}px`,
            fontFamily: theme.fonts.caption.family,
            color: colorToString(theme.colors.textDim),
            stroke: "#000000",
            strokeThickness: 2,
          },
        )
        .setOrigin(0.5);
    }

    // Build a lookup: planetId -> systemId
    const planetSystemMap = new Map<string, string>();
    for (const planet of planets) {
      planetSystemMap.set(planet.id, planet.systemId);
    }

    // Build a lookup: systemId -> system
    const systemMap = new Map<string, { x: number; y: number }>();
    for (const sys of systems) {
      systemMap.set(sys.id, { x: sys.x, y: sys.y });
    }

    // Draw active route lines between systems with breathing animation + flow pips
    const routeGraphics = this.add.graphics();
    routeGraphics.lineStyle(1, theme.colors.accent, 0.4);
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

      // Glow pip — tiny dot that glides along the route continuously
      const pip = this.add.circle(
        originSys.x,
        originSys.y + L.contentTop,
        2,
        theme.colors.accent,
        0.7,
      );
      this.tweens.add({
        targets: pip,
        x: destSys.x,
        y: destSys.y + L.contentTop,
        duration: theme.ambient.routeFlowDuration,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: Math.random() * theme.ambient.routeFlowDuration,
      });
    }

    // Enhanced route breathing using theme ambient values
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

    // Precompute planet counts for system-size/readability cues
    const planetCountsBySystem = new Map<string, number>();
    for (const p of planets) {
      planetCountsBySystem.set(
        p.systemId,
        (planetCountsBySystem.get(p.systemId) ?? 0) + 1,
      );
    }

    // Draw each star system
    for (const system of systems) {
      const sysX = system.x;
      const sysY = system.y + L.contentTop;
      const planetCount = planetCountsBySystem.get(system.id) ?? 0;
      const mainRadius = 4 + Math.min(4, planetCount);

      // Glow halo behind the star dot — pulses with a faint heartbeat
      const halo = this.add
        .circle(sysX, sysY, mainRadius * 2.5, system.starColor)
        .setAlpha(0.18);
      addPulseTween(this, halo, {
        minAlpha: 0.08,
        maxAlpha: 0.3,
        duration: 2500 + Math.random() * 2000,
        delay: Math.random() * 2000,
      });

      // Star dot
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

      // Name label
      this.add
        .text(sysX, sysY + 12, system.name, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.text),
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0);

      // Click to drill into system — route through HUD
      star.on("pointerup", () => {
        getAudioDirector().sfx("map_star_select");
        const hud = this.scene.get("GameHUDScene") as GameHUDScene;
        hud.switchContentScene("SystemMapScene", { systemId: system.id });
      });

      // Hover effect
      star.on("pointerover", () => {
        star.setRadius(mainRadius + 3);
        halo.setAlpha(0.34);
      });
      star.on("pointerout", () => {
        star.setRadius(mainRadius);
        halo.setAlpha(0.18);
      });
    }
  }
}

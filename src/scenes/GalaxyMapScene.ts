import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import {
  createStarfield,
  getTheme,
  colorToString,
  Label,
  getLayout,
  addPulseTween,
  getShipIconKey,
  getShipColor,
  getShipMapKey,
  getShipMapAnimKey,
} from "../ui/index.ts";
import { drawEmpireBorders } from "../ui/EmpireBorders.ts";
import {
  generateEmpireFlags,
  getEmpireFlagKey,
  FLAG_WIDTH,
  FLAG_HEIGHT,
} from "../ui/EmpireFlagGenerator.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import { isEmpireAccessible } from "../game/empire/EmpireAccessManager.ts";
import {
  buildGalaxyRouteTrafficVisuals,
  buildGalaxyRouteTrafficStateKey,
  buildTrafficPatrolWaypoints,
  getAvailableRouteSlots,
  getUsedRouteSlots,
  getAvailableLocalRouteSlots,
  getUsedLocalRouteSlots,
} from "../game/routes/RouteManager.ts";
import type { RouteTrafficVisual } from "../game/routes/RouteManager.ts";

import type { GameHUDScene } from "./GameHUDScene.ts";
import type { Empire, GameState, Ship } from "../data/types.ts";

// ── Camera zoom / pan constants ─────────────────────────────────────────────

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.6;
const ZOOM_STEP = 0.08;
const DEFAULT_ZOOM = 0.55;
const DRAG_THRESHOLD = 5; // px before a click becomes a drag

type Waypoint = { x: number; y: number };
type Movable = {
  x: number;
  y: number;
  active: boolean;
  setRotation: (r: number) => unknown;
};

type TrafficDisplayObject =
  | Phaser.GameObjects.Sprite
  | Phaser.GameObjects.Image
  | Phaser.GameObjects.Arc;

type TrafficLayerHandle = {
  routeGraphics: Phaser.GameObjects.Graphics;
  sprites: TrafficDisplayObject[];
  timers: Phaser.Time.TimerEvent[];
};

export class GalaxyMapScene extends Phaser.Scene {
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private camStartX = 0;
  private camStartY = 0;
  private routeTrafficLayer: TrafficLayerHandle | null = null;
  private routeTrafficStateKey: string | null = null;
  /** Camera ID of the fixed HUD camera (zoom=1). Objects with this as cameraFilter skip it. */
  private hudCamId = 0;

  constructor() {
    super({ key: "GalaxyMapScene" });
  }

  create(): void {
    const L = getLayout();
    const theme = getTheme();
    const state = gameStore.getState();
    const { systems, planets, empires } = state.galaxy;
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

    const galCx = (wMinX + wMaxX) / 2;
    const galCy = (wMinY + wMaxY) / 2 + L.contentTop;

    // Create the fixed HUD camera early so hudCamId is set for all dynamic object creation
    const uiCam = this.cameras.add(
      0,
      0,
      L.gameWidth,
      L.gameHeight,
      false,
      "hud-cam",
    );
    uiCam.setZoom(1);
    this.hudCamId = uiCam.id;

    createStarfield(this, {
      depth: -320,
      drift: true,
      twinkle: true,
      shimmer: true,
      haze: true,
      minZoom: MIN_ZOOM,
      overscan: 180,
      edgeFeather: 0.15,
      worldBounds: {
        minX: wMinX,
        maxX: wMaxX,
        minY: wMinY + L.contentTop,
        maxY: wMaxY + L.contentTop,
      },
      centerX: galCx,
      centerY: galCy,
    });

    const addHudBackdrop = (
      x: number,
      y: number,
      width: number,
      height: number,
      originX: number,
      originY: number,
    ): Phaser.GameObjects.Rectangle =>
      this.add
        .rectangle(x, y, width, height, theme.colors.background, 0.46)
        .setStrokeStyle(1, theme.colors.panelBorder, 0.22)
        .setOrigin(originX, originY)
        .setScrollFactor(0)
        .setDepth(900);

    // ── Empire territory borders (Stellaris-inspired) ──
    drawEmpireBorders(this, systems, empires, {
      yOffset: L.contentTop,
      influence: 130,
      gridStep: 8,
    });

    // ── Empire flags at home systems ──
    generateEmpireFlags(this, empires, state.seed);
    const systemById = new Map(systems.map((s) => [s.id, s]));
    for (const empire of empires) {
      const homeSys = systemById.get(empire.homeSystemId);
      if (!homeSys) continue;
      const flagKey = getEmpireFlagKey(empire.id);
      if (!this.textures.exists(flagKey)) continue;
      const flagX = homeSys.x - FLAG_WIDTH / 2;
      const flagY = homeSys.y + L.contentTop - 20;
      const flag = this.add
        .image(flagX, flagY, flagKey)
        .setOrigin(0, 1)
        .setAlpha(0.85);
      flag.setDisplaySize(FLAG_WIDTH, FLAG_HEIGHT);
    }

    // ── Build empire accessibility lookup ──
    const empireAccessible = new Map<string, boolean>();
    for (const emp of empires) {
      empireAccessible.set(emp.id, isEmpireAccessible(emp.id, state));
    }
    const empireMap = new Map(empires.map((e) => [e.id, e]));

    // ── Build lookups ──
    const planetSystemMap = new Map<string, string>();
    for (const planet of planets) {
      planetSystemMap.set(planet.id, planet.systemId);
    }
    const systemMap = new Map<string, { x: number; y: number }>();
    for (const sys of systems) {
      systemMap.set(sys.id, { x: sys.x, y: sys.y });
    }

    // ── Hyperlane network ──
    const hyperlanes = state.hyperlanes ?? [];
    const borderPorts = state.borderPorts ?? [];
    if (hyperlanes.length > 0) {
      const hlGraphics = this.add.graphics();

      // Border port lookup: hyperlane → status
      const portStatusMap = new Map<string, string>();
      for (const bp of borderPorts) {
        // If any port on a hyperlane is closed, mark the lane as closed
        const existing = portStatusMap.get(bp.hyperlaneId);
        if (bp.status === "closed" || existing === "closed") {
          portStatusMap.set(bp.hyperlaneId, "closed");
        } else if (bp.status === "restricted" && existing !== "closed") {
          portStatusMap.set(bp.hyperlaneId, "restricted");
        } else if (!existing) {
          portStatusMap.set(bp.hyperlaneId, bp.status);
        }
      }

      for (const hl of hyperlanes) {
        const sysA = systemMap.get(hl.systemA);
        const sysB = systemMap.get(hl.systemB);
        if (!sysA || !sysB) continue;

        const portStatus = portStatusMap.get(hl.id);

        // Color lanes by status: closed=red dim, restricted=yellow dim, open=cyan dim
        if (portStatus === "closed") {
          hlGraphics.lineStyle(1, 0xff4444, 0.15);
        } else if (portStatus === "restricted") {
          hlGraphics.lineStyle(1, 0xffaa00, 0.2);
        } else {
          hlGraphics.lineStyle(1, theme.colors.accent, 0.18);
        }

        hlGraphics.beginPath();
        hlGraphics.moveTo(sysA.x, sysA.y + L.contentTop);
        hlGraphics.lineTo(sysB.x, sysB.y + L.contentTop);
        hlGraphics.strokePath();
      }

      // Draw border port markers (small diamonds at border crossings)
      const drawnPorts = new Set<string>();
      for (const bp of borderPorts) {
        if (drawnPorts.has(bp.hyperlaneId)) continue;
        drawnPorts.add(bp.hyperlaneId);

        const hl = hyperlanes.find((h) => h.id === bp.hyperlaneId);
        if (!hl) continue;
        const sysA = systemMap.get(hl.systemA);
        const sysB = systemMap.get(hl.systemB);
        if (!sysA || !sysB) continue;

        // Draw small marker at midpoint
        const mx = (sysA.x + sysB.x) / 2;
        const my = (sysA.y + sysB.y) / 2 + L.contentTop;

        const markerColor =
          bp.status === "closed"
            ? 0xff4444
            : bp.status === "restricted"
              ? 0xffaa00
              : 0x44ff88;

        hlGraphics.fillStyle(markerColor, 0.6);
        hlGraphics.fillCircle(mx, my, 2);
      }
    }

    // ── Hyperlane-following ship movement helper ─────────────────────────────
    // Animates a sprite through a sequence of waypoints at a fixed cruising
    // speed (pixels/second). Each segment uses a linear tween and chains into
    // the next on completion, so ships follow the hyperlane network exactly.
    const tweenAlongPath = (
      sprite: Movable,
      waypoints: Waypoint[],
      speedPxPerSec: number,
      onComplete: () => void,
    ): void => {
      if (!sprite.active || waypoints.length < 2) {
        onComplete();
        return;
      }
      let idx = 0;
      const step = () => {
        if (!sprite.active) return;
        if (idx >= waypoints.length - 1) {
          onComplete();
          return;
        }
        const from = waypoints[idx];
        const to = waypoints[idx + 1];
        const a = Math.atan2(to.y - from.y, to.x - from.x);
        sprite.setRotation(a);
        const dist = Math.hypot(to.x - from.x, to.y - from.y);
        const dur = Math.max(500, (dist / speedPxPerSec) * 1000);
        this.tweens.add({
          targets: sprite,
          x: to.x,
          y: to.y,
          duration: dur,
          ease: "Linear",
          onComplete: () => {
            idx++;
            step();
          },
        });
      };
      step();
    };

    /** Convert a list of system IDs into world-space waypoints. */
    const systemsToWaypoints = (systemIds: string[]): Waypoint[] => {
      const wps: Waypoint[] = [];
      for (const sid of systemIds) {
        const s = systemMap.get(sid);
        if (s) wps.push({ x: s.x, y: s.y + L.contentTop });
      }
      return wps;
    };

    const createTrafficSprite = (
      ship: Ship,
      startWp: Waypoint,
      unitIndex: number,
      visibleUnits: number,
    ): TrafficDisplayObject => {
      const shipIconKey = getShipIconKey(ship.class);
      const shipTint = getShipColor(ship.class);
      const mapSprKey = getShipMapKey(ship.class);
      const mapAnimKey = getShipMapAnimKey(ship.class);

      if (mapSprKey && mapAnimKey && this.textures.exists(mapSprKey)) {
        const shipSprite = this.add
          .sprite(startWp.x, startWp.y, mapSprKey, "1")
          .setDisplaySize(28, 28)
          .setTint(shipTint)
          .setAlpha(Math.max(0.72, 0.92 - unitIndex * 0.04))
          .setDepth(5 + unitIndex * 0.01);
        shipSprite.play(mapAnimKey);
        return shipSprite;
      }

      if (shipIconKey && this.textures.exists(shipIconKey)) {
        const size = 16 + Math.max(0, 3 - visibleUnits);
        return this.add
          .image(startWp.x, startWp.y, shipIconKey)
          .setDisplaySize(size, size)
          .setTint(shipTint)
          .setAlpha(Math.max(0.7, 0.88 - unitIndex * 0.05))
          .setDepth(5 + unitIndex * 0.01);
      }

      return this.add
        .circle(startWp.x, startWp.y, 2, shipTint, 0.75)
        .setDepth(5 + unitIndex * 0.01);
    };

    // Map AI company ID → empire hex color for route line tinting
    const aiCompanyRouteColor = new Map<string, number>();
    for (const company of state.aiCompanies) {
      const empire = empireMap.get(company.empireId);
      if (empire) aiCompanyRouteColor.set(company.id, empire.color);
    }

    const createRouteTrafficLayer = (
      trafficVisuals: RouteTrafficVisual[],
    ): TrafficLayerHandle => {
      const routeGraphics = this.add.graphics().setDepth(3);
      routeGraphics.cameraFilter = this.hudCamId;
      const sprites: TrafficDisplayObject[] = [];
      const timers: Phaser.Time.TimerEvent[] = [];

      const schedule = (delay: number, callback: () => void): void => {
        timers.push(this.time.delayedCall(delay, callback));
      };

      const makePatrol = (
        sprite: TrafficDisplayObject,
        forwardWaypoints: Waypoint[],
        reverseWaypoints: Waypoint[],
        initialForward: boolean,
        initialDelay: number,
      ): void => {
        const movable = sprite as unknown as Movable;
        const patrol = (forward: boolean): void => {
          if (!sprite.active) return;
          const wps = forward ? forwardWaypoints : reverseWaypoints;
          sprite.setPosition(wps[0].x, wps[0].y);
          tweenAlongPath(movable, wps, 90, () => {
            if (!sprite.active) return;
            schedule(900, () => patrol(!forward));
          });
        };

        schedule(initialDelay, () => patrol(initialForward));
      };

      for (const visual of trafficVisuals) {
        const forwardWaypoints = buildTrafficPatrolWaypoints(
          visual.routeId,
          systemsToWaypoints(visual.pathSystemIds),
        );
        const reverseWaypoints = [...forwardWaypoints].reverse();
        if (forwardWaypoints.length < 2) continue;

        const isPlayer = visual.ownerId === "player";
        const lineColor = isPlayer
          ? theme.colors.accent
          : (aiCompanyRouteColor.get(visual.ownerId) ?? 0x8899aa);
        const lineAlpha = isPlayer ? 0.55 : 0.32;
        const lineWidth = isPlayer ? 1.5 : 1;
        routeGraphics.lineStyle(lineWidth, lineColor, lineAlpha);
        routeGraphics.beginPath();
        routeGraphics.moveTo(forwardWaypoints[0].x, forwardWaypoints[0].y);
        for (let i = 1; i < forwardWaypoints.length; i++) {
          routeGraphics.lineTo(forwardWaypoints[i].x, forwardWaypoints[i].y);
        }
        routeGraphics.strokePath();

        const startWp = forwardWaypoints[0];
        for (let unitIndex = 0; unitIndex < visual.visibleUnits; unitIndex++) {
          const ship =
            visual.assignedShips[unitIndex % visual.assignedShips.length];
          const sprite = createTrafficSprite(
            ship,
            startWp,
            unitIndex,
            visual.visibleUnits,
          );
          sprite.cameraFilter = this.hudCamId;
          sprites.push(sprite);

          const phaseDelay = Math.floor(
            (unitIndex / visual.visibleUnits) * 2200,
          );
          makePatrol(
            sprite,
            forwardWaypoints,
            reverseWaypoints,
            unitIndex % 2 === 0,
            phaseDelay,
          );
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

      return { routeGraphics, sprites, timers };
    };

    const destroyRouteTrafficLayer = (): void => {
      if (!this.routeTrafficLayer) return;

      for (const timer of this.routeTrafficLayer.timers) {
        timer.remove(false);
      }
      this.tweens.killTweensOf(this.routeTrafficLayer.routeGraphics);
      this.routeTrafficLayer.routeGraphics.destroy();

      for (const sprite of this.routeTrafficLayer.sprites) {
        this.tweens.killTweensOf(sprite);
        sprite.destroy();
      }

      this.routeTrafficLayer = null;
      this.routeTrafficStateKey = null;
    };

    const refreshRouteTrafficLayer = (currentState: GameState): void => {
      const nextTrafficStateKey = buildGalaxyRouteTrafficStateKey(currentState);

      if (
        this.routeTrafficLayer &&
        this.routeTrafficStateKey === nextTrafficStateKey
      ) {
        return;
      }

      destroyRouteTrafficLayer();
      const trafficVisuals = buildGalaxyRouteTrafficVisuals(currentState);
      this.routeTrafficLayer = createRouteTrafficLayer(trafficVisuals);
      this.routeTrafficStateKey = nextTrafficStateKey;
    };

    refreshRouteTrafficLayer(state);

    const handleStateChanged = (nextState: unknown): void => {
      refreshRouteTrafficLayer(nextState as GameState);
    };
    gameStore.on("stateChanged", handleStateChanged);
    this.events.once("shutdown", () => {
      gameStore.off("stateChanged", handleStateChanged);
      destroyRouteTrafficLayer();
    });
    this.events.once("destroy", () => {
      gameStore.off("stateChanged", handleStateChanged);
      destroyRouteTrafficLayer();
    });

    // ── Star systems ──
    const planetCountsBySystem = new Map<string, number>();
    for (const p of planets) {
      planetCountsBySystem.set(
        p.systemId,
        (planetCountsBySystem.get(p.systemId) ?? 0) + 1,
      );
    }

    // Empire info card container (destroyed & rebuilt per click)
    let empireInfoCard: Phaser.GameObjects.Container | null = null;

    const destroyInfoCard = () => {
      if (empireInfoCard) {
        empireInfoCard.destroy(true);
        empireInfoCard = null;
      }
    };

    for (const system of systems) {
      const sysX = system.x;
      const sysY = system.y + L.contentTop;
      const planetCount = planetCountsBySystem.get(system.id) ?? 0;
      const accessible = empireAccessible.get(system.empireId) ?? false;

      // Stars with more planets are slightly larger (3-7px radius)
      const mainRadius = 3 + Math.min(4, planetCount);

      if (!accessible) {
        // Locked empire — dim dot, no glow
        const dimStar = this.add
          .circle(sysX, sysY, Math.max(2, mainRadius * 0.5), system.starColor)
          .setAlpha(0.25);

        this.add
          .text(sysX, sysY + 8, system.name, {
            fontSize: `${theme.fonts.caption.size}px`,
            fontFamily: theme.fonts.caption.family,
            color: colorToString(theme.colors.textDim),
            stroke: "#000000",
            strokeThickness: 2,
          })
          .setOrigin(0.5, 0)
          .setAlpha(0.3);

        // Lock icon
        this.add
          .text(sysX + mainRadius + 4, sysY - 6, "\uD83D\uDD12", {
            fontSize: "10px",
          })
          .setOrigin(0, 0.5)
          .setAlpha(0.4);

        dimStar.setInteractive(
          new Phaser.Geom.Circle(
            mainRadius,
            mainRadius,
            Math.max(mainRadius + 10, 16),
          ),
          Phaser.Geom.Circle.Contains,
        );
        if (dimStar.input) {
          dimStar.input.cursor = "pointer";
        }
        dimStar.on("pointerup", () => {
          getAudioDirector().sfx("map_star_select");
          const emp = empireMap.get(system.empireId);
          const empName = emp?.name ?? "Unknown";
          destroyInfoCard();
          empireInfoCard = this.createEmpireInfoCard(
            sysX,
            sysY,
            empName,
            emp,
            state,
            false,
          );
        });
        continue;
      }

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

    // Click on empty space dismisses empire info card
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) return;
      // Check if we clicked on a game object — if not, dismiss
      const overObjects = this.input.hitTestPointer(pointer);
      if (overObjects.length === 0) {
        destroyInfoCard();
      }
    });

    // ── Camera setup: zoom + pan ──
    const cam = this.cameras.main;
    // Don't use setBounds — at low zoom the viewport exceeds world size
    // and Phaser locks the camera. We handle clamping manually in pan.
    cam.setZoom(DEFAULT_ZOOM);

    // Center camera on galaxy centroid (already computed for parallax above)
    cam.centerOn(galCx, galCy);

    // ── HUD overlay elements (rendered by fixed uiCam only, immune to zoom) ──
    const hudObjects: Phaser.GameObjects.GameObject[] = [];

    const slotsUsed = getUsedRouteSlots(state) + getUsedLocalRouteSlots(state);
    const slotsTotal =
      getAvailableRouteSlots(state) + getAvailableLocalRouteSlots(state);
    const slotBlocks =
      "\u25A0".repeat(slotsUsed) +
      "\u25A1".repeat(Math.max(0, slotsTotal - slotsUsed));

    // Offset HUD labels further below the top bar so they clear the
    // company name / cash readout (which can extend slightly past the
    // nominal hudTopBarHeight via portrait ring + padding).
    const hudLabelTop = L.contentTop + 18;
    hudObjects.push(addHudBackdrop(12, hudLabelTop - 4, 156, 46, 0, 0));
    hudObjects.push(
      addHudBackdrop(L.gameWidth - 16, hudLabelTop - 4, 250, 58, 1, 0),
    );

    hudObjects.push(
      new Label(this, {
        x: 20,
        y: hudLabelTop,
        text: "Galaxy Map",
        style: "caption",
        color: theme.colors.textDim,
      })
        .setScrollFactor(0)
        .setDepth(901),
    );
    hudObjects.push(
      new Label(this, {
        x: 20,
        y: hudLabelTop + 18,
        text: `Routes: ${slotsUsed}/${slotsTotal} ${slotBlocks}`,
        style: "caption",
        color:
          slotsUsed >= slotsTotal ? theme.colors.loss : theme.colors.textDim,
      })
        .setScrollFactor(0)
        .setDepth(901),
    );
    // Right-anchored legend. fixedWidth + align:right guarantees the
    // text occupies a known block that the right-edge origin (1,0)
    // anchors flush with the viewport edge, so narrower canvases can't
    // clip the trailing characters ("p[an]", "syst[em]", "rout[es]").
    hudObjects.push(
      this.add
        .text(
          L.gameWidth - 20,
          hudLabelTop,
          "Scroll to zoom \u00b7 Drag to pan\nStar size = planets in system\nLines = active trade routes",
          {
            fontSize: `${theme.fonts.caption.size}px`,
            fontFamily: theme.fonts.caption.family,
            color: colorToString(theme.colors.textDim),
            align: "right",
            fixedWidth: 240,
            stroke: "#000000",
            strokeThickness: 2,
          },
        )
        .setOrigin(1, 0)
        .setAlpha(0.85)
        .setScrollFactor(0)
        .setDepth(901),
    );

    // Apply dual-camera filters: world objects → main cam only, HUD → uiCam only
    const hudSet = new Set(hudObjects);
    for (const child of this.children.list) {
      child.cameraFilter = hudSet.has(child as Phaser.GameObjects.GameObject)
        ? cam.id
        : this.hudCamId;
    }

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

  private createEmpireInfoCard(
    worldX: number,
    worldY: number,
    name: string,
    empire: Empire | undefined,
    state: GameState,
    accessible: boolean,
  ): Phaser.GameObjects.Container {
    const theme = getTheme();
    const container = this.add.container(worldX + 20, worldY - 20);
    container.cameraFilter = this.hudCamId;
    const cardW = 260;
    const lines: string[] = [];
    lines.push(name);

    if (empire) {
      lines.push(`Leader: ${empire.leaderName}`);
      lines.push(`Disposition: ${empire.disposition}`);
      lines.push(`Tariff: ${Math.round(empire.tariffRate * 100)}%`);
      const policy = state.empireTradePolicies[empire.id];
      if (policy) {
        if (policy.bannedImports.length > 0) {
          lines.push(`Import Ban: ${policy.bannedImports.join(", ")}`);
        }
        if (policy.bannedExports.length > 0) {
          lines.push(`Export Ban: ${policy.bannedExports.join(", ")}`);
        }
        if (policy.tariffSurcharge > 0) {
          lines.push(
            `Surcharge: +${Math.round(policy.tariffSurcharge * 100)}%`,
          );
        }
      }
    }

    lines.push(accessible ? "Status: Unlocked" : "Status: Locked \uD83D\uDD12");

    const lineHeight = 16;
    const cardH = lines.length * lineHeight + 16;

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(theme.colors.panelBg, 0.92);
    bg.fillRoundedRect(0, 0, cardW, cardH, 6);
    bg.lineStyle(1, theme.colors.panelBorder, 0.6);
    bg.strokeRoundedRect(0, 0, cardW, cardH, 6);
    container.add(bg);

    for (let i = 0; i < lines.length; i++) {
      const isTitle = i === 0;
      const txt = this.add
        .text(10, 8 + i * lineHeight, lines[i], {
          fontSize: `${isTitle ? theme.fonts.body.size : theme.fonts.caption.size}px`,
          fontFamily: isTitle
            ? theme.fonts.body.family
            : theme.fonts.caption.family,
          color: colorToString(
            isTitle ? theme.colors.accent : theme.colors.text,
          ),
          stroke: "#000000",
          strokeThickness: 1,
        })
        .setOrigin(0, 0);
      container.add(txt);
    }

    return container;
  }
}

import * as Phaser from "phaser";
import * as THREE from "three";
import { gameStore } from "../data/GameStore.ts";
import type { GameState, Planet, Ship } from "../data/types.ts";
import {
  getTheme,
  colorToString,
  Label,
  Button,
  PortraitPanel,
  addPulseTween,
  attachReflowHandler,
  getLayout,
  getShipColor,
  getShipIconKey,
  getShipMapAnimKey,
  getShipMapKey,
  getCargoShortLabel,
} from "../ui/index.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import { isEmpireAccessible } from "../game/empire/EmpireAccessManager.ts";
import { getVisibleRouteTrafficUnits } from "../game/routes/RouteManager.ts";
import { SystemView3D } from "./system3d/SystemView3D.ts";

import type { GameHUDScene } from "./GameHUDScene.ts";

interface PlanetMarker {
  planet: Planet;
  hitbox: Phaser.GameObjects.Zone;
  nameText: Phaser.GameObjects.Text;
  typeText: Phaser.GameObjects.Text;
  bansText: Phaser.GameObjects.Text | null;
}

interface TrafficShip {
  routeId: string;
  ship: Ship;
  sprite:
    | Phaser.GameObjects.Sprite
    | Phaser.GameObjects.Image
    | Phaser.GameObjects.Arc;
  t: number;
  speed: number;
  dir: 1 | -1;
}

export class SystemMapScene extends Phaser.Scene {
  private systemId = "";
  private portraitPanel: PortraitPanel | null = null;
  private view3D: SystemView3D | null = null;
  private planetMarkers: PlanetMarker[] = [];
  private trafficShips: TrafficShip[] = [];
  private vizRect = { x: 0, y: 0, w: 0, h: 0 };
  private lastTurn = 1;
  private modalHidden = false;
  // Layout-derived UI chrome — repositioned in relayout().
  private titleStripRect: Phaser.GameObjects.Rectangle | null = null;
  private titleLabel: Label | null = null;
  private hintRect: Phaser.GameObjects.Rectangle | null = null;
  private hintText: Phaser.GameObjects.Text | null = null;
  private backButton: Button | null = null;
  private lockOverlay: Phaser.GameObjects.Graphics | null = null;
  private lockMsg: Phaser.GameObjects.Text | null = null;
  // Reused per-frame scratch vectors (avoid GC churn in update loop).
  private readonly tmpWorld = new THREE.Vector3();
  private readonly tmpWorldNext = new THREE.Vector3();
  // Last galaxy-state slices used to drive the 3D scene. Reference-compared
  // in handleStateChanged so we only rebuild Three.js geometry when the
  // visual contents of the system actually change — not on every cash or
  // tech tick.
  private lastPlanetsRef: GameState["galaxy"]["planets"] | null = null;
  private lastRoutesRef: GameState["activeRoutes"] | null = null;

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

    this.events.once("shutdown", () => {
      if (this.scene.isActive("PlanetDetailScene")) {
        this.scene.stop("PlanetDetailScene");
      }
    });

    const systemEmpireAccessible = isEmpireAccessible(system.empireId, state);
    const systemEmpire = state.galaxy.empires.find(
      (e) => e.id === system.empireId,
    );
    const empirePolicy = state.empireTradePolicies[system.empireId];

    this.portraitPanel = new PortraitPanel(this, {
      x: L.sidebarLeft,
      y: L.contentTop,
      width: L.sidebarWidth,
      height: L.contentHeight,
    });
    this.portraitPanel.showSystem(system, planets.length);

    const cx = L.mainContentLeft + L.mainContentWidth / 2;
    const cy = L.contentTop + L.contentHeight / 2;

    // Title strip
    this.titleStripRect = this.add
      .rectangle(cx, L.contentTop + 7, 220, 22, theme.colors.background, 0.42)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.2)
      .setOrigin(0.5, 0);
    this.titleLabel = new Label(this, {
      x: cx,
      y: L.contentTop + 10,
      text: system.name,
      style: "caption",
      color: theme.colors.textDim,
    });
    this.titleLabel.setOrigin(0.5, 0);

    // Right-edge hint
    const hintBoxWidth = Math.min(280, L.mainContentWidth - 232);
    if (hintBoxWidth > 160) {
      const hintX = L.mainContentLeft + L.mainContentWidth - 8;
      const hintY = L.contentTop + 34;
      this.hintRect = this.add
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
      this.hintText = this.add
        .text(
          hintX - 6,
          hintY + 4,
          "Click a planet for local market details and route setup\nPlanets orbit one quarter at a time — inner orbits move faster\nPlanet size & orbit reflect type and population",
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

    // Back button — placed at bottom-left of main content, OUTSIDE the 3D
    // viewport rect so it stays visible above the WebGL canvas.
    this.backButton = new Button(this, {
      x: L.mainContentLeft,
      y: L.contentTop + L.contentHeight - 50,
      width: 160,
      label: "Back to Galaxy",
      onClick: () => {
        const hud = this.scene.get("GameHUDScene") as GameHUDScene;
        hud.switchContentScene("GalaxyMapScene");
      },
    });

    if (!systemEmpireAccessible) {
      this.lockOverlay = this.add.graphics();
      this.lockOverlay.fillStyle(0x000000, 0.5);
      this.lockOverlay.fillRect(
        L.mainContentLeft,
        L.contentTop,
        L.mainContentWidth,
        L.contentHeight,
      );
      this.lockOverlay.setDepth(900);

      this.lockMsg = this.add
        .text(
          cx,
          cy - 20,
          `🔒 ${systemEmpire?.name ?? "Unknown Empire"}\nLocked — complete a contract to unlock trade`,
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
      addPulseTween(this, this.lockMsg, {
        minAlpha: 0.6,
        maxAlpha: 1.0,
        duration: 2000,
      });
    }

    // 3D viewport carved out of the main content area, leaving strips at
    // top (title/hint) and bottom (back button) for the 2D HUD chrome.
    this.vizRect = {
      x: L.mainContentLeft + 4,
      y: L.contentTop + 60,
      w: L.mainContentWidth - 8,
      h: L.contentHeight - 130,
    };

    const phaserCanvas = this.game.canvas;
    this.view3D = new SystemView3D({
      phaserCanvas,
      designWidth: L.gameWidth,
      designHeight: L.gameHeight,
    });
    this.view3D.setViewport(this.vizRect);
    this.view3D.setSystem(system, planets, state.activeRoutes);
    this.view3D.setTurn(state.turn);
    this.lastTurn = state.turn;
    this.lastPlanetsRef = state.galaxy.planets;
    this.lastRoutesRef = state.activeRoutes;

    this.buildPlanetMarkers(
      planets,
      empirePolicy,
      systemEmpireAccessible,
      theme,
    );
    this.rebuildTrafficShips(state, system.id);
    this.installCameraInput();
    this.installModalVisibilityToggle();

    // React to game state changes — turn advancement and route edits both
    // come through this channel.
    const handleStateChanged = (
      nextStateUnknown: unknown,
      changedKeysUnknown: unknown,
    ): void => {
      const nextState = nextStateUnknown as GameState;
      const changedKeys = changedKeysUnknown as
        | Set<keyof GameState>
        | undefined;
      // Skip the (expensive) Three.js geometry rebuild unless something
      // visually relevant changed: the galaxy (planets), active routes,
      // or the turn counter. GameStore swaps array references whenever
      // contents change, so reference-equality is sufficient. Falling back
      // to the ref check keeps us correct for callers like setState() that
      // may not provide a precise changedKeys set.
      const galaxyMaybeChanged =
        !changedKeys || changedKeys.has("galaxy") || changedKeys.has("fleet");
      const routesMaybeChanged =
        !changedKeys || changedKeys.has("activeRoutes");
      const turnMaybeChanged = !changedKeys || changedKeys.has("turn");
      if (!galaxyMaybeChanged && !routesMaybeChanged && !turnMaybeChanged) {
        return;
      }
      const sys = nextState.galaxy.systems.find((s) => s.id === this.systemId);
      if (!sys || !this.view3D) return;

      const planetsChanged = nextState.galaxy.planets !== this.lastPlanetsRef;
      const routesChanged = nextState.activeRoutes !== this.lastRoutesRef;
      const turnChanged = nextState.turn !== this.lastTurn;
      if (planetsChanged || routesChanged) {
        const sysPlanets = nextState.galaxy.planets.filter(
          (p) => p.systemId === this.systemId,
        );
        this.view3D.setSystem(sys, sysPlanets, nextState.activeRoutes);
        this.lastPlanetsRef = nextState.galaxy.planets;
        this.lastRoutesRef = nextState.activeRoutes;
      }
      if (turnChanged) {
        this.view3D.setTurn(nextState.turn);
        this.lastTurn = nextState.turn;
      }
      if (planetsChanged || routesChanged || turnChanged) {
        this.rebuildTrafficShips(nextState, sys.id);
      }
    };
    gameStore.on("stateChanged", handleStateChanged);

    const cleanup = (): void => {
      gameStore.off("stateChanged", handleStateChanged);
      for (const t of this.trafficShips) {
        t.sprite.destroy();
      }
      this.trafficShips = [];
      for (const m of this.planetMarkers) {
        m.hitbox.destroy();
        m.nameText.destroy();
        m.typeText.destroy();
        m.bansText?.destroy();
      }
      this.planetMarkers = [];
      this.view3D?.destroy();
      this.view3D = null;
    };
    this.events.once("shutdown", cleanup);
    this.events.once("destroy", cleanup);

    this.relayout();
    attachReflowHandler(this, () => this.relayout());
  }

  private relayout(): void {
    const L = getLayout();
    const cx = L.mainContentLeft + L.mainContentWidth / 2;
    const cy = L.contentTop + L.contentHeight / 2;

    // PortraitPanel: setPosition before setSize.
    if (this.portraitPanel) {
      this.portraitPanel.setPosition(L.sidebarLeft, L.contentTop);
      this.portraitPanel.setSize(L.sidebarWidth, L.contentHeight);
    }

    // Title strip — fixed-size rect; reposition only.
    this.titleStripRect?.setPosition(cx, L.contentTop + 7);
    this.titleLabel?.setPosition(cx, L.contentTop + 10);

    // Right-edge hint box (rect + text). Reposition only — Phaser.GameObjects.Text
    // doesn't expose setSize for fixedWidth-driven wrapping.
    if (this.hintRect && this.hintText) {
      const hintBoxWidth = Math.min(280, L.mainContentWidth - 232);
      const hintX = L.mainContentLeft + L.mainContentWidth - 8;
      const hintY = L.contentTop + 34;
      this.hintRect.setPosition(hintX, hintY);
      this.hintRect.setSize(hintBoxWidth, 46);
      // TODO(setSize): Phaser.GameObjects.Text has no setSize; fixedWidth is
      // baked at construction. Reposition only — wrapping width does not
      // adapt on resize.
      this.hintText.setPosition(hintX - 6, hintY + 4);
    }

    // Back button — sub-widget without setSize; reposition only.
    // TODO(setSize): Button does not expose setSize; width is fixed.
    this.backButton?.setPosition(
      L.mainContentLeft,
      L.contentTop + L.contentHeight - 50,
    );

    // Lock overlay — graphics needs to be redrawn at the new rect.
    if (this.lockOverlay) {
      this.lockOverlay.clear();
      this.lockOverlay.fillStyle(0x000000, 0.5);
      this.lockOverlay.fillRect(
        L.mainContentLeft,
        L.contentTop,
        L.mainContentWidth,
        L.contentHeight,
      );
    }
    this.lockMsg?.setPosition(cx, cy - 20);

    // 3D viewport rect — pure data, safe to update.
    this.vizRect = {
      x: L.mainContentLeft + 4,
      y: L.contentTop + 60,
      w: L.mainContentWidth - 8,
      h: L.contentHeight - 130,
    };
    this.view3D?.setViewport(this.vizRect);
    // TODO(3d-resize): SystemView3D's renderer/camera are sized to the design
    // dimensions captured at construction. A true 3D resize would require
    // calling renderer.setSize and updating the camera projection matrix —
    // out of scope for this UI overlay reflow.
  }

  override update(_time: number, delta: number): void {
    if (!this.view3D) return;
    this.syncModalVisibility();
    this.updatePlanetMarkers();
    this.updateTrafficShips(delta);
  }

  private buildPlanetMarkers(
    planets: Planet[],
    empirePolicy: GameState["empireTradePolicies"][string] | undefined,
    accessible: boolean,
    theme: ReturnType<typeof getTheme>,
  ): void {
    for (const planet of planets) {
      const hitbox = this.add
        .zone(0, 0, 48, 48)
        .setOrigin(0.5, 0.5)
        .setInteractive({ cursor: "pointer", useHandCursor: true });

      const nameText = this.add
        .text(0, 0, planet.name, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.text),
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0)
        .setDepth(50);

      const typeText = this.add
        .text(0, 0, planet.type, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0)
        .setDepth(50);

      let bansText: Phaser.GameObjects.Text | null = null;
      if (empirePolicy && accessible) {
        const bans = [
          ...empirePolicy.bannedImports.map(
            (c) => `❌${getCargoShortLabel(c)}`,
          ),
          ...empirePolicy.bannedExports.map(
            (c) => `⛔${getCargoShortLabel(c)}`,
          ),
        ];
        if (bans.length > 0) {
          bansText = this.add
            .text(0, 0, bans.join(" "), {
              fontSize: "9px",
              fontFamily: theme.fonts.caption.family,
              color: colorToString(theme.colors.loss),
              stroke: "#000000",
              strokeThickness: 1,
            })
            .setOrigin(0.5, 0)
            .setAlpha(0.8)
            .setDepth(50);
        }
      }

      hitbox.on("pointerup", () => {
        if (!accessible) return;
        getAudioDirector().sfx("map_star_select");
        const idx = this.planetMarkers.findIndex(
          (m) => m.planet.id === planet.id,
        );
        if (this.portraitPanel) {
          this.portraitPanel.showPlanet(planet, idx);
        }
        if (this.scene.isActive("PlanetDetailScene")) {
          this.scene.stop("PlanetDetailScene");
        }
        this.scene.launch("PlanetDetailScene", { planetId: planet.id });
      });

      this.planetMarkers.push({
        planet,
        hitbox,
        nameText,
        typeText,
        bansText,
      });
    }
  }

  private updatePlanetMarkers(): void {
    if (!this.view3D) return;
    for (const m of this.planetMarkers) {
      const world = this.view3D.getPlanetWorldPosition(m.planet.id);
      if (!world) {
        m.hitbox.setVisible(false);
        m.nameText.setVisible(false);
        m.typeText.setVisible(false);
        m.bansText?.setVisible(false);
        continue;
      }
      const proj = this.view3D.projectToScreenDesign(world);
      const visible = proj.visible;
      m.hitbox.setVisible(visible);
      m.nameText.setVisible(visible);
      m.typeText.setVisible(visible);
      m.bansText?.setVisible(visible);
      if (!visible) continue;
      m.hitbox.setPosition(proj.x, proj.y);
      // Label below the planet sphere.
      m.nameText.setPosition(proj.x, proj.y + 22);
      m.typeText.setPosition(proj.x, proj.y + 36);
      m.bansText?.setPosition(proj.x, proj.y + 50);
    }
  }

  private rebuildTrafficShips(state: GameState, systemId: string): void {
    for (const t of this.trafficShips) {
      t.sprite.destroy();
    }
    this.trafficShips = [];

    const planetById = new Map(
      state.galaxy.planets.map((p) => [p.id, p] as const),
    );
    const sources = [
      { routes: state.activeRoutes, fleet: state.fleet },
      ...state.aiCompanies.map((c) => ({
        routes: c.activeRoutes,
        fleet: c.fleet,
      })),
    ];

    for (const { routes, fleet } of sources) {
      const fleetById = new Map(fleet.map((s) => [s.id, s] as const));
      for (const route of routes) {
        const origin = planetById.get(route.originPlanetId);
        const dest = planetById.get(route.destinationPlanetId);
        if (!origin || !dest) continue;
        if (origin.systemId !== systemId || dest.systemId !== systemId)
          continue;
        const assignedShips = route.assignedShipIds.flatMap((id) => {
          const s = fleetById.get(id);
          return s ? [s] : [];
        });
        if (assignedShips.length === 0) continue;
        const visibleUnits = getVisibleRouteTrafficUnits(assignedShips.length);

        for (let i = 0; i < visibleUnits; i++) {
          const ship = assignedShips[i % assignedShips.length];
          const sprite = this.createShipSprite(ship);
          this.trafficShips.push({
            routeId: route.id,
            ship,
            sprite,
            t: i / visibleUnits,
            speed: 0.04 + Math.random() * 0.02, // progress per second
            dir: 1,
          });
        }
      }
    }
  }

  private createShipSprite(
    ship: Ship,
  ):
    | Phaser.GameObjects.Sprite
    | Phaser.GameObjects.Image
    | Phaser.GameObjects.Arc {
    const tint = getShipColor(ship.class);
    const mapKey = getShipMapKey(ship.class);
    const animKey = getShipMapAnimKey(ship.class);
    const iconKey = getShipIconKey(ship.class);

    if (mapKey && animKey && this.textures.exists(mapKey)) {
      const sprite = this.add
        .sprite(0, 0, mapKey, "1")
        .setDisplaySize(24, 24)
        .setTint(tint)
        .setDepth(40);
      sprite.play(animKey);
      return sprite;
    }
    if (iconKey && this.textures.exists(iconKey)) {
      return this.add
        .image(0, 0, iconKey)
        .setDisplaySize(16, 16)
        .setTint(tint)
        .setDepth(40);
    }
    return this.add.circle(0, 0, 3, tint, 0.85).setDepth(40);
  }

  private updateTrafficShips(delta: number): void {
    if (!this.view3D) return;
    const dt = delta / 1000;
    const v3 = this.view3D;
    const tmp = this.tmpWorld;
    const tmpNext = this.tmpWorldNext;
    for (const ts of this.trafficShips) {
      const curve = v3.getRouteCurve(ts.routeId);
      if (!curve) {
        (
          ts.sprite as Phaser.GameObjects.GameObject & {
            setVisible?: (v: boolean) => unknown;
          }
        ).setVisible?.(false);
        continue;
      }
      ts.t += ts.speed * ts.dir * dt;
      if (ts.t >= 1) {
        ts.t = 1;
        ts.dir = -1;
      } else if (ts.t <= 0) {
        ts.t = 0;
        ts.dir = 1;
      }
      curve.getPointAt(ts.t, tmp);
      const lookT = Math.min(1, Math.max(0, ts.t + 0.02 * ts.dir));
      curve.getPointAt(lookT, tmpNext);

      const proj = v3.projectToScreenDesign({ x: tmp.x, y: tmp.y, z: tmp.z });
      const projNext = v3.projectToScreenDesign({
        x: tmpNext.x,
        y: tmpNext.y,
        z: tmpNext.z,
      });
      const sprite = ts.sprite as Phaser.GameObjects.GameObject & {
        setPosition: (x: number, y: number) => unknown;
        setVisible?: (v: boolean) => unknown;
        setRotation?: (r: number) => unknown;
      };
      sprite.setVisible?.(proj.visible);
      if (!proj.visible) continue;
      sprite.setPosition(proj.x, proj.y);
      sprite.setRotation?.(
        Math.atan2(projNext.y - proj.y, projNext.x - proj.x),
      );
    }
  }

  /**
   * Bind mouse-wheel zoom and pointer-drag pan to the 3D camera. The 3D
   * canvas itself has pointer-events disabled (Phaser owns input), so we
   * hook Phaser's input system instead. Camera bounds in SystemView3D
   * keep the system on-screen no matter how the user pulls.
   */
  private installCameraInput(): void {
    const inViewport = (worldX: number, worldY: number): boolean =>
      worldX >= this.vizRect.x &&
      worldX <= this.vizRect.x + this.vizRect.w &&
      worldY >= this.vizRect.y &&
      worldY <= this.vizRect.y + this.vizRect.h;

    const onWheel = (
      _ptr: Phaser.Input.Pointer,
      _objs: unknown,
      _dx: number,
      dy: number,
    ): void => {
      if (!this.view3D) return;
      this.view3D.zoom(dy * 0.02);
    };
    this.input.on("wheel", onWheel);

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (ptr: Phaser.Input.Pointer): void => {
      if (!inViewport(ptr.worldX, ptr.worldY)) return;
      dragging = true;
      lastX = ptr.x;
      lastY = ptr.y;
    };
    const onUp = (): void => {
      dragging = false;
    };
    const onMove = (ptr: Phaser.Input.Pointer): void => {
      if (!dragging || !this.view3D) return;
      const dx = ptr.x - lastX;
      const dy = ptr.y - lastY;
      lastX = ptr.x;
      lastY = ptr.y;
      this.view3D.pan(dx, dy);
    };
    this.input.on("pointerdown", onDown);
    this.input.on("pointerup", onUp);
    this.input.on("pointerupoutside", onUp);
    this.input.on("pointermove", onMove);

    const cleanup = (): void => {
      this.input.off("wheel", onWheel);
      this.input.off("pointerdown", onDown);
      this.input.off("pointerup", onUp);
      this.input.off("pointerupoutside", onUp);
      this.input.off("pointermove", onMove);
    };
    this.events.once("shutdown", cleanup);
    this.events.once("destroy", cleanup);
  }

  /**
   * Hide the 3D canvas while a Phaser modal/overlay scene is on top of the
   * system view. The Three canvas sits at z-index 2 (above Phaser) so the
   * sun and planets would otherwise bleed through modal windows. Polled in
   * `update()` since Phaser 4's SceneManager doesn't expose a global
   * lifecycle event bus that types cleanly.
   */
  private syncModalVisibility(): void {
    if (!this.view3D) return;
    const hasOverlay = OVERLAY_SCENE_KEYS.some((k) => this.scene.isActive(k));
    if (hasOverlay !== this.modalHidden) {
      this.modalHidden = hasOverlay;
      this.view3D.setVisible(!hasOverlay);
    }
  }

  private installModalVisibilityToggle(): void {
    // Poll in update() — see syncModalVisibility().
    this.modalHidden = false;
  }
}

const OVERLAY_SCENE_KEYS = ["PlanetDetailScene"];

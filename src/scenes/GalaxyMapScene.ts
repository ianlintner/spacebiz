import * as Phaser from "phaser";
import * as THREE from "three";
import { gameStore } from "../data/GameStore.ts";
import {
  getTheme,
  colorToString,
  Label,
  getLayout,
  getShipColor,
  getShipIconKey,
  getShipMapKey,
  getShipMapAnimKey,
} from "../ui/index.ts";
import {
  getEmpireFlagKey,
  generateEmpireFlags,
  FLAG_WIDTH,
  FLAG_HEIGHT,
} from "../ui/EmpireFlagGenerator.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import { isEmpireAccessible } from "../game/empire/EmpireAccessManager.ts";
import {
  buildGalaxyRouteTrafficVisuals,
  buildGalaxyRouteTrafficStateKey,
  getAvailableRouteSlots,
  getUsedRouteSlots,
  getAvailableLocalRouteSlots,
  getUsedLocalRouteSlots,
  getAvailableGalacticRouteSlots,
  getUsedGalacticRouteSlots,
} from "../game/routes/RouteManager.ts";
import type { RouteTrafficVisual } from "../game/routes/RouteManager.ts";
import { GalaxyView3D } from "./galaxy3d/GalaxyView3D.ts";

import type { GameHUDScene } from "./GameHUDScene.ts";
import type { Empire, GameState, Ship, StarSystem } from "../data/types.ts";

interface SystemMarker {
  system: StarSystem;
  hitbox: Phaser.GameObjects.Zone;
  nameText: Phaser.GameObjects.Text;
  flag: Phaser.GameObjects.Image | null;
  lockIcon: Phaser.GameObjects.Text | null;
  accessible: boolean;
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

export class GalaxyMapScene extends Phaser.Scene {
  private view3D: GalaxyView3D | null = null;
  private vizRect = { x: 0, y: 0, w: 0, h: 0 };
  private systemMarkers: SystemMarker[] = [];
  private trafficShips: TrafficShip[] = [];
  private empireInfoCard: Phaser.GameObjects.Container | null = null;
  private routeTrafficStateKey: string | null = null;

  // Last state slices used to drive the 3D scene. Reference-compared so we
  // only rebuild Three.js geometry when the visual contents of the galaxy
  // actually change — not on every cash or tech tick.
  private lastSystemsRef: GameState["galaxy"]["systems"] | null = null;
  private lastEmpiresRef: GameState["galaxy"]["empires"] | null = null;
  private lastHyperlanesRef: GameState["hyperlanes"] | null = null;
  private lastBorderPortsRef: GameState["borderPorts"] | null = null;

  // Reused per-frame scratch (no GC churn in update loop).
  private readonly tmpWorld = new THREE.Vector3();
  private readonly tmpWorldNext = new THREE.Vector3();

  constructor() {
    super({ key: "GalaxyMapScene" });
  }

  create(): void {
    const L = getLayout();
    const theme = getTheme();
    const state = gameStore.getState();
    const { systems, empires } = state.galaxy;

    // Pre-generate empire flag textures so we can use them in 2D overlays.
    generateEmpireFlags(this, empires, state.seed);

    // Carve a 3D viewport out of the main content area, leaving strips at
    // top (HUD: title, slot count) and bottom (legend) for 2D Phaser chrome.
    this.vizRect = {
      x: L.mainContentLeft + 4,
      y: L.contentTop + 60,
      w: L.mainContentWidth - 8,
      h: L.contentHeight - 70,
    };

    const phaserCanvas = this.game.canvas;
    this.view3D = new GalaxyView3D({
      phaserCanvas,
      designWidth: L.gameWidth,
      designHeight: L.gameHeight,
    });
    this.view3D.setViewport(this.vizRect);
    this.view3D.setGalaxy(
      systems,
      state.hyperlanes ?? [],
      state.borderPorts ?? [],
      empires,
    );
    const initialVisuals = buildGalaxyRouteTrafficVisuals(state);
    this.view3D.setRoutes(initialVisuals);
    this.routeTrafficStateKey = buildGalaxyRouteTrafficStateKey(state);

    this.lastSystemsRef = systems;
    this.lastEmpiresRef = empires;
    this.lastHyperlanesRef = state.hyperlanes ?? null;
    this.lastBorderPortsRef = state.borderPorts ?? null;

    this.buildSystemMarkers(state);
    this.rebuildTrafficShips(state, initialVisuals);
    this.installCameraInput();
    this.installInfoCardDismiss();

    // ── HUD overlay (top-of-content strip) ─────────────────────────────────
    this.buildHud(state, theme, L);

    // ── State subscription ─────────────────────────────────────────────────
    const handleStateChanged = (
      nextStateUnknown: unknown,
      changedKeysUnknown: unknown,
    ): void => {
      const nextState = nextStateUnknown as GameState;
      const changedKeys = changedKeysUnknown as
        | Set<keyof GameState>
        | undefined;
      if (!this.view3D) return;

      const galaxyMaybeChanged = !changedKeys || changedKeys.has("galaxy");
      const hyperlanesMaybeChanged =
        !changedKeys || changedKeys.has("hyperlanes");
      const portsMaybeChanged = !changedKeys || changedKeys.has("borderPorts");
      const routesMaybeChanged =
        !changedKeys ||
        changedKeys.has("activeRoutes") ||
        changedKeys.has("aiCompanies") ||
        changedKeys.has("fleet");

      const systemsChanged =
        nextState.galaxy.systems !== this.lastSystemsRef ||
        nextState.galaxy.empires !== this.lastEmpiresRef;
      const hyperlanesChanged =
        (nextState.hyperlanes ?? null) !== this.lastHyperlanesRef ||
        (nextState.borderPorts ?? null) !== this.lastBorderPortsRef;

      if (galaxyMaybeChanged && systemsChanged) {
        this.view3D.setGalaxy(
          nextState.galaxy.systems,
          nextState.hyperlanes ?? [],
          nextState.borderPorts ?? [],
          nextState.galaxy.empires,
        );
        this.lastSystemsRef = nextState.galaxy.systems;
        this.lastEmpiresRef = nextState.galaxy.empires;
        this.lastHyperlanesRef = nextState.hyperlanes ?? null;
        this.lastBorderPortsRef = nextState.borderPorts ?? null;
        this.rebuildSystemMarkers(nextState);
      } else if (
        (galaxyMaybeChanged || hyperlanesMaybeChanged || portsMaybeChanged) &&
        hyperlanesChanged
      ) {
        this.view3D.setGalaxy(
          nextState.galaxy.systems,
          nextState.hyperlanes ?? [],
          nextState.borderPorts ?? [],
          nextState.galaxy.empires,
        );
        this.lastHyperlanesRef = nextState.hyperlanes ?? null;
        this.lastBorderPortsRef = nextState.borderPorts ?? null;
      }

      if (routesMaybeChanged) {
        const nextKey = buildGalaxyRouteTrafficStateKey(nextState);
        if (nextKey !== this.routeTrafficStateKey) {
          const visuals = buildGalaxyRouteTrafficVisuals(nextState);
          this.view3D.setRoutes(visuals);
          this.rebuildTrafficShips(nextState, visuals);
          this.routeTrafficStateKey = nextKey;
        }
      }
    };
    gameStore.on("stateChanged", handleStateChanged);

    const cleanup = (): void => {
      gameStore.off("stateChanged", handleStateChanged);
      for (const t of this.trafficShips) {
        t.sprite.destroy();
      }
      this.trafficShips = [];
      for (const m of this.systemMarkers) {
        m.hitbox.destroy();
        m.nameText.destroy();
        m.flag?.destroy();
        m.lockIcon?.destroy();
      }
      this.systemMarkers = [];
      this.destroyInfoCard();
      this.view3D?.destroy();
      this.view3D = null;
    };
    this.events.once("shutdown", cleanup);
    this.events.once("destroy", cleanup);
  }

  override update(_time: number, delta: number): void {
    if (!this.view3D) return;
    this.updateSystemMarkers();
    this.updateTrafficShips(delta);
  }

  private buildHud(
    state: GameState,
    theme: ReturnType<typeof getTheme>,
    L: ReturnType<typeof getLayout>,
  ): void {
    const sysUsed = getUsedLocalRouteSlots(state);
    const sysTot = getAvailableLocalRouteSlots(state);
    const empUsed = getUsedRouteSlots(state);
    const empTot = getAvailableRouteSlots(state);
    const galUsed = getUsedGalacticRouteSlots(state);
    const galTot = getAvailableGalacticRouteSlots(state);
    const slotsUsed = sysUsed + empUsed + galUsed;
    const slotsTotal = sysTot + empTot + galTot;

    const hudLabelTop = L.contentTop + 18;
    const addBackdrop = (
      x: number,
      y: number,
      w: number,
      h: number,
      ox: number,
      oy: number,
    ): Phaser.GameObjects.Rectangle =>
      this.add
        .rectangle(x, y, w, h, theme.colors.background, 0.46)
        .setStrokeStyle(1, theme.colors.panelBorder, 0.22)
        .setOrigin(ox, oy)
        .setDepth(900);

    addBackdrop(L.mainContentLeft + 8, hudLabelTop - 4, 156, 46, 0, 0);
    addBackdrop(
      L.mainContentLeft + L.mainContentWidth - 8,
      hudLabelTop - 4,
      280,
      58,
      1,
      0,
    );

    new Label(this, {
      x: L.mainContentLeft + 16,
      y: hudLabelTop,
      text: "Galaxy Map",
      style: "caption",
      color: theme.colors.textDim,
    }).setDepth(901);
    new Label(this, {
      x: L.mainContentLeft + 16,
      y: hudLabelTop + 18,
      text: `Sys ${sysUsed}/${sysTot} · Emp ${empUsed}/${empTot} · Gal ${galUsed}/${galTot}`,
      style: "caption",
      color: slotsUsed >= slotsTotal ? theme.colors.loss : theme.colors.textDim,
    }).setDepth(901);

    this.add
      .text(
        L.mainContentLeft + L.mainContentWidth - 16,
        hudLabelTop,
        "Scroll to zoom · Drag to pan\nClick a star to view its system\nLines = active trade routes",
        {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
          align: "right",
          fixedWidth: 260,
          stroke: "#000000",
          strokeThickness: 2,
        },
      )
      .setOrigin(1, 0)
      .setAlpha(0.85)
      .setDepth(901);
  }

  private buildSystemMarkers(state: GameState): void {
    const theme = getTheme();
    const { systems, empires } = state.galaxy;
    const empireMap = new Map(empires.map((e) => [e.id, e] as const));
    const accessibleByEmp = new Map<string, boolean>();
    for (const emp of empires) {
      accessibleByEmp.set(emp.id, isEmpireAccessible(emp.id, state));
    }

    for (const sys of systems) {
      const accessible = accessibleByEmp.get(sys.empireId) ?? false;
      const hitbox = this.add
        .zone(0, 0, 36, 36)
        .setOrigin(0.5, 0.5)
        .setInteractive({ cursor: "pointer", useHandCursor: true });

      const nameText = this.add
        .text(0, 0, sys.name, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(
            accessible ? theme.colors.text : theme.colors.textDim,
          ),
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0)
        .setAlpha(accessible ? 1 : 0.45)
        .setDepth(50);

      let flag: Phaser.GameObjects.Image | null = null;
      const empire = empireMap.get(sys.empireId);
      if (empire && empire.homeSystemId === sys.id) {
        const flagKey = getEmpireFlagKey(empire.id);
        if (this.textures.exists(flagKey)) {
          flag = this.add
            .image(0, 0, flagKey)
            .setOrigin(0.5, 1)
            .setAlpha(0.85)
            .setDepth(48);
          flag.setDisplaySize(FLAG_WIDTH, FLAG_HEIGHT);
        }
      }

      let lockIcon: Phaser.GameObjects.Text | null = null;
      if (!accessible) {
        lockIcon = this.add
          .text(0, 0, "🔒", { fontSize: "12px" })
          .setOrigin(0, 0.5)
          .setAlpha(0.7)
          .setDepth(50);
      }

      hitbox.on("pointerup", () => {
        getAudioDirector().sfx("map_star_select");
        if (accessible) {
          const hud = this.scene.get("GameHUDScene") as GameHUDScene;
          hud.switchContentScene("SystemMapScene", { systemId: sys.id });
          return;
        }
        // Locked empire — show info card instead of navigating.
        const proj = this.view3D?.projectToScreenDesign(
          this.view3D.getSystemWorldPosition(sys.id) ?? { x: 0, y: 0, z: 0 },
        );
        const empName = empire?.name ?? "Unknown";
        this.destroyInfoCard();
        this.empireInfoCard = this.createEmpireInfoCard(
          proj?.x ?? this.vizRect.x + this.vizRect.w / 2,
          proj?.y ?? this.vizRect.y + this.vizRect.h / 2,
          empName,
          empire,
          state,
          false,
        );
      });

      this.systemMarkers.push({
        system: sys,
        hitbox,
        nameText,
        flag,
        lockIcon,
        accessible,
      });
    }
  }

  private rebuildSystemMarkers(state: GameState): void {
    for (const m of this.systemMarkers) {
      m.hitbox.destroy();
      m.nameText.destroy();
      m.flag?.destroy();
      m.lockIcon?.destroy();
    }
    this.systemMarkers = [];
    this.buildSystemMarkers(state);
  }

  private updateSystemMarkers(): void {
    if (!this.view3D) return;
    for (const m of this.systemMarkers) {
      const world = this.view3D.getSystemWorldPosition(m.system.id);
      if (!world) {
        m.hitbox.setVisible(false);
        m.nameText.setVisible(false);
        m.flag?.setVisible(false);
        m.lockIcon?.setVisible(false);
        continue;
      }
      const proj = this.view3D.projectToScreenDesign(world);
      const visible = proj.visible;
      m.hitbox.setVisible(visible);
      m.nameText.setVisible(visible);
      m.flag?.setVisible(visible);
      m.lockIcon?.setVisible(visible);
      if (!visible) continue;
      m.hitbox.setPosition(proj.x, proj.y);
      m.nameText.setPosition(proj.x, proj.y + 12);
      if (m.flag) m.flag.setPosition(proj.x, proj.y - 16);
      if (m.lockIcon) m.lockIcon.setPosition(proj.x + 12, proj.y - 6);
    }
  }

  private rebuildTrafficShips(
    state: GameState,
    visuals: RouteTrafficVisual[],
  ): void {
    for (const t of this.trafficShips) {
      t.sprite.destroy();
    }
    this.trafficShips = [];

    const fleetByOwner = new Map<string, Map<string, Ship>>();
    fleetByOwner.set("player", new Map(state.fleet.map((s) => [s.id, s])));
    for (const c of state.aiCompanies) {
      fleetByOwner.set(c.id, new Map(c.fleet.map((s) => [s.id, s])));
    }

    for (const visual of visuals) {
      if (visual.assignedShips.length === 0) continue;
      if (visual.visibleUnits === 0) continue;

      for (let i = 0; i < visual.visibleUnits; i++) {
        const ship = visual.assignedShips[i % visual.assignedShips.length];
        const sprite = this.createShipSprite(ship);
        this.trafficShips.push({
          routeId: visual.routeId,
          ship,
          sprite,
          t: i / Math.max(1, visual.visibleUnits),
          speed: 0.018 + Math.random() * 0.012,
          dir: 1,
        });
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
        .setDisplaySize(20, 20)
        .setTint(tint)
        .setDepth(40);
      sprite.play(animKey);
      return sprite;
    }
    if (iconKey && this.textures.exists(iconKey)) {
      return this.add
        .image(0, 0, iconKey)
        .setDisplaySize(14, 14)
        .setTint(tint)
        .setDepth(40);
    }
    return this.add.circle(0, 0, 2.5, tint, 0.85).setDepth(40);
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
      this.view3D.zoom(dy * 0.06);
    };
    this.input.on("wheel", onWheel);

    let dragging = false;
    let dragMoved = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (ptr: Phaser.Input.Pointer): void => {
      if (!inViewport(ptr.worldX, ptr.worldY)) return;
      dragging = true;
      dragMoved = false;
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
      if (!dragMoved && Math.abs(dx) + Math.abs(dy) < 4) return;
      dragMoved = true;
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

  private installInfoCardDismiss(): void {
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      const overObjects = this.input.hitTestPointer(pointer);
      if (overObjects.length === 0) {
        this.destroyInfoCard();
      }
    });
  }

  private destroyInfoCard(): void {
    if (this.empireInfoCard) {
      this.empireInfoCard.destroy(true);
      this.empireInfoCard = null;
    }
  }

  private createEmpireInfoCard(
    screenX: number,
    screenY: number,
    name: string,
    empire: Empire | undefined,
    state: GameState,
    accessible: boolean,
  ): Phaser.GameObjects.Container {
    const theme = getTheme();
    const container = this.add.container(screenX + 20, screenY - 20);
    container.setDepth(950);
    const cardW = 260;
    const lines: string[] = [name];
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
    lines.push(accessible ? "Status: Unlocked" : "Status: Locked 🔒");

    const lineHeight = 16;
    const cardH = lines.length * lineHeight + 16;

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

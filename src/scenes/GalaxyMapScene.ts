import * as Phaser from "phaser";
import * as THREE from "three";
import { gameStore } from "../data/GameStore.ts";
import {
  getTheme,
  colorToString,
  Label,
  Tooltip,
  Dropdown,
  getLayout,
  getShipColor,
  getShipIconKey,
  getShipMapKey,
  getShipMapAnimKey,
  attachReflowHandler,
  GalaxySidebarPanel,
  SceneUiDirector,
} from "../ui/index.ts";
import type { GalaxySidebarData } from "../ui/index.ts";
import { openRouteBuilder } from "../ui/RouteBuilderPanel.ts";
import {
  getEmpireFlagKey,
  generateEmpireFlags,
  FLAG_WIDTH,
  FLAG_HEIGHT,
} from "@rogue-universe/shared";
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
import { GalaxyView3D, setActiveGalaxyView } from "./galaxy3d/GalaxyView3D.ts";
import type { ProjectedScreen, Vec3 } from "./galaxy3d/GalaxyView3D.ts";

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

interface EmpireMarker {
  empire: Empire;
  nameText: Phaser.GameObjects.Text;
}

interface TrafficShip {
  routeId: string;
  ship: Ship;
  ownerId: string;
  sprite:
    | Phaser.GameObjects.Sprite
    | Phaser.GameObjects.Image
    | Phaser.GameObjects.Arc;
  t: number;
  speed: number;
  dir: 1 | -1;
  /** Base display size (px) used as reference for zoom scaling. */
  baseSize: number;
  /** Whether the ship is currently docked/waiting at a terminus. */
  waiting: boolean;
  /** Seconds remaining in the current wait. */
  waitRemaining: number;
}

interface LayerToggleButton {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  hit: Phaser.GameObjects.Zone;
  width: number;
  isOn: () => boolean;
  setOn: (on: boolean) => void;
}

interface HQMarker {
  systemId: string;
  companyName: string;
  isPlayer: boolean;
  dot: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
}

const VIZ_TOP_STRIP = 60;
const VIZ_BOTTOM_STRIP = 60; // layer toggle row height
const TOGGLE_ROW_GAP = 8;
const TOGGLE_FILTER_WIDTH = 220;

export class GalaxyMapScene extends Phaser.Scene {
  private view3D: GalaxyView3D | null = null;
  private vizRect = { x: 0, y: 0, w: 0, h: 0 };
  private systemMarkers: SystemMarker[] = [];
  private empireMarkers: EmpireMarker[] = [];
  private trafficShips: TrafficShip[] = [];
  private empireInfoCard: Phaser.GameObjects.Container | null = null;
  private routeTrafficStateKey: string | null = null;

  // ── Layer state (toggleable via the bottom button row) ────────────────────
  private showEmpires = true;
  private showSystemNames = true;
  private showShips = true;
  // Multiplied into each ship's per-instance speed each frame. Set to a high
  // value during sim playback so ships visibly race along their lanes.
  private shipSpeedMultiplier = 1;
  // Cycle through: null (all) → "player" → each AI company id → null …
  // Routes/ships not matching the filter are ghosted; full hide is via the
  // ship layer toggle.
  private companyFilter: string | null = null;
  private companyFilterCycle: (string | null)[] = [null];
  private layerToggles: LayerToggleButton[] = [];
  private companyFilterButton: LayerToggleButton | null = null;
  private sidebar: GalaxySidebarPanel | null = null;

  // ── System highlight ring ─────────────────────────────────────────────────
  private highlightedSystemId: string | null = null;
  private highlightRing: Phaser.GameObjects.Arc | null = null;

  // ── Company HQ icons (projected each frame like the highlight ring) ────────
  private hqMarkers: HQMarker[] = [];

  // ── Route-builder selection mode ──────────────────────────────────────────
  private ui!: SceneUiDirector;
  private routeOriginSystemId: string | null = null;
  private routeOriginRing: Phaser.GameObjects.Arc | null = null;
  private holdTimerEvent: Phaser.Time.TimerEvent | null = null;
  private holdFired = false;

  // ── Navigation dropdown (top-strip, right side) ───────────────────────────
  private navDropdown: Dropdown | null = null;

  // ── Scene-level tooltip (shared by system/empire markers) ─────────────────
  private mapTooltip: Tooltip | null = null;

  // ── Reflow-tracked overlay chrome ─────────────────────────────────────────
  // Cached so relayout() can reposition without rebuilding the world.
  private hudBackdropLeft: Phaser.GameObjects.Rectangle | null = null;
  private hudBackdropRight: Phaser.GameObjects.Rectangle | null = null;
  private hudTitleLabel: Label | null = null;
  private hudSlotsLabel: Label | null = null;
  private hudHintText: Phaser.GameObjects.Text | null = null;

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

    this.ui = new SceneUiDirector(this);

    // Pre-generate empire flag textures so we can use them in 2D overlays.
    generateEmpireFlags(this, empires, state.seed);

    // Carve a 3D viewport out of the main content area, leaving strips at
    // top (HUD: title, slot count) and bottom (layer toggles) for 2D Phaser
    // chrome. The left sidebar slot becomes the galaxy info panel.
    this.vizRect = this.computeVizRect(L);

    const phaserCanvas = this.game.canvas;
    this.view3D = new GalaxyView3D({
      phaserCanvas,
      designWidth: L.gameWidth,
      designHeight: L.gameHeight,
    });
    setActiveGalaxyView(this.view3D);
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

    // Create the shared tooltip before building markers so attachments work.
    this.mapTooltip = new Tooltip(this, { showDelay: 400, maxWidth: 280 });
    this.mapTooltip.setDepth(2000);

    this.buildSystemMarkers(state);
    this.buildEmpireMarkers(state);
    this.buildHQMarkers(state);
    this.rebuildTrafficShips(state, initialVisuals);
    this.installCameraInput();
    this.installInfoCardDismiss();

    // ── HUD overlay (top-of-content strip) ─────────────────────────────────
    this.buildHud(state, theme, L);
    this.buildSidebar(state, L);
    this.buildLayerToggleRow(state, theme, L);

    attachReflowHandler(this, () => this.relayout());

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
        this.rebuildEmpireMarkers(nextState);
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
      for (const m of this.empireMarkers) {
        m.nameText.destroy();
      }
      this.empireMarkers = [];
      this.sidebar?.destroy();
      this.sidebar = null;
      for (const t of this.layerToggles) {
        t.bg.destroy();
        t.label.destroy();
        t.hit.destroy();
      }
      this.layerToggles = [];
      if (this.companyFilterButton) {
        this.companyFilterButton.bg.destroy();
        this.companyFilterButton.label.destroy();
        this.companyFilterButton.hit.destroy();
        this.companyFilterButton = null;
      }
      this.destroyInfoCard();
      this.highlightRing?.destroy();
      this.highlightRing = null;
      this.highlightedSystemId = null;
      this.navDropdown?.destroy();
      this.navDropdown = null;
      this.mapTooltip?.destroy();
      this.mapTooltip = null;
      this.routeOriginRing?.destroy();
      this.routeOriginRing = null;
      this.holdTimerEvent?.remove();
      this.holdTimerEvent = null;
      setActiveGalaxyView(null);
      this.view3D?.destroy();
      this.view3D = null;
    };
    this.events.once("shutdown", cleanup);
    this.events.once("destroy", cleanup);
  }

  /**
   * Place a pulsing accent ring at a system's projected screen position.
   * Call with `null` to clear the highlight.
   */
  highlightSystem(systemId: string | null): void {
    if (this.highlightRing) {
      this.highlightRing.destroy();
      this.highlightRing = null;
    }
    this.highlightedSystemId = systemId;
    if (!systemId) return;
    const theme = getTheme();
    this.highlightRing = this.add
      .arc(0, 0, 22, 0, 360, false, theme.colors.accent, 0)
      .setStrokeStyle(2, theme.colors.accent, 0.9)
      .setDepth(55);
    // Pulse tween — yoyo scale to draw attention.
    this.tweens.add({
      targets: this.highlightRing,
      scaleX: 1.35,
      scaleY: 1.35,
      alpha: 0.6,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

  /**
   * Focus the 3D camera on a system and place a highlight ring on it.
   */
  focusSystem(systemId: string): void {
    this.view3D?.focusOnSystem(systemId);
    this.highlightSystem(systemId);
  }

  /**
   * Focus the 3D camera on a route's midpoint.
   * Clears any existing system highlight since we're now looking at a route.
   */
  focusRoute(routeId: string): void {
    this.view3D?.focusOnRoute(routeId);
    this.highlightSystem(null);
  }

  override update(_time: number, delta: number): void {
    if (!this.view3D) return;
    this.updateSystemMarkers();
    this.updateEmpireMarkers();
    this.updateTrafficShips(delta);
    this.updateHighlightRing();
    this.updateRouteOriginRing();
    this.updateHQMarkers();
  }

  private updateHighlightRing(): void {
    if (!this.highlightRing || !this.highlightedSystemId || !this.view3D)
      return;
    const world = this.view3D.getSystemWorldPosition(this.highlightedSystemId);
    if (!world) {
      this.highlightRing.setVisible(false);
      return;
    }
    const proj = this.view3D.projectToScreenDesign(world);
    this.highlightRing.setVisible(proj.visible);
    if (proj.visible) {
      this.highlightRing.setPosition(proj.x, proj.y);
    }
  }

  /**
   * Called on hold-click (~450 ms) of an accessible system hitbox.
   * First hold sets the route origin; second hold on a different system opens
   * the route builder directly (without requiring a separate click).
   */
  private handleSystemHold(systemId: string): void {
    if (!this.routeOriginSystemId) {
      this.setRouteOrigin(systemId);
    } else if (this.routeOriginSystemId !== systemId) {
      this.openRouteBuilderFor(this.routeOriginSystemId, systemId);
    }
  }

  private setRouteOrigin(systemId: string): void {
    const theme = getTheme();
    this.routeOriginRing?.destroy();
    this.routeOriginSystemId = systemId;
    this.routeOriginRing = this.add
      .arc(0, 0, 20, 0, 360, false, theme.colors.profit, 0)
      .setStrokeStyle(2, theme.colors.profit, 0.9)
      .setDepth(56)
      .setVisible(false);
    this.tweens.add({
      targets: this.routeOriginRing,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
    this.hudHintText?.setText(
      "Hold to set origin · Click another star to create route\nEsc to cancel",
    );

    // Escape key cancels selection.
    this.input.keyboard?.once("keydown-ESC", () => this.clearRouteSelection());
  }

  clearRouteSelection(): void {
    this.routeOriginRing?.destroy();
    this.routeOriginRing = null;
    this.routeOriginSystemId = null;
    this.hudHintText?.setText(
      "Hold a star to start a route · Click to view system\nScroll to zoom · Drag to pan",
    );
  }

  private updateRouteOriginRing(): void {
    if (!this.routeOriginRing || !this.routeOriginSystemId || !this.view3D)
      return;
    const world = this.view3D.getSystemWorldPosition(this.routeOriginSystemId);
    if (!world) {
      this.routeOriginRing.setVisible(false);
      return;
    }
    const proj = this.view3D.projectToScreenDesign(world);
    this.routeOriginRing.setVisible(proj.visible);
    if (proj.visible) this.routeOriginRing.setPosition(proj.x, proj.y);
  }

  private openRouteBuilderFor(
    originSystemId: string,
    destSystemId: string,
  ): void {
    const state = gameStore.getState();
    const { planets } = state.galaxy;

    const originPlanet = planets.find((p) => p.systemId === originSystemId);
    const destPlanet = planets.find((p) => p.systemId === destSystemId);

    this.clearRouteSelection();

    // Dim the 3D canvas so the modal reads cleanly over it.
    this.view3D?.setCanvasOpacity(0.15);
    const restoreOpacity = (): void => {
      this.view3D?.setCanvasOpacity(1);
    };

    openRouteBuilder(this, {
      ui: this.ui,
      title: "New Trade Route",
      initialOriginPlanetId: originPlanet?.id,
      initialDestinationPlanetId: destPlanet?.id,
      allowAutoBuy: true,
      onComplete: (_result) => {
        restoreOpacity();
        // Rebuild route traffic visuals so newly created route appears.
        const fresh = gameStore.getState();
        const visuals = buildGalaxyRouteTrafficVisuals(fresh);
        this.view3D?.setRoutes(visuals);
        this.routeTrafficStateKey = buildGalaxyRouteTrafficStateKey(fresh);
      },
      onCancel: () => {
        restoreOpacity();
      },
    });
  }

  private buildHQMarkers(state: GameState): void {
    for (const m of this.hqMarkers) {
      m.dot.destroy();
      m.label.destroy();
    }
    this.hqMarkers = [];

    const theme = getTheme();
    const { systems, planets } = state.galaxy;

    const resolveSystem = (planetId: string | undefined): string | null => {
      if (!planetId) return null;
      return planets.find((p) => p.id === planetId)?.systemId ?? null;
    };

    const entries: { systemId: string; name: string; isPlayer: boolean }[] = [];

    const playerSystemId = resolveSystem(state.homeworldPlanetId);
    if (playerSystemId && systems.find((s) => s.id === playerSystemId)) {
      entries.push({
        systemId: playerSystemId,
        name: state.companyName,
        isPlayer: true,
      });
    }

    for (const ai of state.aiCompanies) {
      if (ai.bankrupt) continue;
      const sysId = resolveSystem(ai.homeworldPlanetId);
      if (!sysId || !systems.find((s) => s.id === sysId)) continue;
      if (entries.some((e) => e.systemId === sysId && !e.isPlayer)) continue;
      entries.push({ systemId: sysId, name: ai.name, isPlayer: false });
    }

    const PLAYER_COLOR = theme.colors.accent;
    const AI_COLOR = 0x888888;

    for (const entry of entries) {
      const color = entry.isPlayer ? PLAYER_COLOR : AI_COLOR;
      const dot = this.add
        .arc(0, 0, 5, 0, 360, false, color, 0.9)
        .setDepth(60)
        .setVisible(false);
      const labelText = entry.isPlayer ? `⌂ ${entry.name}` : `⌂ ${entry.name}`;
      const label = this.add
        .text(0, 0, labelText, {
          fontSize: "9px",
          fontFamily: theme.fonts.caption.family,
          color: entry.isPlayer
            ? colorToString(PLAYER_COLOR)
            : colorToString(AI_COLOR),
        })
        .setDepth(61)
        .setVisible(false);

      if (this.mapTooltip) {
        const tooltipText = entry.isPlayer
          ? `${entry.name}\n(Your HQ)`
          : `${entry.name} HQ`;
        this.mapTooltip.attachTo(dot, tooltipText);
        this.mapTooltip.attachTo(label, tooltipText);
      }

      this.hqMarkers.push({
        systemId: entry.systemId,
        companyName: entry.name,
        isPlayer: entry.isPlayer,
        dot,
        label,
      });
    }
  }

  private updateHQMarkers(): void {
    if (!this.view3D) return;
    for (const m of this.hqMarkers) {
      const world = this.view3D.getSystemWorldPosition(m.systemId);
      if (!world) {
        m.dot.setVisible(false);
        m.label.setVisible(false);
        continue;
      }
      const proj = this.view3D.projectToScreenDesign(world);
      const vis = proj.visible;
      m.dot.setVisible(vis);
      m.label.setVisible(vis);
      if (vis) {
        m.dot.setPosition(proj.x, proj.y - 14);
        m.label.setPosition(proj.x + 8, proj.y - 20);
      }
    }
  }

  private computeVizRect(L: ReturnType<typeof getLayout>): {
    x: number;
    y: number;
    w: number;
    h: number;
  } {
    return {
      x: L.mainContentLeft + 4,
      y: L.contentTop + VIZ_TOP_STRIP,
      w: L.mainContentWidth - 8,
      h: L.contentHeight - VIZ_TOP_STRIP - VIZ_BOTTOM_STRIP,
    };
  }

  /**
   * Re-flow the 2D overlay chrome on canvas resize. The 3D viewport rect is
   * updated via `view3D.setViewport`, and the underlying Three.js
   * renderer/camera is resized via `view3D.setSize` so the WebGL drawing
   * buffer matches the new host-canvas dimensions.
   */
  private relayout(): void {
    const L = getLayout();

    // 3D viewport rect (overlay-side) + WebGL drawing buffer + camera aspect.
    this.vizRect = this.computeVizRect(L);
    this.view3D?.setViewport(this.vizRect);
    this.view3D?.setSize(L.gameWidth, L.gameHeight);

    // HUD overlay strip.
    const hudLabelTop = L.contentTop + 18;
    if (this.hudBackdropLeft) {
      this.hudBackdropLeft.setPosition(L.mainContentLeft + 8, hudLabelTop - 4);
    }
    if (this.hudBackdropRight) {
      this.hudBackdropRight.setPosition(
        L.mainContentLeft + L.mainContentWidth - 8,
        hudLabelTop - 4,
      );
    }
    this.hudTitleLabel?.setPosition(L.mainContentLeft + 16, hudLabelTop);
    this.hudSlotsLabel?.setPosition(L.mainContentLeft + 16, hudLabelTop + 18);
    this.hudHintText?.setPosition(
      L.mainContentLeft + L.mainContentWidth - 16,
      hudLabelTop,
    );

    // Reposition the nav dropdown to stay centered in the top strip.
    if (this.navDropdown) {
      const navW = 180;
      const navX = Math.floor(
        L.mainContentLeft + L.mainContentWidth / 2 - navW / 2,
      );
      this.navDropdown.setPosition(navX, hudLabelTop - 2);
    }

    // Layer toggle row — reposition existing buttons sequentially.
    const rowY = L.contentTop + L.contentHeight - 56;
    let x = L.mainContentLeft + 8;
    for (const btn of this.layerToggles) {
      btn.bg.setPosition(x, rowY);
      btn.label.setPosition(x + btn.width / 2, rowY + 18);
      btn.hit.setPosition(x, rowY);
      x += btn.width + TOGGLE_ROW_GAP;
    }
    if (this.companyFilterButton) {
      const cf = this.companyFilterButton;
      cf.bg.setPosition(x, rowY);
      cf.label.setPosition(x + cf.width / 2, rowY + 18);
      cf.hit.setPosition(x, rowY);
    }

    // Sidebar widget reflows in place — its row count is height-clamped, so
    // setSize() may show or hide rows depending on the new content height.
    // Refresh data alongside the resize so the per-empire row reflects the
    // latest state (matches the previous rebuildSidebar() behaviour).
    if (this.sidebar && L.sidebarWidth > 0) {
      this.sidebar.setPosition(L.sidebarLeft, L.contentTop);
      this.sidebar.setSize(L.sidebarWidth, L.contentHeight);
      this.sidebar.setSidebarData(this.gatherSidebarData(gameStore.getState()));
    }
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

    this.hudBackdropLeft = addBackdrop(
      L.mainContentLeft + 8,
      hudLabelTop - 4,
      156,
      46,
      0,
      0,
    );
    this.hudBackdropRight = addBackdrop(
      L.mainContentLeft + L.mainContentWidth - 8,
      hudLabelTop - 4,
      280,
      58,
      1,
      0,
    );

    this.hudTitleLabel = new Label(this, {
      x: L.mainContentLeft + 16,
      y: hudLabelTop,
      text: "Galaxy Map",
      style: "caption",
      color: theme.colors.textDim,
    });
    this.hudTitleLabel.setDepth(901);
    this.hudSlotsLabel = new Label(this, {
      x: L.mainContentLeft + 16,
      y: hudLabelTop + 18,
      text: `Sys ${sysUsed}/${sysTot} · Emp ${empUsed}/${empTot} · Gal ${galUsed}/${galTot}`,
      style: "caption",
      color: slotsUsed >= slotsTotal ? theme.colors.loss : theme.colors.textDim,
    });
    this.hudSlotsLabel.setDepth(901);

    this.hudHintText = this.add
      .text(
        L.mainContentLeft + L.mainContentWidth - 16,
        hudLabelTop,
        "Scroll to zoom · Drag to pan · Hold a star to start a route\nClick a star to view its system · Lines = active trade routes",
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

    // Navigation dropdown — alphabetically sorted system list, placed in the
    // centre of the top HUD strip so it doesn't crowd left/right info panels.
    const navDropdownWidth = 180;
    const navDropdownX = Math.floor(
      L.mainContentLeft + L.mainContentWidth / 2 - navDropdownWidth / 2,
    );
    const navDropdownY = hudLabelTop - 2;
    const systems = [...state.galaxy.systems].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    this.navDropdown = new Dropdown(this, {
      x: navDropdownX,
      y: navDropdownY,
      width: navDropdownWidth,
      height: 32,
      options: systems.map((s) => ({ value: s.id, label: s.name })),
      onChange: (value) => {
        this.focusSystem(value);
      },
    });
    this.navDropdown.setDepth(910);
  }

  /**
   * Sidebar info panel (left of the 3D viewport). Mirrors the sidebar slot
   * other scenes use — keeps the visual rhythm consistent and gives players
   * an at-a-glance read of empire roster and galaxy stats.
   */
  private buildSidebar(
    state: GameState,
    L: ReturnType<typeof getLayout>,
  ): void {
    if (L.sidebarWidth <= 0) return;
    this.sidebar = new GalaxySidebarPanel(this, {
      x: L.sidebarLeft,
      y: L.contentTop,
      width: L.sidebarWidth,
      height: L.contentHeight,
    });
    this.sidebar.setDepth(40);
    this.sidebar.setSidebarData(this.gatherSidebarData(state));
  }

  private gatherSidebarData(state: GameState): GalaxySidebarData {
    const empires = state.galaxy.empires;
    const systems = state.galaxy.systems;
    const hyperlanes = state.hyperlanes ?? [];

    // System count per empire so the player can rank empires by size at a
    // glance — matches the visual mass of empire halos in the 3D view.
    const empSystemCount = new Map<string, number>();
    for (const sys of systems) {
      empSystemCount.set(
        sys.empireId,
        (empSystemCount.get(sys.empireId) ?? 0) + 1,
      );
    }
    const empiresSorted = [...empires].sort(
      (a, b) =>
        (empSystemCount.get(b.id) ?? 0) - (empSystemCount.get(a.id) ?? 0),
    );

    return {
      systemCount: systems.length,
      empireCount: empires.length,
      hyperlaneCount: hyperlanes.length,
      playerEmpireName:
        empires.find((e) => e.id === state.playerEmpireId)?.name ?? "—",
      empires: empiresSorted.map((emp) => ({
        id: emp.id,
        name: emp.name,
        color: emp.color,
        systemCount: empSystemCount.get(emp.id) ?? 0,
        tariffRate: emp.tariffRate,
        accessible: isEmpireAccessible(emp.id, state),
      })),
    };
  }

  /**
   * Bottom toggle row: layer visibility (Empires/Names/Ships) + a company
   * filter that cycles through `null → player → each AI co → null`. Routes
   * and ships not matching the filter are ghosted to a low alpha; hiding
   * the Ships layer outright removes them entirely.
   */
  private buildLayerToggleRow(
    state: GameState,
    theme: ReturnType<typeof getTheme>,
    L: ReturnType<typeof getLayout>,
  ): void {
    // Build the filter cycle from the current set of companies in play.
    this.companyFilterCycle = [
      null,
      "player",
      ...state.aiCompanies.map((c) => c.id),
    ];
    const labelForFilter = (id: string | null): string => {
      if (id === null) return "Filter: All Companies";
      if (id === "player") return `Filter: ${state.companyName}`;
      const co = state.aiCompanies.find((c) => c.id === id);
      return `Filter: ${co?.name ?? id}`;
    };

    const rowY = L.contentTop + L.contentHeight - 56;
    let x = L.mainContentLeft + 8;

    const makeToggle = (
      label: string,
      isOn: () => boolean,
      onClick: () => void,
      width: number,
    ): LayerToggleButton => {
      const bg = this.add
        .rectangle(x, rowY, width, 36, theme.colors.panelBg, 0.85)
        .setStrokeStyle(1, theme.colors.panelBorder, 0.6)
        .setOrigin(0, 0)
        .setDepth(902);
      const text = this.add
        .text(x + width / 2, rowY + 18, label, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.text),
        })
        .setOrigin(0.5, 0.5)
        .setDepth(903);
      const hit = this.add
        .zone(x, rowY, width, 36)
        .setOrigin(0, 0)
        .setInteractive({ cursor: "pointer", useHandCursor: true });
      const refresh = (): void => {
        const on = isOn();
        bg.setFillStyle(
          on ? theme.colors.accent : theme.colors.panelBg,
          on ? 0.5 : 0.85,
        );
        bg.setStrokeStyle(
          1,
          on ? theme.colors.accent : theme.colors.panelBorder,
          on ? 0.9 : 0.6,
        );
        text.setColor(
          colorToString(on ? theme.colors.text : theme.colors.textDim),
        );
      };
      hit.on("pointerup", () => {
        getAudioDirector().sfx("ui_tab_switch");
        onClick();
        refresh();
      });
      const btn: LayerToggleButton = {
        bg,
        label: text,
        hit,
        width,
        isOn,
        setOn: () => refresh(),
      };
      refresh();
      x += width + TOGGLE_ROW_GAP;
      return btn;
    };

    this.layerToggles.push(
      makeToggle(
        "Empires",
        () => this.showEmpires,
        () => this.setEmpiresVisible(!this.showEmpires),
        90,
      ),
    );
    this.layerToggles.push(
      makeToggle(
        "Names",
        () => this.showSystemNames,
        () => {
          this.showSystemNames = !this.showSystemNames;
        },
        80,
      ),
    );
    this.layerToggles.push(
      makeToggle(
        "Ships",
        () => this.showShips,
        () => this.setShipsVisible(!this.showShips),
        80,
      ),
    );

    // Company filter — wider button, separate row slot. Custom isOn() returns
    // true whenever a filter is active so the styling reflects "filtering on".
    const filterWidth = TOGGLE_FILTER_WIDTH;
    const filterBg = this.add
      .rectangle(x, rowY, filterWidth, 36, theme.colors.panelBg, 0.85)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.6)
      .setOrigin(0, 0)
      .setDepth(902);
    const filterText = this.add
      .text(
        x + filterWidth / 2,
        rowY + 18,
        labelForFilter(this.companyFilter),
        {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.text),
        },
      )
      .setOrigin(0.5, 0.5)
      .setDepth(903);
    const filterHit = this.add
      .zone(x, rowY, filterWidth, 36)
      .setOrigin(0, 0)
      .setInteractive({ cursor: "pointer", useHandCursor: true });
    const refreshFilter = (): void => {
      const on = this.companyFilter !== null;
      filterBg.setFillStyle(
        on ? theme.colors.accent : theme.colors.panelBg,
        on ? 0.5 : 0.85,
      );
      filterBg.setStrokeStyle(
        1,
        on ? theme.colors.accent : theme.colors.panelBorder,
        on ? 0.9 : 0.6,
      );
      filterText.setText(labelForFilter(this.companyFilter));
      filterText.setColor(
        colorToString(on ? theme.colors.text : theme.colors.textDim),
      );
    };
    filterHit.on("pointerup", () => {
      getAudioDirector().sfx("ui_tab_switch");
      this.cycleCompanyFilter();
      refreshFilter();
    });
    refreshFilter();
    this.companyFilterButton = {
      bg: filterBg,
      label: filterText,
      hit: filterHit,
      width: filterWidth,
      isOn: () => this.companyFilter !== null,
      setOn: () => refreshFilter(),
    };
  }

  private setEmpiresVisible(on: boolean): void {
    this.showEmpires = on;
    this.view3D?.setEmpireHalosVisible(on);
  }

  private setShipsVisible(on: boolean): void {
    this.showShips = on;
    for (const t of this.trafficShips) {
      (
        t.sprite as Phaser.GameObjects.GameObject & {
          setVisible?: (v: boolean) => unknown;
        }
      ).setVisible?.(on);
    }
  }

  private cycleCompanyFilter(): void {
    const idx = this.companyFilterCycle.indexOf(this.companyFilter);
    const next =
      this.companyFilterCycle[(idx + 1) % this.companyFilterCycle.length];
    this.companyFilter = next;
    this.view3D?.setRouteCompanyFilter(next);
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

      // Tooltip: show system name + empire, with lock status if inaccessible.
      if (this.mapTooltip) {
        let tipText = `${sys.name} · ${empire?.name ?? "Frontier"}`;
        if (!accessible) tipText += "\n[Locked — empire access required]";
        this.mapTooltip.attachTo(hitbox, tipText);
      }

      hitbox.on("pointerdown", () => {
        this.holdFired = false;
        this.holdTimerEvent?.remove();
        if (!accessible) return;
        this.holdTimerEvent = this.time.delayedCall(450, () => {
          this.holdFired = true;
          this.handleSystemHold(sys.id);
        });
      });

      hitbox.on("pointerup", () => {
        this.holdTimerEvent?.remove();
        this.holdTimerEvent = null;
        if (this.holdFired) {
          this.holdFired = false;
          return;
        }
        getAudioDirector().sfx("map_star_select");
        if (accessible) {
          // Route-selection mode: first click after hold sets destination.
          if (this.routeOriginSystemId && this.routeOriginSystemId !== sys.id) {
            this.openRouteBuilderFor(this.routeOriginSystemId, sys.id);
            return;
          }
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

      hitbox.on("pointerout", () => {
        this.holdTimerEvent?.remove();
        this.holdTimerEvent = null;
        this.holdFired = false;
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

  /**
   * Build a label for each empire, positioned at the empire's territory
   * centroid. Always visible (light tinted) so the political layer reads
   * even when zoomed in close enough to drop system labels.
   */
  private buildEmpireMarkers(state: GameState): void {
    const theme = getTheme();
    for (const emp of state.galaxy.empires) {
      const accessible = isEmpireAccessible(emp.id, state);
      // Tint by empire color, lightened toward white for legibility against
      // the dim halo. Earlier this rendered at body+1 fontSize / alpha 0.7
      // and crowded the system label layer in dense regions (Drax/Zenthari).
      // Now reads as a quieter political backdrop, with a per-frame zoom
      // gate (see updateEmpireMarkers) hiding it entirely when the camera
      // is close to a system.
      const baseColor = emp.color;
      const tinted = lightenHex(baseColor, 0.55);
      const nameText = this.add
        .text(0, 0, emp.name, {
          fontSize: `${theme.fonts.body.size}px`,
          fontFamily: theme.fonts.body.family,
          color: colorToString(tinted),
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0.5)
        .setAlpha(accessible ? 0.32 : 0.24)
        .setDepth(45);

      // Tooltip on empire label showing political summary.
      if (this.mapTooltip) {
        const tipText = `${emp.name}\nDisposition: ${emp.disposition}\nTariff: ${Math.round(emp.tariffRate * 100)}%`;
        this.mapTooltip.attachTo(nameText, tipText);
      }

      this.empireMarkers.push({ empire: emp, nameText });
    }
  }

  private rebuildEmpireMarkers(state: GameState): void {
    for (const m of this.empireMarkers) {
      m.nameText.destroy();
    }
    this.empireMarkers = [];
    this.buildEmpireMarkers(state);
  }

  private updateEmpireMarkers(): void {
    if (!this.view3D) return;
    // Zoom-based hide: when the player has pulled in close to a region
    // (cameraDistance < halfExtent * 0.95), the per-empire label sits over
    // 5–10 system labels in the same frustum and crowds them out. At that
    // zoom the player no longer needs the political context — they're
    // looking at one or two systems. The "Empires" toggle still wins if
    // the player wants the layer off entirely.
    const camDist = this.view3D.getCameraDistance();
    const halfExtent = this.view3D.getGalaxyHalfExtent();
    const zoomedIn = camDist < halfExtent * 0.95;
    for (const m of this.empireMarkers) {
      if (!this.showEmpires || zoomedIn) {
        m.nameText.setVisible(false);
        continue;
      }
      const centroid = this.view3D.getEmpireCentroid(m.empire.id);
      if (!centroid) {
        m.nameText.setVisible(false);
        continue;
      }
      const proj = this.view3D.projectToScreenDesign(centroid);
      m.nameText.setVisible(proj.visible);
      if (!proj.visible) continue;
      m.nameText.setPosition(proj.x, proj.y);
    }
  }

  private updateSystemMarkers(): void {
    if (!this.view3D) return;
    // LOD: when the camera is pulled back the galaxy fills the viewport with
    // tiny, overlapping system labels. Beyond this distance threshold we hide
    // system names and let the empire-name layer carry orientation. The
    // threshold scales with galaxy size so it works for tiny and huge galaxies
    // alike. Star hitboxes stay clickable regardless.
    const camDist = this.view3D.getCameraDistance();
    const halfExtent = this.view3D.getGalaxyHalfExtent();
    // Combine LOD distance gating with the player's manual Names toggle.
    const showSystemLabels = this.showSystemNames && camDist < halfExtent * 2.0;

    // Grid-based collision avoidance: bucket each visible system's projected
    // centre into a fixed cell. The first system in a cell shows its label,
    // any later system in the same cell hides its label. O(n) per frame;
    // accessible (player-relevant) systems win cell ownership over locked
    // ones so the politically-important names aren't suppressed.
    const cellSize = 56;
    const occupied = new Set<string>();
    // Two-pass: pass 1 reserves cells for accessible systems, pass 2 fills
    // remaining cells with locked systems. Both build screen positions.
    type Project = { proj: ProjectedScreen; world: Vec3 } | null;
    const projects: Project[] = new Array(this.systemMarkers.length);
    for (let i = 0; i < this.systemMarkers.length; i++) {
      const world = this.view3D.getSystemWorldPosition(
        this.systemMarkers[i].system.id,
      );
      projects[i] = world
        ? { proj: this.view3D.projectToScreenDesign(world), world }
        : null;
    }
    const labelDecisions: boolean[] = new Array(this.systemMarkers.length);
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < this.systemMarkers.length; i++) {
        const m = this.systemMarkers[i];
        const p = projects[i];
        if (!p || !p.proj.visible) {
          labelDecisions[i] = false;
          continue;
        }
        if (pass === 0 && !m.accessible) continue;
        if (pass === 1 && m.accessible) continue;
        if (labelDecisions[i] !== undefined) continue;
        const cellX = Math.floor(p.proj.x / cellSize);
        const cellY = Math.floor((p.proj.y + 12) / cellSize);
        const key = `${cellX},${cellY}`;
        if (occupied.has(key)) {
          labelDecisions[i] = false;
        } else {
          occupied.add(key);
          labelDecisions[i] = true;
        }
      }
    }

    for (let i = 0; i < this.systemMarkers.length; i++) {
      const m = this.systemMarkers[i];
      const p = projects[i];
      if (!p) {
        m.hitbox.setVisible(false);
        m.nameText.setVisible(false);
        m.flag?.setVisible(false);
        m.lockIcon?.setVisible(false);
        continue;
      }
      const visible = p.proj.visible;
      m.hitbox.setVisible(visible);
      m.nameText.setVisible(
        visible && showSystemLabels && labelDecisions[i] === true,
      );
      m.flag?.setVisible(visible);
      m.lockIcon?.setVisible(visible);
      if (!visible) continue;
      m.hitbox.setPosition(p.proj.x, p.proj.y);
      m.nameText.setPosition(p.proj.x, p.proj.y + 12);
      if (m.flag) m.flag.setPosition(p.proj.x, p.proj.y - 16);
      if (m.lockIcon) m.lockIcon.setPosition(p.proj.x + 12, p.proj.y - 6);
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
        const { sprite, baseSize } = this.createShipSprite(ship);
        if (!this.showShips) {
          (
            sprite as Phaser.GameObjects.GameObject & {
              setVisible?: (v: boolean) => unknown;
            }
          ).setVisible?.(false);
        }
        this.trafficShips.push({
          routeId: visual.routeId,
          ship,
          ownerId: visual.ownerId,
          sprite,
          baseSize,
          t: i / Math.max(1, visual.visibleUnits),
          speed: 0.012 + Math.random() * 0.01,
          dir: Math.random() < 0.5 ? 1 : -1,
          waiting: false,
          waitRemaining: 0,
        });
      }
    }
  }

  private createShipSprite(ship: Ship): {
    sprite:
      | Phaser.GameObjects.Sprite
      | Phaser.GameObjects.Image
      | Phaser.GameObjects.Arc;
    baseSize: number;
  } {
    const tint = getShipColor(ship.class);
    const mapKey = getShipMapKey(ship.class);
    const animKey = getShipMapAnimKey(ship.class);
    const iconKey = getShipIconKey(ship.class);

    if (mapKey && animKey && this.textures.exists(mapKey)) {
      const sprite = this.add
        .sprite(0, 0, mapKey, "1")
        .setDisplaySize(14, 14)
        .setTint(tint)
        .setDepth(40);
      sprite.play(animKey);
      return { sprite, baseSize: 14 };
    }
    if (iconKey && this.textures.exists(iconKey)) {
      return {
        sprite: this.add
          .image(0, 0, iconKey)
          .setDisplaySize(10, 10)
          .setTint(tint)
          .setDepth(40),
        baseSize: 10,
      };
    }
    return {
      sprite: this.add.circle(0, 0, 2, tint, 0.85).setDepth(40),
      baseSize: 2,
    };
  }

  private updateTrafficShips(delta: number): void {
    if (!this.view3D) return;
    const dt = delta / 1000;
    const v3 = this.view3D;
    const tmp = this.tmpWorld;
    const tmpNext = this.tmpWorldNext;
    const filter = this.companyFilter;

    // Zoom-based scale: ships shrink as you pull back, grow as you zoom in.
    const camDist = v3.getCameraDistance();
    const halfExtent = v3.getGalaxyHalfExtent();
    const zoomMin = halfExtent * 0.6; // closest possible
    const zoomMax = halfExtent * 8; // furthest possible
    const zoomT = Math.max(
      0,
      Math.min(1, (camDist - zoomMin) / (zoomMax - zoomMin)),
    );
    // scale ranges from 2.0 at max zoom-in to 0.6 at max zoom-out
    const zoomScale = 2.0 - zoomT * 1.4;

    for (const ts of this.trafficShips) {
      const curve = v3.getRouteCurve(ts.routeId);
      const sprite = ts.sprite as Phaser.GameObjects.GameObject & {
        setPosition: (x: number, y: number) => unknown;
        setVisible?: (v: boolean) => unknown;
        setRotation?: (r: number) => unknown;
        setAlpha?: (a: number) => unknown;
        setDisplaySize?: (w: number, h: number) => unknown;
        setRadius?: (r: number) => unknown;
      };
      // Layer toggle: ship layer off → fully hidden, no further work.
      if (!this.showShips) {
        sprite.setVisible?.(false);
        continue;
      }
      if (!curve) {
        sprite.setVisible?.(false);
        continue;
      }

      // Wait countdown: ship docked at terminus.
      if (ts.waiting) {
        ts.waitRemaining -= dt;
        if (ts.waitRemaining <= 0) {
          ts.waiting = false;
          ts.waitRemaining = 0;
        }
      } else {
        ts.t += ts.speed * this.shipSpeedMultiplier * ts.dir * dt;
        if (ts.t >= 1) {
          ts.t = 1;
          ts.dir = -1;
          if (Math.random() < 0.45) {
            ts.waiting = true;
            ts.waitRemaining = 0.8 + Math.random() * 2.5;
          }
        } else if (ts.t <= 0) {
          ts.t = 0;
          ts.dir = 1;
          if (Math.random() < 0.45) {
            ts.waiting = true;
            ts.waitRemaining = 0.8 + Math.random() * 2.5;
          }
        }
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
      sprite.setVisible?.(proj.visible);
      if (!proj.visible) continue;
      sprite.setPosition(proj.x, proj.y);
      sprite.setRotation?.(
        Math.atan2(projNext.y - proj.y, projNext.x - proj.x),
      );

      // Apply zoom-dependent size each frame.
      const scaled = ts.baseSize * zoomScale;
      sprite.setDisplaySize?.(scaled, scaled);
      sprite.setRadius?.(Math.max(1, scaled * 0.5));

      // Filter ghosting: non-matching ships drop to a low alpha but remain
      // visible so the player can see they're still flying — full hide is
      // via the Ships layer toggle.
      const ghosted = filter !== null && ts.ownerId !== filter;
      sprite.setAlpha?.(ghosted ? 0.18 : 1);
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
    // Each text line is caption size (12px). ~7.2px/char for monospace-like fonts.
    // Subtract 20px (10px left pad + 10px right margin) from cardW for usable text.
    const maxLineChars = Math.floor(
      (cardW - 20) / (theme.fonts.caption.size * 0.6),
    );
    const truncLine = (s: string) =>
      s.length > maxLineChars ? s.slice(0, maxLineChars - 1) + "…" : s;

    const lines: string[] = [name];
    if (empire) {
      lines.push(truncLine(`Leader: ${empire.leaderName}`));
      lines.push(truncLine(`Disposition: ${empire.disposition}`));
      lines.push(`Tariff: ${Math.round(empire.tariffRate * 100)}%`);
      const policy = state.empireTradePolicies[empire.id];
      if (policy) {
        if (policy.bannedImports.length > 0) {
          lines.push(
            truncLine(`Import Ban: ${policy.bannedImports.join(", ")}`),
          );
        }
        if (policy.bannedExports.length > 0) {
          lines.push(
            truncLine(`Export Ban: ${policy.bannedExports.join(", ")}`),
          );
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

function lightenHex(hex: number, t: number): number {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  const lr = Math.round(r + (255 - r) * t);
  const lg = Math.round(g + (255 - g) * t);
  const lb = Math.round(b + (255 - b) * t);
  return (lr << 16) | (lg << 8) | lb;
}

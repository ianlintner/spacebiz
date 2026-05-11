import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import {
  getTheme,
  colorToString,
  Label,
  Tooltip,
  Dropdown,
  getLayout,
  attachReflowHandler,
  GalaxySidebarPanel,
  SceneUiDirector,
} from "../ui/index.ts";
import type { GalaxySidebarData } from "../ui/index.ts";
import { openRouteBuilder } from "../ui/RouteBuilderPanel.ts";
import { MapLayerToolbar } from "../ui/MapLayerToolbar.ts";
import { mapLayerController } from "../game/map/MapLayerController.ts";
import type { LayerId } from "../game/map/MapLayerRegistry.ts";
import { generateEmpireFlags } from "@rogue-universe/shared";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import { fillChamferedRect, strokeChamferedRect } from "@spacebiz/ui";
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
import { setActiveGalaxyView } from "./galaxy2d/ActiveGalaxyView.ts";
import { GalaxyView2D } from "./galaxy2d/GalaxyView2D.ts";
import type { HQMarker3D } from "./galaxy2d/GalaxyView2D.ts";
import type { ProjectedScreen, Vec3 } from "./galaxy2d/types.ts";

import type { GameHUDScene } from "./GameHUDScene.ts";
import type { Empire, GameState, StarSystem } from "../data/types.ts";

interface SystemMarker {
  system: StarSystem;
  hitbox: Phaser.GameObjects.Zone;
  accessible: boolean;
}

interface LayerToggleButton {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  hit: Phaser.GameObjects.Zone;
  width: number;
}

const VIZ_TOP_STRIP = 60;
const VIZ_BOTTOM_STRIP = 60; // company filter row height
const TOGGLE_FILTER_WIDTH = 220;

export class GalaxyMapScene extends Phaser.Scene {
  private view3D: GalaxyView2D | null = null;
  private vizRect = { x: 0, y: 0, w: 0, h: 0 };
  private systemMarkers: SystemMarker[] = [];
  private empireInfoCard: Phaser.GameObjects.Container | null = null;
  private routeTrafficStateKey: string | null = null;

  private showSystemNames = true;
  // Cycle through: null (all) → "player" → each AI company id → null …
  // Routes/ships not matching the filter are ghosted; full hide is via the
  // ship layer toggle.
  private companyFilter: string | null = null;
  private companyFilterCycle: (string | null)[] = [null];
  private companyFilterButton: LayerToggleButton | null = null;
  private toolbar: MapLayerToolbar | null = null;
  private sidebar: GalaxySidebarPanel | null = null;

  // ── Route-builder selection mode ──────────────────────────────────────────
  private ui!: SceneUiDirector;
  private routeOriginSystemId: string | null = null;
  private holdTimerEvent: Phaser.Time.TimerEvent | null = null;
  private holdFired = false;

  // ── Keyboard pan (WASD + arrow keys) ─────────────────────────────────────
  private panKeys: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private panKeysWASD: Record<string, Phaser.Input.Keyboard.Key> | null = null;

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
    // top (HUD: title, slot count) and bottom (company filter) for 2D Phaser
    // chrome. The left sidebar slot becomes the galaxy info panel.
    this.vizRect = this.computeVizRect(L);

    this.view3D = new GalaxyView2D({
      scene: this,
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
    this.view3D.setAccessibleEmpireIds(
      empires.filter((e) => isEmpireAccessible(e.id, state)).map((e) => e.id),
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
    this.buildHQMarkers(state);
    this.rebuildTrafficShips(state, initialVisuals);
    this.installCameraInput();
    this.installInfoCardDismiss();

    // Start the camera zoomed in on the player's homeworld system.
    const homeworldPlanet = state.galaxy.planets.find(
      (p) => p.id === state.homeworldPlanetId,
    );
    if (homeworldPlanet) {
      this.view3D.focusOnSystem(homeworldPlanet.systemId, true);
    }

    // ── HUD overlay (top-of-content strip) ─────────────────────────────────
    this.buildHud(state, theme, L);
    this.buildSidebar(state, L);
    this.buildLayerToggleRow(state, theme, L);
    this.toolbar = new MapLayerToolbar(this);
    this.installLayerController();

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
        this.buildHQMarkers(nextState);
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

      // Re-tint system labels whenever the unlocked-empires set changes.
      this.view3D.setAccessibleEmpireIds(
        nextState.galaxy.empires
          .filter((e) => isEmpireAccessible(e.id, nextState))
          .map((e) => e.id),
      );
    };
    gameStore.on("stateChanged", handleStateChanged);

    const cleanup = (): void => {
      gameStore.off("stateChanged", handleStateChanged);
      for (const m of this.systemMarkers) {
        m.hitbox.destroy();
      }
      this.systemMarkers = [];
      this.sidebar?.destroy();
      this.sidebar = null;
      if (this.companyFilterButton) {
        this.companyFilterButton.bg.destroy();
        this.companyFilterButton.label.destroy();
        this.companyFilterButton.hit.destroy();
        this.companyFilterButton = null;
      }
      this.destroyInfoCard();
      this.navDropdown?.destroy();
      this.navDropdown = null;
      this.toolbar?.destroy();
      this.toolbar = null;
      this.mapTooltip?.destroy();
      this.mapTooltip = null;
      this.routeOriginSystemId = null;
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
   * Place a pulsing accent ring at a system's 3D world position.
   * Call with `null` to clear the highlight.
   */
  highlightSystem(systemId: string | null): void {
    this.view3D?.setHighlightedSystem(systemId);
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

  /** Scale ship movement speed. 1 = planning (default), ~12 = sim playback. */
  setShipSpeedMultiplier(multiplier: number): void {
    this.view3D?.setShipSpeedMultiplier(multiplier);
  }

  override update(_time: number, delta: number): void {
    if (!this.view3D) return;
    this.updateSystemMarkers();
    this.applyKeyboardPan(delta);
    this.view3D.update(delta / 1000);
  }

  private applyKeyboardPan(delta: number): void {
    if (!this.view3D) return;
    // World-units per ms → ~6 units at 60 fps. Scaled by zoom in view3D.translate.
    const speed = 0.1 * delta;
    let dx = 0;
    let dy = 0;

    const k = this.panKeys;
    const w = this.panKeysWASD;
    if (k?.left.isDown || w?.["A"]?.isDown) dx -= speed;
    if (k?.right.isDown || w?.["D"]?.isDown) dx += speed;
    if (k?.up.isDown || w?.["W"]?.isDown) dy += speed;
    if (k?.down.isDown || w?.["S"]?.isDown) dy -= speed;

    if (dx !== 0 || dy !== 0) {
      this.view3D.translate(dx, dy);
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
    this.routeOriginSystemId = systemId;
    this.view3D?.setRouteOriginSystem(systemId);
    this.hudHintText?.setText(
      "Hold to set origin · Click another star to create route\nEsc to cancel",
    );

    // Escape key cancels selection.
    this.input.keyboard?.once("keydown-ESC", () => this.clearRouteSelection());
  }

  clearRouteSelection(): void {
    this.view3D?.setRouteOriginSystem(null);
    this.routeOriginSystemId = null;
    this.hudHintText?.setText(
      "Hold a star to start a route · Click to view system\nScroll to zoom · Drag to pan",
    );
  }

  /** Show or hide the HUD chrome (title, slots, hints, sidebar, toggles,
   *  system hitboxes). GalaxyView2D galaxy rendering is intentionally left
   *  visible so SimPlaybackScene can use it as a live backdrop. */
  setHudVisible(visible: boolean): void {
    this.hudBackdropLeft?.setVisible(visible);
    this.hudBackdropRight?.setVisible(visible);
    this.hudTitleLabel?.setVisible(visible);
    this.hudSlotsLabel?.setVisible(visible);
    this.hudHintText?.setVisible(visible);
    this.navDropdown?.setVisible(visible);
    this.sidebar?.setVisible(visible);
    if (this.companyFilterButton) {
      this.companyFilterButton.bg.setVisible(visible);
      this.companyFilterButton.label.setVisible(visible);
      this.companyFilterButton.hit.setVisible(visible);
    }
    this.toolbar?.setVisible(visible);
    for (const m of this.systemMarkers) {
      m.hitbox.setVisible(visible);
    }
    if (!visible) this.mapTooltip?.setVisible(false);
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
        this.rebuildTrafficShips(fresh, visuals);
        this.routeTrafficStateKey = buildGalaxyRouteTrafficStateKey(fresh);
      },
      onCancel: () => {
        restoreOpacity();
      },
    });
  }

  private buildHQMarkers(state: GameState): void {
    const { systems, planets } = state.galaxy;

    const resolveSystem = (planetId: string | undefined): string | null => {
      if (!planetId) return null;
      return planets.find((p) => p.id === planetId)?.systemId ?? null;
    };

    const markers: HQMarker3D[] = [];

    const playerSystemId = resolveSystem(state.homeworldPlanetId);
    if (playerSystemId && systems.find((s) => s.id === playerSystemId)) {
      markers.push({ systemId: playerSystemId, isPlayer: true });
    }

    for (const ai of state.aiCompanies) {
      if (ai.bankrupt) continue;
      const sysId = resolveSystem(ai.homeworldPlanetId);
      if (!sysId || !systems.find((s) => s.id === sysId)) continue;
      if (markers.some((m) => m.systemId === sysId && !m.isPlayer)) continue;
      markers.push({ systemId: sysId, isPlayer: false });
    }

    this.view3D?.setHQMarkers3D(markers);
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
    this.toolbar?.reposition(L);

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

    // Layer toggle row — reposition company filter button.
    const rowY = L.contentTop + L.contentHeight - 56;
    const x = L.mainContentLeft + 8;
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
   * Bottom row: company filter that cycles `null → player → each AI co → null`.
   * Routes/ships not matching the filter are ghosted; layer visibility is
   * owned by MapLayerToolbar + MapLayerController.
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
    const x = L.mainContentLeft + 8;

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
    };
  }

  private installLayerController(): void {
    if (!this.view3D) return;

    this.view3D.setEmpireLabelsVisible(
      mapLayerController.isVisible("empire-names"),
    );
    this.view3D.setEmpireHalosVisible(
      mapLayerController.isVisible("empire-borders"),
    );
    this.view3D.setTerritoryBordersVisible(
      mapLayerController.isVisible("empire-borders"),
    );
    this.view3D.setSystemsVisible(mapLayerController.isVisible("systems"));
    this.showSystemNames = mapLayerController.isVisible("system-names");
    this.view3D.setHyperlanesVisible(
      mapLayerController.isVisible("hyperlanes"),
    );
    this.view3D.setShipsVisible(mapLayerController.isVisible("ships"));

    const onLayerChange = (id: unknown): void => {
      if (!this.view3D) return;
      const layerId = id as LayerId;
      const on = mapLayerController.isVisible(layerId);
      switch (layerId) {
        case "empire-names":
          this.view3D.setEmpireLabelsVisible(on);
          break;
        case "empire-borders":
          this.view3D.setEmpireHalosVisible(on);
          this.view3D.setTerritoryBordersVisible(on);
          break;
        case "system-names":
          this.showSystemNames = on;
          break;
        case "systems":
          this.view3D.setSystemsVisible(on);
          break;
        case "hyperlanes":
          this.view3D.setHyperlanesVisible(on);
          break;
        case "ships":
          this.view3D.setShipsVisible(on);
          break;
        default:
          break;
      }
    };

    mapLayerController.on("change", onLayerChange);
    this.events.once("shutdown", () =>
      mapLayerController.off("change", onLayerChange),
    );
    this.events.once("destroy", () =>
      mapLayerController.off("change", onLayerChange),
    );
  }

  private cycleCompanyFilter(): void {
    const idx = this.companyFilterCycle.indexOf(this.companyFilter);
    const next =
      this.companyFilterCycle[(idx + 1) % this.companyFilterCycle.length];
    this.companyFilter = next;
    this.view3D?.setRouteCompanyFilter(next);
  }

  private buildSystemMarkers(state: GameState): void {
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

      const empire = empireMap.get(sys.empireId);

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

      this.systemMarkers.push({ system: sys, hitbox, accessible });
    }
  }

  private rebuildSystemMarkers(state: GameState): void {
    for (const m of this.systemMarkers) m.hitbox.destroy();
    this.systemMarkers = [];
    this.buildSystemMarkers(state);
  }

  /**
   * Rebuild 3D ships from the latest route traffic visuals.
   * Delegates entirely to GalaxyView3D.
   */
  private rebuildTrafficShips(
    _state: GameState,
    visuals: RouteTrafficVisual[],
  ): void {
    if (!this.view3D) return;
    const view = this.view3D;
    view.setShips(visuals, (routeId) => {
      return visuals.find((v) => v.routeId === routeId)?.ownerId === "player";
    });
    // Apply current layer/filter state to newly spawned ships.
    view.setShipsVisible(mapLayerController.isVisible("ships"));
    if (this.companyFilter !== null) {
      view.setRouteCompanyFilter(this.companyFilter);
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

    // Labels are now rendered as 3D sprites inside GalaxyView3D — delegate
    // LOD and toggle control there.
    this.view3D.updateSystemLabelLOD(camDist, halfExtent, this.showSystemNames);

    // Cell size scales with the galaxy so a 160-unit galaxy (~halfExtent 80)
    // gets ~68-unit cells — wider buckets = fewer labels shown at full zoom-out.
    const cellSize = Math.max(56, Math.floor(halfExtent * 0.85));
    const occupied = new Set<string>();
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

    // Apply grid-collision label decisions: collect suppressed system IDs and
    // push them to the view so its per-frame render loop skips them.
    const suppressed: string[] = [];
    for (let i = 0; i < this.systemMarkers.length; i++) {
      if (labelDecisions[i] === false) {
        suppressed.push(this.systemMarkers[i].system.id);
      }
    }
    this.view3D.setSuppressedSystemLabels(suppressed);

    for (let i = 0; i < this.systemMarkers.length; i++) {
      const m = this.systemMarkers[i];
      const p = projects[i];
      if (!p) {
        m.hitbox.setVisible(false);
        continue;
      }
      const visible = p.proj.visible;
      m.hitbox.setVisible(visible);
      if (!visible) continue;
      m.hitbox.setPosition(p.proj.x, p.proj.y);
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

    // Keyboard pan — arrow keys + WASD
    this.panKeys = this.input.keyboard?.createCursorKeys() ?? null;
    this.panKeysWASD =
      (this.input.keyboard?.addKeys("W,A,S,D") as Record<
        string,
        Phaser.Input.Keyboard.Key
      >) ?? null;

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
    fillChamferedRect(bg, 0, 0, cardW, cardH, theme.shape.container.chamfer);
    bg.lineStyle(1, theme.colors.panelBorder, 0.6);
    strokeChamferedRect(bg, 0, 0, cardW, cardH, theme.shape.container.chamfer);
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

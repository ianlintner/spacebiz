import * as Phaser from "phaser";
import * as THREE from "three";
import { gameStore } from "../data/GameStore.ts";
import { simulateTurn } from "../game/simulation/TurnSimulator.ts";
import { SeededRNG } from "../utils/SeededRNG.ts";
import {
  getTheme,
  colorToString,
  Button,
  getLayout,
  FloatingText,
  MilestoneOverlay,
  flashScreen,
  getShipIconKey,
  getShipColor,
  getShipMapKey,
  getShipMapAnimKey,
  attachReflowHandler,
} from "../ui/index.ts";
import type { GameHUDScene } from "./GameHUDScene.ts";
import type { GameState, TurnResult } from "../data/types.ts";
import { EventCategory } from "../data/types.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import { buildGalaxyRouteTrafficVisuals } from "../game/routes/RouteManager.ts";
import { GalaxyView3D } from "./galaxy3d/GalaxyView3D.ts";

// ── Camera constants ──────────────────────────────────────────────────────────
const DRAG_THRESHOLD = 5;
function formatCash(amount: number): string {
  return "\u00A7" + Math.round(amount).toLocaleString("en-US");
}

// Animated ship for one route in the playback. Position is computed each
// frame by sampling the route's 3D curve and projecting to screen.
interface PlaybackShip {
  routeId: string;
  mainSprite:
    | Phaser.GameObjects.Sprite
    | Phaser.GameObjects.Image
    | Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  t: number;
  speed: number;
  dir: 1 | -1;
  delay: number;
  elapsed: number;
}

// Entry for the live competition leaderboard
interface LeaderEntry {
  id: string;
  name: string;
  isPlayer: boolean;
  startCash: number;
  endCash: number;
  profit: number;
  routeCount: number;
  bankrupt: boolean;
}

export class SimPlaybackScene extends Phaser.Scene {
  private newState!: GameState;
  private turnResult!: TurnResult;
  private animationComplete = false;

  // 3D galaxy backdrop and animated ship layer.
  private view3D: GalaxyView3D | null = null;
  private vizRect = { x: 0, y: 0, w: 0, h: 0 };
  private playbackShips: PlaybackShip[] = [];
  private readonly tmpCurvePoint = new THREE.Vector3();
  private readonly tmpCurveLook = new THREE.Vector3();

  // Camera drag state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;

  // Live leaderboard text references (updated each tween frame)
  private leaderCashTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private leaderProfitTexts: Map<string, Phaser.GameObjects.Text> = new Map();

  // Revenue ticker text references
  private revenueText!: Phaser.GameObjects.Text;
  private costsText!: Phaser.GameObjects.Text;
  private profitText!: Phaser.GameObjects.Text;

  // HUD chrome containers used for reflow.
  private simLabel!: Phaser.GameObjects.Text;
  private rightPanelContainer!: Phaser.GameObjects.Container;
  private speedButtons: Button[] = [];

  constructor() {
    super({ key: "SimPlaybackScene" });
  }

  create(): void {
    const theme = getTheme();
    const L = getLayout();
    this.animationComplete = false;
    this.leaderCashTexts.clear();
    this.leaderProfitTexts.clear();
    this.speedButtons = [];

    // ── Step 1: Simulate the turn immediately (animation is cosmetic) ─────────
    const state = gameStore.getState();
    const rng = new SeededRNG(state.seed + state.turn);
    this.newState = simulateTurn(state, rng);
    this.turnResult = this.newState.history[this.newState.history.length - 1];

    const ANIM_DURATION = 5000;

    const { systems } = state.galaxy;

    // ── 3D galaxy view setup ──────────────────────────────────────────────────
    // The playback scene now reuses GalaxyView3D for its galaxy backdrop so
    // the simulation feels visually consistent with the persistent galaxy
    // map. Phaser's main camera renders the HUD chrome (leaderboard, ticker,
    // milestones, popups); ships and route lines come through the 3D layer.
    const vpX = L.navSidebarWidth;
    const vpY = L.contentTop;
    const vpW = L.gameWidth - L.navSidebarWidth;
    const vpH = L.gameHeight - L.contentTop - L.hudBottomBarHeight;
    this.vizRect = { x: vpX, y: vpY, w: vpW, h: vpH };

    const phaserCanvas = this.game.canvas;
    this.view3D = new GalaxyView3D({
      phaserCanvas,
      designWidth: L.gameWidth,
      designHeight: L.gameHeight,
    });
    this.view3D.setViewport(this.vizRect);
    this.view3D.setGalaxy(
      systems,
      this.newState.hyperlanes ?? [],
      this.newState.borderPorts ?? [],
      this.newState.galaxy.empires,
    );

    // HUD coords use viewport-space directly — no extra Phaser camera needed.
    const sfW = vpW;
    const sfH = vpH;

    // Stars + hyperlanes + parallax are now drawn by GalaxyView3D — the
    // backdrop renders consistently with the persistent galaxy map.

    // ── Route revenue lookup ──────────────────────────────────────────────────
    const routeRevenueMap = new Map<string, number>();
    for (const rp of this.turnResult.routePerformance) {
      routeRevenueMap.set(rp.routeId, rp.revenue);
    }

    // ── Route traffic + animated ships (3D-projected) ──────────────────────
    // GalaxyView3D draws the actual route lines; this loop just builds the
    // animated ship sprites and registers their `t` state. Per-frame in
    // update(), we advance t along the route's 3D curve and project to
    // screen coords so the sprites glide along the lanes.
    const trafficVisuals = buildGalaxyRouteTrafficVisuals(this.newState);
    this.view3D.setRoutes(trafficVisuals);

    const allRoutes = [
      ...this.newState.activeRoutes,
      ...this.newState.aiCompanies.flatMap((c) => c.activeRoutes),
    ];

    const halfDur = ANIM_DURATION / 2;

    for (const visual of trafficVisuals) {
      const route = allRoutes.find(
        (activeRoute) => activeRoute.id === visual.routeId,
      );
      if (!route) continue;

      for (let unitIndex = 0; unitIndex < visual.visibleUnits; unitIndex++) {
        const ship =
          visual.assignedShips[unitIndex % visual.assignedShips.length];
        const shipTint = getShipColor(ship.class);
        const mapSprKey = getShipMapKey(ship.class);
        const mapAnimKey = getShipMapAnimKey(ship.class);
        const shipIconKey = getShipIconKey(ship.class);
        const unitAlpha = Math.max(0.72, 0.95 - unitIndex * 0.06);
        const delayMs = Math.floor(
          (unitIndex / visual.visibleUnits) * halfDur * 0.5,
        );

        let mainSprite:
          | Phaser.GameObjects.Sprite
          | Phaser.GameObjects.Image
          | Phaser.GameObjects.Arc;
        if (mapSprKey && mapAnimKey && this.textures.exists(mapSprKey)) {
          const sp = this.add
            .sprite(0, 0, mapSprKey, "1")
            .setDisplaySize(32, 32)
            .setTint(shipTint)
            .setAlpha(unitAlpha)
            .setDepth(12 + unitIndex * 0.01);
          sp.play(mapAnimKey);
          mainSprite = sp;
        } else if (shipIconKey && this.textures.exists(shipIconKey)) {
          mainSprite = this.add
            .image(0, 0, shipIconKey)
            .setDisplaySize(22, 22)
            .setTint(shipTint)
            .setAlpha(unitAlpha)
            .setDepth(12 + unitIndex * 0.01);
        } else {
          mainSprite = this.add
            .circle(0, 0, 5, shipTint, unitAlpha)
            .setDepth(12 + unitIndex * 0.01);
        }
        const glow = this.add
          .circle(0, 0, 14, shipTint, Math.max(0.08, 0.18 - unitIndex * 0.02))
          .setDepth(11 + unitIndex * 0.01);

        // Route runs end-to-end in halfDur, then yoyos back. Speed in t/s.
        const speed = 1000 / halfDur;
        this.playbackShips.push({
          routeId: route.id,
          mainSprite,
          glow,
          t: 0,
          speed,
          dir: 1,
          delay: delayMs,
          elapsed: 0,
        });
      }

      // Revenue popup at midpoint (positioned per frame from projected
      // curve midpoint when it fires).
      const routeRevenue = routeRevenueMap.get(route.id) ?? 0;
      if (routeRevenue > 0) {
        this.time.delayedCall(halfDur, () => {
          if (this.animationComplete || !this.view3D) return;
          const curve = this.view3D.getRouteCurve(route.id);
          if (!curve) return;
          const mid = new THREE.Vector3();
          curve.getPointAt(0.5, mid);
          const proj = this.view3D.projectToScreenDesign({
            x: mid.x,
            y: mid.y,
            z: mid.z,
          });
          if (!proj.visible) return;
          new FloatingText(
            this,
            proj.x,
            proj.y,
            "+" + formatCash(routeRevenue),
            theme.colors.profit,
            { size: "large", riseDistance: 60 },
          );
          getAudioDirector().sfx("route_complete");
        });
      }
    }

    // ── Camera input → drives 3D camera ─────────────────────────────────────
    this.input.on(
      "wheel",
      (
        _ptr: Phaser.Input.Pointer,
        _over: Phaser.GameObjects.GameObject[],
        _dx: number,
        dy: number,
      ) => {
        if (!this.view3D) return;
        this.view3D.zoom(dy * 0.06);
      },
    );
    this.input.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      this.isDragging = false;
      this.dragStartX = ptr.x;
      this.dragStartY = ptr.y;
    });
    this.input.on("pointermove", (ptr: Phaser.Input.Pointer) => {
      if (!ptr.isDown || !this.view3D) return;
      const ddx = ptr.x - this.dragStartX;
      const ddy = ptr.y - this.dragStartY;
      if (!this.isDragging && Math.abs(ddx) + Math.abs(ddy) < DRAG_THRESHOLD)
        return;
      this.isDragging = true;
      this.view3D.pan(ptr.x - this.dragStartX, ptr.y - this.dragStartY);
      this.dragStartX = ptr.x;
      this.dragStartY = ptr.y;
    });
    this.input.on("pointerup", () => {
      this.isDragging = false;
    });

    // ── Build leaderboard data ─────────────────────────────────────────────────
    const leaderboard: LeaderEntry[] = [];
    leaderboard.push({
      id: "player",
      name: state.companyName,
      isPlayer: true,
      startCash: state.cash,
      endCash: this.newState.cash,
      profit: this.turnResult.netProfit,
      routeCount: state.activeRoutes.length,
      bankrupt: false,
    });
    for (const ai of this.turnResult.aiSummaries) {
      const aiComp = state.aiCompanies.find((c) => c.id === ai.companyId);
      leaderboard.push({
        id: ai.companyId,
        name: ai.companyName,
        isPlayer: false,
        startCash: aiComp?.cash ?? ai.cashAtEnd,
        endCash: ai.cashAtEnd,
        profit: ai.netProfit,
        routeCount: ai.routeCount,
        bankrupt: ai.bankrupt,
      });
    }
    leaderboard.sort((a, b) => b.endCash - a.endCash);

    // ── HUD text helper (scrollFactor 0) ──────────────────────────────────────
    const hudText = (
      x: number,
      y: number,
      txt: string,
      col: number,
      fs = 11,
      stroke = 2,
    ) =>
      this.add
        .text(x, y, txt, {
          fontSize: `${fs}px`,
          fontFamily: theme.fonts.body.family,
          color: colorToString(col),
          stroke: "#000000",
          strokeThickness: stroke,
        })
        .setScrollFactor(0)
        .setDepth(50);

    // ── Top-centre: sim turn indicator ─────────────────────────────────────────
    const quarter = ((state.turn - 1) % 4) + 1;
    const year = Math.floor((state.turn - 1) / 4) + 1;
    this.simLabel = hudText(
      sfW / 2,
      8,
      `\u27eb SIMULATING Q${quarter} Y${year} \u27ea`,
      theme.colors.accent,
      13,
      3,
    ).setOrigin(0.5, 0);
    this.tweens.add({
      targets: this.simLabel,
      alpha: { from: 0.9, to: 0.35 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // ── Left panel: Competition Standings ─────────────────────────────────────
    const LP = 10;
    const LPW = 190;
    const maxRows = Math.min(leaderboard.length, 7);
    const ROW_H = 46;
    const LBPT = 30;
    const lPanelH = 28 + maxRows * ROW_H;
    this.add
      .rectangle(LP, LBPT, LPW, lPanelH, 0x050c1a, 0.84)
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.55)
      .setScrollFactor(0)
      .setDepth(49);
    hudText(LP + 8, LBPT + 6, "STANDINGS", theme.colors.accent, 10, 2);
    this.add
      .rectangle(LP + 4, LBPT + 20, LPW - 8, 1, theme.colors.accent, 0.28)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(50);
    for (let i = 0; i < maxRows; i++) {
      const e = leaderboard[i];
      const ry = LBPT + 26 + i * ROW_H;
      if (e.isPlayer) {
        this.add
          .rectangle(
            LP + 2,
            ry - 1,
            LPW - 4,
            ROW_H - 2,
            theme.colors.accent,
            0.07,
          )
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(49);
      }
      const medalColor =
        i === 0
          ? 0xffd700
          : i === 1
            ? 0xc0c0c0
            : i === 2
              ? 0xcd7f32
              : theme.colors.textDim;
      this.add
        .circle(LP + 9, ry + 8, 4, medalColor, i <= 2 ? 0.9 : 0.45)
        .setScrollFactor(0)
        .setDepth(51);
      const truncName =
        e.name.length > 15 ? e.name.substring(0, 13) + "\u2026" : e.name;
      hudText(
        LP + 18,
        ry + 1,
        `${i + 1}. ${truncName}${e.bankrupt ? " \u2620" : ""}`,
        e.isPlayer ? theme.colors.accent : theme.colors.text,
        11,
        2,
      );
      const cashT = hudText(
        LP + 18,
        ry + 16,
        formatCash(e.startCash),
        theme.colors.text,
        12,
        2,
      );
      this.leaderCashTexts.set(e.id, cashT);
      const profitCol = e.profit >= 0 ? theme.colors.profit : theme.colors.loss;
      const profitT = hudText(
        LP + 18,
        ry + 31,
        (e.profit >= 0 ? "+" : "") + formatCash(0),
        profitCol,
        10,
        1,
      );
      this.leaderProfitTexts.set(e.id, profitT);
      hudText(
        LP + LPW - 6,
        ry + 16,
        `${e.routeCount}\u25b8`,
        theme.colors.textDim,
        10,
        1,
      ).setOrigin(1, 0);
    }

    // ── Right panel: Financial Report ─────────────────────────────────────────
    // Built inside a container so resize() only needs to reposition the
    // container's anchor. Children use coords relative to the container origin.
    const RP = 10;
    const RPW = 210;
    const RBPT = 30;
    const rightPanelX = sfW - RPW - RP;
    this.rightPanelContainer = this.add
      .container(rightPanelX, 0)
      .setScrollFactor(0)
      .setDepth(49);

    const rightBg = this.add
      .rectangle(0, RBPT, RPW, 218, 0x050c1a, 0.84)
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.55);
    this.rightPanelContainer.add(rightBg);

    const rightHudText = (
      x: number,
      y: number,
      txt: string,
      col: number,
      fs = 11,
      stroke = 2,
    ) => {
      const t = this.add.text(x, y, txt, {
        fontSize: `${fs}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(col),
        stroke: "#000000",
        strokeThickness: stroke,
      });
      this.rightPanelContainer.add(t);
      return t;
    };

    rightHudText(8, RBPT + 6, "FINANCIAL REPORT", theme.colors.accent, 10, 2);
    const rightSep1 = this.add
      .rectangle(4, RBPT + 20, RPW - 8, 1, theme.colors.accent, 0.28)
      .setOrigin(0, 0);
    this.rightPanelContainer.add(rightSep1);

    let ty = RBPT + 26;
    rightHudText(8, ty, "REVENUE", theme.colors.textDim, 9, 1);
    ty += 13;
    this.revenueText = rightHudText(
      8,
      ty,
      formatCash(0),
      theme.colors.profit,
      15,
      2,
    );
    ty += 22;
    rightHudText(8, ty, "OPERATING COSTS", theme.colors.textDim, 9, 1);
    ty += 13;
    this.costsText = rightHudText(
      8,
      ty,
      formatCash(0),
      theme.colors.loss,
      15,
      2,
    );
    ty += 22;
    const rightSep2 = this.add
      .rectangle(4, ty, RPW - 8, 1, theme.colors.panelBorder, 0.4)
      .setOrigin(0, 0);
    this.rightPanelContainer.add(rightSep2);
    ty += 8;
    rightHudText(8, ty, "NET PROFIT", theme.colors.textDim, 9, 1);
    ty += 13;
    this.profitText = rightHudText(
      8,
      ty,
      formatCash(0),
      theme.colors.text,
      17,
      2,
    );
    ty += 25;
    const rightSep3 = this.add
      .rectangle(4, ty, RPW - 8, 1, theme.colors.panelBorder, 0.35)
      .setOrigin(0, 0);
    this.rightPanelContainer.add(rightSep3);
    ty += 8;
    rightHudText(
      8,
      ty,
      `\u25b6 ${state.activeRoutes.length} active routes`,
      theme.colors.textDim,
      10,
      1,
    );
    ty += 14;
    rightHudText(
      8,
      ty,
      `\u25b6 ${state.fleet.length} ships in fleet`,
      theme.colors.textDim,
      10,
      1,
    );
    ty += 14;
    rightHudText(
      8,
      ty + 4,
      "Scroll to zoom \u00b7 Drag to pan",
      theme.colors.textDim,
      9,
      0,
    ).setAlpha(0.45);

    // ── Revenue ticker tween ──────────────────────────────────────────────────
    const totalRevenue = this.turnResult.revenue;
    const totalCosts =
      this.turnResult.fuelCosts +
      this.turnResult.maintenanceCosts +
      this.turnResult.loanPayments +
      this.turnResult.otherCosts;
    const tickProgress = { t: 0 };
    this.tweens.add({
      targets: tickProgress,
      t: 1,
      duration: ANIM_DURATION,
      onUpdate: () => {
        const p = tickProgress.t;
        const rev = Math.round(totalRevenue * p);
        const cost = Math.round(totalCosts * p);
        const net = rev - cost;
        this.revenueText.setText(formatCash(rev));
        this.costsText.setText(formatCash(cost));
        this.profitText.setText(formatCash(net));
        this.profitText.setColor(
          colorToString(net >= 0 ? theme.colors.profit : theme.colors.loss),
        );
        for (const e of leaderboard) {
          const animCash = Math.round(
            e.startCash + (e.endCash - e.startCash) * p,
          );
          const animProfit = Math.round(e.profit * p);
          this.leaderCashTexts.get(e.id)?.setText(formatCash(animCash));
          const pt = this.leaderProfitTexts.get(e.id);
          if (pt) {
            pt.setText((e.profit >= 0 ? "+" : "") + formatCash(animProfit));
            pt.setColor(
              colorToString(
                e.profit >= 0 ? theme.colors.profit : theme.colors.loss,
              ),
            );
          }
        }
      },
      onComplete: () => {
        this.finishAnimation();
      },
    });

    // ── Event popups ──────────────────────────────────────────────────────────
    const eventNames = this.turnResult.eventsOccurred;
    const activeEvents = this.newState.activeEvents;
    if (eventNames.length > 0) {
      const interval = ANIM_DURATION / (eventNames.length + 1);
      eventNames.forEach((eventName, index) => {
        this.time.delayedCall(interval * (index + 1), () => {
          if (this.animationComplete) return;
          const detail = activeEvents.find((e) => e.name === eventName);
          this.showEventPopup(
            eventName,
            detail?.description ?? "",
            index,
            detail?.category,
          );
        });
      });
    }

    // ── Speed controls bar ────────────────────────────────────────────────────
    const BTN_W = 80;
    const BTN_H = 32;
    const BTN_GAP = 10;
    const totalBW = BTN_W * 4 + BTN_GAP * 3;
    const btnStartX = sfW / 2 - totalBW / 2;
    const btnBaseY = sfH - BTN_H - 18;
    const speedDefs = [
      { label: "1\u00d7", speed: 1 },
      { label: "2\u00d7", speed: 2 },
      { label: "4\u00d7", speed: 4 },
      { label: "Skip", speed: 0 },
    ];
    for (let i = 0; i < speedDefs.length; i++) {
      const def = speedDefs[i];
      const btn = new Button(this, {
        x: btnStartX + i * (BTN_W + BTN_GAP),
        y: btnBaseY,
        width: BTN_W,
        height: BTN_H,
        label: def.label,
        onClick: () =>
          def.speed === 0 ? this.skipAnimation() : this.setSpeed(def.speed),
      });
      btn.setScrollFactor(0);
      this.speedButtons.push(btn);
    }

    // No dual-camera filter needed — the HUD chrome and ships all render on
    // the single Phaser camera; the 3D galaxy renders on its own canvas.

    // Wire teardown via the SHUTDOWN event. Phaser's Systems.shutdown only
    // emits this event — it does NOT auto-invoke a `shutdown()` method on
    // user Scene classes. Without this listener the 3D galaxy canvas would
    // leak into the DOM every turn, stacking up behind GalaxyMapScene.
    const cleanup = (): void => this.cleanup();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    this.relayout();
    attachReflowHandler(this, () => this.relayout());
  }

  private relayout(): void {
    const L = getLayout();

    // 3D galaxy viewport — recompute viewport rect.
    // TODO(3d-resize): GalaxyView3D's renderer canvas is sized to the design
    // dimensions captured at construction; only the viewport rect updates here.
    const vpX = L.navSidebarWidth;
    const vpY = L.contentTop;
    const vpW = L.gameWidth - L.navSidebarWidth;
    const vpH = L.gameHeight - L.contentTop - L.hudBottomBarHeight;
    this.vizRect = { x: vpX, y: vpY, w: vpW, h: vpH };
    this.view3D?.setViewport(this.vizRect);

    const sfW = vpW;
    const sfH = vpH;

    // Top-centre sim label.
    this.simLabel.setPosition(sfW / 2, 8);

    // Right panel (financial report) — slides with sfW.
    const RP = 10;
    const RPW = 210;
    this.rightPanelContainer.setPosition(sfW - RPW - RP, 0);

    // Speed control bar — bottom-centred.
    const BTN_W = 80;
    const BTN_H = 32;
    const BTN_GAP = 10;
    const totalBW = BTN_W * 4 + BTN_GAP * 3;
    const btnStartX = sfW / 2 - totalBW / 2;
    const btnBaseY = sfH - BTN_H - 18;
    for (let i = 0; i < this.speedButtons.length; i++) {
      this.speedButtons[i].setPosition(
        btnStartX + i * (BTN_W + BTN_GAP),
        btnBaseY,
      );
    }
  }

  // ── Speed control ─────────────────────────────────────────────────────────
  private setSpeed(multiplier: number): void {
    this.tweens.timeScale = multiplier;
    this.time.timeScale = multiplier;
  }

  // ── Event popup slide-in ──────────────────────────────────────────────────
  private showEventPopup(
    name: string,
    description: string,
    index: number,
    category?: string,
  ): void {
    const theme = getTheme();
    const cam = this.cameras.main;
    const sfW = cam.width;
    const popupH = 72;
    const popupW = 300;
    const containerY = 60 + index * (popupH + 8);
    const container = this.add
      .container(sfW + popupW, containerY)
      .setScrollFactor(0)
      .setDepth(60);
    container.cameraFilter = cam.id;
    const isHazard = category === EventCategory.Hazard;
    const isOpportunity = category === EventCategory.Opportunity;
    const borderColor = isHazard
      ? theme.colors.loss
      : isOpportunity
        ? theme.colors.profit
        : theme.colors.warning;
    const nameColor = isHazard ? theme.colors.loss : theme.colors.accent;
    const audio = getAudioDirector();
    if (isHazard) {
      audio.sfx("event_hazard");
    } else if (isOpportunity) {
      audio.sfx("event_opportunity");
    } else {
      audio.sfx("ui_click_secondary");
    }
    const bg = this.add
      .rectangle(0, 0, popupW, popupH, theme.colors.panelBg, 0.92)
      .setOrigin(0, 0);
    const border = this.add
      .rectangle(0, 0, 4, popupH, borderColor)
      .setOrigin(0, 0);
    const truncName =
      name.length > 30 ? name.substring(0, 27) + "\u2026" : name;
    const nameText = this.add.text(12, 6, truncName, {
      fontSize: `${theme.fonts.body.size}px`,
      fontFamily: theme.fonts.body.family,
      color: colorToString(nameColor),
    });
    const shortDesc =
      description.length > 38
        ? description.substring(0, 35) + "\u2026"
        : description;
    const descText = this.add.text(12, 28, shortDesc, {
      fontSize: `${theme.fonts.caption.size}px`,
      fontFamily: theme.fonts.caption.family,
      color: colorToString(theme.colors.textDim),
      wordWrap: { width: 276 },
    });
    container.add([bg, border, nameText, descText]);
    // Slide in from right
    this.tweens.add({
      targets: container,
      x: sfW - popupW - 10,
      duration: 400,
      ease: "Back.easeOut",
    });
    // Auto-dismiss after 3.5 s
    this.time.delayedCall(3500, () => {
      this.tweens.add({
        targets: container,
        x: sfW + popupW,
        alpha: 0,
        duration: 350,
        ease: "Sine.easeIn",
        onComplete: () => container.destroy(),
      });
    });
  }

  override update(_time: number, delta: number): void {
    if (!this.view3D) return;
    const dt = delta / 1000;
    const tmp = this.tmpCurvePoint;
    const tmpLook = this.tmpCurveLook;
    for (const ps of this.playbackShips) {
      ps.elapsed += delta;
      if (ps.elapsed < ps.delay) continue;
      const curve = this.view3D.getRouteCurve(ps.routeId);
      if (!curve) {
        ps.mainSprite.setVisible(false);
        ps.glow.setVisible(false);
        continue;
      }
      ps.t += ps.speed * ps.dir * dt;
      if (ps.t >= 1) {
        ps.t = 1;
        ps.dir = -1;
      } else if (ps.t <= 0) {
        ps.t = 0;
        ps.dir = 1;
      }
      curve.getPointAt(ps.t, tmp);
      const lookT = Math.min(1, Math.max(0, ps.t + 0.02 * ps.dir));
      curve.getPointAt(lookT, tmpLook);
      const proj = this.view3D.projectToScreenDesign({
        x: tmp.x,
        y: tmp.y,
        z: tmp.z,
      });
      const projNext = this.view3D.projectToScreenDesign({
        x: tmpLook.x,
        y: tmpLook.y,
        z: tmpLook.z,
      });
      ps.mainSprite.setVisible(proj.visible);
      ps.glow.setVisible(proj.visible);
      if (!proj.visible) continue;
      ps.mainSprite.setPosition(proj.x, proj.y);
      ps.glow.setPosition(proj.x, proj.y);
      const rot = Math.atan2(projNext.y - proj.y, projNext.x - proj.x);
      const rotatable = ps.mainSprite as Phaser.GameObjects.GameObject & {
        setRotation?: (r: number) => unknown;
      };
      rotatable.setRotation?.(rot);
    }
  }

  /**
   * Tear down the playback scene's owned resources. Registered via
   * `events.once("shutdown", ...)` in create() because Phaser does NOT call
   * a user-defined `shutdown()` method on the Scene class — Systems.shutdown
   * only emits the SHUTDOWN event. A regular method here would be dead code,
   * leaking the 3D galaxy canvas every turn (visible as two galaxies stacked
   * once the player returns to GalaxyMapScene).
   */
  private cleanup(): void {
    for (const ps of this.playbackShips) {
      ps.mainSprite.destroy();
      ps.glow.destroy();
    }
    this.playbackShips = [];
    this.view3D?.destroy();
    this.view3D = null;
  }

  // ── Skip animation ────────────────────────────────────────────────────────
  private skipAnimation(): void {
    if (this.animationComplete) return;
    this.tweens.killAll();
    this.time.removeAllEvents();
    const totalRevenue = this.turnResult.revenue;
    const totalCosts =
      this.turnResult.fuelCosts +
      this.turnResult.maintenanceCosts +
      this.turnResult.loanPayments +
      this.turnResult.otherCosts;
    const netProfit = this.turnResult.netProfit;
    this.revenueText.setText(formatCash(totalRevenue));
    this.costsText.setText(formatCash(totalCosts));
    this.profitText.setText(formatCash(netProfit));
    const theme = getTheme();
    this.profitText.setColor(
      colorToString(netProfit >= 0 ? theme.colors.profit : theme.colors.loss),
    );
    this.finishAnimation();
  }

  // ── Finish animation ──────────────────────────────────────────────────────
  private finishAnimation(): void {
    if (this.animationComplete) return;
    this.animationComplete = true;
    // Commit the simulated state to the store
    gameStore.setState(this.newState);
    const theme = getTheme();
    const net = this.turnResult.netProfit;
    const audio = getAudioDirector();
    if (net >= 0) {
      flashScreen(this, theme.colors.profit, 0.18, 600);
      audio.sfxProfitFanfare();
    } else {
      flashScreen(this, theme.colors.loss, 0.22, 500);
      audio.sfxLossSting();
    }
    audio.sfx("sim_complete");
    const isLargeProfit = net > 0 && net >= 5000;
    if (isLargeProfit) {
      const L2 = getLayout();
      const cam2 = this.cameras.main;
      cam2.setViewport(0, 0, L2.gameWidth, L2.gameHeight);
      cam2.setZoom(1);
      cam2.centerOn(L2.gameWidth / 2, L2.gameHeight / 2);
      const sign = net >= 0 ? "+" : "";
      const turn = this.newState.turn;
      const q = ((turn - 1) % 4) + 1;
      const y = Math.ceil(turn / 4);
      MilestoneOverlay.show(
        this,
        "sim_complete",
        `END OF QUARTER Q${q} Y${y}`,
        sign +
          "\u00A7" +
          Math.abs(Math.round(net)).toLocaleString("en-US") +
          " Net",
      );
    }
    this.time.timeScale = 1;
    this.time.delayedCall(isLargeProfit ? 2200 : 500, () => {
      const hud = this.scene.get("GameHUDScene") as GameHUDScene;
      hud.switchContentScene("TurnReportScene");
    });
  }
}

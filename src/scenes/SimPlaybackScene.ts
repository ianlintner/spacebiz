import Phaser from "phaser";
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
  addPulseTween,
  addTwinkleTween,
  registerAmbientCleanup,
  getShipIconKey,
  getShipColor,
} from "../ui/index.ts";
import type { GameHUDScene } from "./GameHUDScene.ts";
import type { GameState, TurnResult } from "../data/types.ts";
import { EventCategory } from "../data/types.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";

// ── Camera constants ──────────────────────────────────────────────────────────
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.08;
const DRAG_THRESHOLD = 5;

function formatCash(amount: number): string {
  return "\u00A7" + amount.toLocaleString();
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

  // Camera drag state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private camStartX = 0;
  private camStartY = 0;

  // Live leaderboard text references (updated each tween frame)
  private leaderCashTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private leaderProfitTexts: Map<string, Phaser.GameObjects.Text> = new Map();

  // Revenue ticker text references
  private revenueText!: Phaser.GameObjects.Text;
  private costsText!: Phaser.GameObjects.Text;
  private profitText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "SimPlaybackScene" });
  }

  create(): void {
    const theme = getTheme();
    const L = getLayout();
    this.animationComplete = false;
    this.leaderCashTexts.clear();
    this.leaderProfitTexts.clear();

    // ── Step 1: Simulate the turn immediately (animation is cosmetic) ─────────
    const state = gameStore.getState();
    const rng = new SeededRNG(state.seed + state.turn);
    this.newState = simulateTurn(state, rng);
    this.turnResult = this.newState.history[this.newState.history.length - 1];

    const ANIM_DURATION = 5000;

    // ── Galaxy geometry ───────────────────────────────────────────────────────
    const { systems, planets } = state.galaxy;

    let gMinX = Infinity, gMaxX = -Infinity, gMinY = Infinity, gMaxY = -Infinity;
    for (const sys of systems) {
      if (sys.x < gMinX) gMinX = sys.x;
      if (sys.x > gMaxX) gMaxX = sys.x;
      if (sys.y < gMinY) gMinY = sys.y;
      if (sys.y > gMaxY) gMaxY = sys.y;
    }
    const galCx = (gMinX + gMaxX) / 2;
    const galCy = (gMinY + gMaxY) / 2;
    const galW = gMaxX - gMinX;
    const galH = gMaxY - gMinY;

    // Build planet→system & system lookup maps
    const planetSystemMap = new Map<string, string>();
    for (const planet of planets) {
      planetSystemMap.set(planet.id, planet.systemId);
    }
    const systemLookup = new Map<string, { x: number; y: number; color: number }>();
    for (const sys of systems) {
      systemLookup.set(sys.id, { x: sys.x, y: sys.y, color: sys.starColor });
    }

    // Compute bounding box of player's active route endpoints for initial focus
    const routeSystemIds = new Set<string>();
    let rMinX = Infinity, rMaxX = -Infinity, rMinY = Infinity, rMaxY = -Infinity;
    for (const route of state.activeRoutes) {
      for (const pid of [route.originPlanetId, route.destinationPlanetId]) {
        const sysId = planetSystemMap.get(pid);
        if (!sysId) continue;
        routeSystemIds.add(sysId);
        const sys = systemLookup.get(sysId);
        if (!sys) continue;
        if (sys.x < rMinX) rMinX = sys.x;
        if (sys.x > rMaxX) rMaxX = sys.x;
        if (sys.y < rMinY) rMinY = sys.y;
        if (sys.y > rMaxY) rMaxY = sys.y;
      }
    }
    const focusCx = isFinite(rMinX) ? (rMinX + rMaxX) / 2 : galCx;
    const focusCy = isFinite(rMinY) ? (rMinY + rMaxY) / 2 : galCy;
    const routeSpanW = isFinite(rMinX) ? Math.max(rMaxX - rMinX + 400, 300) : 500;
    const routeSpanH = isFinite(rMinY) ? Math.max(rMaxY - rMinY + 300, 200) : 400;

    // ── Camera setup ──────────────────────────────────────────────────────────
    const cam = this.cameras.main;
    const vpX = L.navSidebarWidth;
    const vpY = L.contentTop;
    const vpW = L.gameWidth - L.navSidebarWidth;
    const vpH = L.gameHeight - L.contentTop - L.hudBottomBarHeight;
    cam.setViewport(vpX, vpY, vpW, vpH);

    // Start zoomed in on route cluster (minimum 1.0×, max 2.0×)
    const fitZoomX = vpW / routeSpanW;
    const fitZoomY = vpH / routeSpanH;
    const startZoom = Math.max(Math.min(fitZoomX, fitZoomY, 2.0), 1.0);
    cam.setZoom(startZoom);
    cam.centerOn(focusCx, focusCy);

    // Virtual coordinate space for scrollFactor(0) HUD elements
    const sfW = vpW / startZoom;
    const sfH = vpH / startZoom;

    // ── Parallax starfield (3 depth layers) ───────────────────────────────────
    const spreadW = galW + 2400;
    const spreadH = galH + 1600;
    const starTweens: Phaser.Tweens.Tween[] = [];
    type ParallaxLayer = {
      count: number; scrollFactor: number;
      minAlpha: number; maxAlpha: number;
      minScale: number; maxScale: number;
      depth: number; tints: number[];
    };
    const PARALLAX_LAYERS: ParallaxLayer[] = [
      { count: 90, scrollFactor: 0.05, minAlpha: 0.06, maxAlpha: 0.22, minScale: 0.14, maxScale: 0.32, depth: -300, tints: [0xffffff, 0xaaccff] },
      { count: 60, scrollFactor: 0.15, minAlpha: 0.1, maxAlpha: 0.4, minScale: 0.22, maxScale: 0.55, depth: -200, tints: [0xffffff, 0xaaccff, 0xffffcc] },
      { count: 35, scrollFactor: 0.3, minAlpha: 0.15, maxAlpha: 0.55, minScale: 0.32, maxScale: 0.75, depth: -100, tints: [0xffffff, 0xaaccff] },
    ];
    for (const layer of PARALLAX_LAYERS) {
      for (let i = 0; i < layer.count; i++) {
        const sx = galCx + (Math.random() - 0.5) * spreadW;
        const sy = galCy + (Math.random() - 0.5) * spreadH;
        const alpha = layer.minAlpha + Math.random() * (layer.maxAlpha - layer.minAlpha);
        const scale = layer.minScale + Math.random() * (layer.maxScale - layer.minScale);
        const tint = layer.tints[Math.floor(Math.random() * layer.tints.length)];
        const dot = this.add.image(sx, sy, "glow-dot")
          .setAlpha(alpha).setScale(scale).setTint(tint)
          .setDepth(layer.depth).setScrollFactor(layer.scrollFactor);
        if (Math.random() > 0.65) {
          const tw = addTwinkleTween(this, dot, {
            minAlpha: Math.max(0.02, alpha * 0.3), maxAlpha: Math.min(0.9, alpha * 1.8),
            minDuration: 1800, maxDuration: 6000, delay: Math.random() * 5000,
          });
          starTweens.push(tw);
        }
      }
    }
    if (starTweens.length > 0) registerAmbientCleanup(this, starTweens);

    // Build planet -> system lookup
    const planetSystemMap = new Map<string, string>();
    for (const planet of planets) {
      planetSystemMap.set(planet.id, planet.systemId);
    }
    const systemLookup = new Map<
      string,
      { x: number; y: number; color: number }
    >();
    for (const sys of systems) {
      systemLookup.set(sys.id, { x: sys.x, y: sys.y, color: sys.starColor });
    }

    // Draw systems with glow halos
    for (const sys of systems) {
      // Glow halo behind the star dot
      this.add.circle(sys.x, sys.y, 8, sys.starColor, 0.15);
      // Star dot
      this.add.circle(sys.x, sys.y, 4, sys.starColor, 0.6);
      this.add
        .text(sys.x, sys.y + 8, sys.name, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0);
    }

    // Draw route lines and animate ships with glow trails
    const routeGraphics = this.add.graphics();
    routeGraphics.lineStyle(1, theme.colors.accent, 0.3);

    // Build a lookup from routeId → revenue from this turn's route performance
    const routeRevenueMap = new Map<string, number>();
    for (const rp of this.turnResult.routePerformance) {
      routeRevenueMap.set(rp.routeId, rp.revenue);
    }

    for (const route of state.activeRoutes) {
      const originSysId = planetSystemMap.get(route.originPlanetId);
      const destSysId = planetSystemMap.get(route.destinationPlanetId);
      if (!originSysId || !destSysId) continue;
      const originSys = systemLookup.get(originSysId);
      const destSys = systemLookup.get(destSysId);
      if (!originSys || !destSys) continue;

      // Route line
      routeGraphics.beginPath();
      routeGraphics.moveTo(originSys.x, originSys.y);
      routeGraphics.lineTo(destSys.x, destSys.y);
      routeGraphics.strokePath();

      // Trailing glow dots (behind the ship)
      const trail1 = this.add.circle(
        originSys.x,
        originSys.y,
        2,
        theme.colors.accent,
        0.5,
      );
      const trail2 = this.add.circle(
        originSys.x,
        originSys.y,
        1.5,
        theme.colors.accent,
        0.3,
      );
      const trail3 = this.add.circle(
        originSys.x,
        originSys.y,
        1,
        theme.colors.accent,
        0.1,
      );

      // Animated ship dot traveling the route
      const shipDot = this.add.circle(
        originSys.x,
        originSys.y,
        3,
        theme.colors.accent,
      );

      const halfDuration = ANIM_DURATION / 2;

      this.tweens.add({
        targets: shipDot,
        x: destSys.x,
        y: destSys.y,
        duration: halfDuration,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      // Trail dots follow with small delays for trailing effect
      this.tweens.add({
        targets: trail1,
        x: destSys.x,
        y: destSys.y,
        duration: halfDuration,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: 60,
      });

      this.tweens.add({
        targets: trail2,
        x: destSys.x,
        y: destSys.y,
        duration: halfDuration,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: 120,
      });

      this.tweens.add({
        targets: trail3,
        x: destSys.x,
        y: destSys.y,
        duration: halfDuration,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        delay: 180,
      });

      // Mid-point revenue popup — fires when the ship reaches its destination
      const routeRevenue = routeRevenueMap.get(route.id) ?? 0;
      if (routeRevenue > 0) {
        const midX = (originSys.x + destSys.x) / 2;
        const midY = (originSys.y + destSys.y) / 2;
        this.time.delayedCall(halfDuration, () => {
          if (this.animationComplete) return;
          new FloatingText(
            this,
            midX,
            midY,
            "+" + "\u00A7" + routeRevenue.toLocaleString(),
            theme.colors.profit,
            { size: "small", riseDistance: 44 },
          );
          getAudioDirector().sfx("route_complete");
        });
      }
    }

    // -----------------------------------------------------------------------
    // Step 3: Revenue / Cost ticker (top-right) — Panel component
    // -----------------------------------------------------------------------
    const tickerPanel = new Panel(this, {
      x: sfW - 230,
      y: 10,
      width: 220,
      height: 130,
      showGlow: false,
    });
    tickerPanel.setScrollFactor(0);
    const tc = tickerPanel.getContentArea();

    const tickerTitle = new Label(this, {
      x: tc.x,
      y: tc.y,
      text: "Turn Simulation",
      style: "caption",
      color: theme.colors.accent,
    });
    this.children.remove(tickerTitle);
    tickerPanel.add(tickerTitle);

    this.revenueLabel = new Label(this, {
      x: tc.x,
      y: tc.y + 22,
      text: "Revenue: " + formatCash(0),
      style: "body",
      color: theme.colors.profit,
    });
    this.children.remove(this.revenueLabel);
    tickerPanel.add(this.revenueLabel);

    this.costsLabel = new Label(this, {
      x: tc.x,
      y: tc.y + 44,
      text: "Costs: " + formatCash(0),
      style: "body",
      color: theme.colors.loss,
    });
    this.children.remove(this.costsLabel);
    tickerPanel.add(this.costsLabel);

    this.profitLabel = new Label(this, {
      x: tc.x,
      y: tc.y + 66,
      text: "Profit: " + formatCash(0),
      style: "value",
      color: theme.colors.text,
    });
    this.children.remove(this.profitLabel);
    tickerPanel.add(this.profitLabel);

    // Separator line between costs and profit
    const tickerSep = this.add
      .rectangle(tc.x, tc.y + 62, tc.width - 16, 1, theme.colors.panelBorder)
      .setOrigin(0, 0)
      .setAlpha(0.5);
    tickerPanel.add(tickerSep);

    // Drive the ticker with a tween on a dummy progress value
    const totalRevenue = this.turnResult.revenue;
    const totalCosts =
      this.turnResult.fuelCosts +
      this.turnResult.maintenanceCosts +
      this.turnResult.loanPayments +
      this.turnResult.otherCosts;

    const tickerDriver = { progress: 0 };
    this.tweens.add({
      targets: tickerDriver,
      progress: 1,
      duration: ANIM_DURATION,
      onUpdate: () => {
        const rev = Math.round(totalRevenue * tickerDriver.progress);
        const cost = Math.round(totalCosts * tickerDriver.progress);
        const profit = rev - cost;
        this.revenueLabel.setText("Revenue: " + formatCash(rev));
        this.costsLabel.setText("Costs: " + formatCash(cost));
        this.profitLabel.setText("Profit: " + formatCash(profit));
        this.profitLabel.setLabelColor(
          profit >= 0 ? theme.colors.profit : theme.colors.loss,
        );
      },
      onComplete: () => {
        this.finishAnimation();
      },
    });

    // -----------------------------------------------------------------------
    // Step 4: Event popups — timed reveals during the animation
    // -----------------------------------------------------------------------
    const eventNames = this.turnResult.eventsOccurred;
    const activeEvents = this.newState.activeEvents;

    if (eventNames.length > 0) {
      const interval = ANIM_DURATION / (eventNames.length + 1);
      eventNames.forEach((eventName, index) => {
        this.time.delayedCall(interval * (index + 1), () => {
          if (this.animationComplete) return;
          const detail = activeEvents.find((e) => e.name === eventName);
          const description = detail ? detail.description : "";
          this.showEventPopup(eventName, description, index, detail?.category);
        });
      });
    }

    // -----------------------------------------------------------------------
    // Step 5: Speed control buttons — centered horizontally
    // -----------------------------------------------------------------------
    const btnY = sfH - 50;
    const btnWidth = 80;
    const btnHeight = 32;
    const totalBtnWidth = btnWidth * 4 + 30;
    const startX = sfW / 2 - totalBtnWidth / 2;

    const btn1x = new Button(this, {
      x: startX,
      y: btnY,
      width: btnWidth,
      height: btnHeight,
      label: "1x",
      onClick: () => this.setSpeed(1),
    });
    btn1x.setScrollFactor(0);

    const btn2x = new Button(this, {
      x: startX + btnWidth + 10,
      y: btnY,
      width: btnWidth,
      height: btnHeight,
      label: "2x",
      onClick: () => this.setSpeed(2),
    });
    btn2x.setScrollFactor(0);

    const btn4x = new Button(this, {
      x: startX + (btnWidth + 10) * 2,
      y: btnY,
      width: btnWidth,
      height: btnHeight,
      label: "4x",
      onClick: () => this.setSpeed(4),
    });
    btn4x.setScrollFactor(0);

    const btnSkip = new Button(this, {
      x: startX + (btnWidth + 10) * 3,
      y: btnY,
      width: btnWidth,
      height: btnHeight,
      label: "Skip",
      onClick: () => this.skipAnimation(),
    });
    btnSkip.setScrollFactor(0);
  }

  // -------------------------------------------------------------------------
  // Speed controls
  // -------------------------------------------------------------------------

  private setSpeed(multiplier: number): void {
    this.tweens.timeScale = multiplier;
    this.time.timeScale = multiplier;
  }

  // -------------------------------------------------------------------------
  // Event popup slide-in — glass-styled panels
  // -------------------------------------------------------------------------

  private showEventPopup(
    name: string,
    description: string,
    index: number,
    category?: string,
  ): void {
    const theme = getTheme();
    const cam = this.cameras.main;
    const sfW = cam.width / cam.zoom;
    const popupY = 200 + index * 70;

    const isHazard = category === EventCategory.Hazard;
    const isOpportunity = category === EventCategory.Opportunity;
    const borderColor = isHazard
      ? theme.colors.loss
      : isOpportunity
        ? theme.colors.profit
        : theme.colors.warning;
    const nameColor = isHazard
      ? theme.colors.loss
      : isOpportunity
        ? theme.colors.accent
        : theme.colors.accent;

    // Play SFX keyed to category
    const audio = getAudioDirector();
    if (isHazard) {
      audio.sfx("event_hazard");
    } else if (isOpportunity) {
      audio.sfx("event_opportunity");
    } else {
      audio.sfx("ui_click_secondary");
    }

    const container = this.add.container(sfW + 310, popupY);
    container.setScrollFactor(0);

    // Glass-styled background rectangle using theme colors
    const bg = this.add
      .rectangle(0, 0, 300, 55, theme.colors.panelBg, 0.85)
      .setOrigin(0, 0);
    // Category-colored accent left border bar
    const border = this.add.rectangle(0, 0, 4, 55, borderColor).setOrigin(0, 0);

    const truncName = name.length > 30 ? name.substring(0, 27) + "..." : name;
    const nameText = this.add.text(12, 6, truncName, {
      fontSize: `${theme.fonts.body.size}px`,
      fontFamily: theme.fonts.body.family,
      color: colorToString(nameColor),
      wordWrap: { width: 276 },
    });

    const shortDesc =
      description.length > 38
        ? description.substring(0, 35) + "..."
        : description;
    const descText = this.add.text(12, 28, shortDesc, {
      fontSize: `${theme.fonts.caption.size}px`,
      fontFamily: theme.fonts.caption.family,
      color: colorToString(theme.colors.textDim),
      wordWrap: { width: 276 },
    });

    container.add([bg, border, nameText, descText]);

    // Slide in from the right edge
    this.tweens.add({
      targets: container,
      x: sfW - 320,
      duration: 400,
      ease: "Back.easeOut",
    });
  }

  // -------------------------------------------------------------------------
  // Skip / finish
  // -------------------------------------------------------------------------

  private skipAnimation(): void {
    if (this.animationComplete) return;

    this.tweens.killAll();
    this.time.removeAllEvents();

    // Set ticker to final values
    const theme = getTheme();
    const totalRevenue = this.turnResult.revenue;
    const totalCosts =
      this.turnResult.fuelCosts +
      this.turnResult.maintenanceCosts +
      this.turnResult.loanPayments +
      this.turnResult.otherCosts;
    const netProfit = this.turnResult.netProfit;

    this.revenueLabel.setText("Revenue: " + formatCash(totalRevenue));
    this.costsLabel.setText("Costs: " + formatCash(totalCosts));
    this.profitLabel.setText("Profit: " + formatCash(netProfit));
    this.profitLabel.setLabelColor(
      netProfit >= 0 ? theme.colors.profit : theme.colors.loss,
    );

    this.finishAnimation();
  }

  private finishAnimation(): void {
    if (this.animationComplete) return;
    this.animationComplete = true;

    // Commit the simulated state to the store
    gameStore.setState(this.newState);

    const theme = getTheme();
    const audio = getAudioDirector();
    const net = this.turnResult.netProfit;

    // Dopamine hit: screen flash + sfx keyed to outcome
    if (net >= 0) {
      flashScreen(this, theme.colors.profit, 0.28, 600);
      audio.sfxProfitFanfare();
    } else {
      flashScreen(this, theme.colors.loss, 0.22, 500);
      audio.sfxLossSting();
    }
    audio.sfx("sim_complete");

    // Show milestone overlay for notable outcomes
    const isLargeProfit = net > 0 && net >= 5000;
    if (isLargeProfit) {
      // Reset camera to full game area so overlay renders at correct size/position
      const L2 = getLayout();
      const cam = this.cameras.main;
      cam.setViewport(0, 0, L2.gameWidth, L2.gameHeight);
      cam.setZoom(1);
      cam.centerOn(L2.gameWidth / 2, L2.gameHeight / 2);

      const sign = net >= 0 ? "+" : "";
      MilestoneOverlay.show(
        this,
        "sim_complete",
        "SIM COMPLETE",
        sign + "\u00A7" + Math.abs(Math.round(net)).toLocaleString() + " Net",
      );
    }

    // Brief pause then transition to the turn report via HUD
    this.time.timeScale = 1;
    this.time.delayedCall(isLargeProfit ? 2200 : 500, () => {
      const hud = this.scene.get("GameHUDScene") as GameHUDScene;
      hud.switchContentScene("TurnReportScene");
    });
  }
}

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

    let gMinX = Infinity,
      gMaxX = -Infinity,
      gMinY = Infinity,
      gMaxY = -Infinity;
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
    const systemLookup = new Map<
      string,
      { x: number; y: number; color: number }
    >();
    for (const sys of systems) {
      systemLookup.set(sys.id, { x: sys.x, y: sys.y, color: sys.starColor });
    }

    // Compute bounding box of player's active route endpoints for initial focus
    const routeSystemIds = new Set<string>();
    let rMinX = Infinity,
      rMaxX = -Infinity,
      rMinY = Infinity,
      rMaxY = -Infinity;
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
    const routeSpanW = isFinite(rMinX)
      ? Math.max(rMaxX - rMinX + 400, 300)
      : 500;
    const routeSpanH = isFinite(rMinY)
      ? Math.max(rMaxY - rMinY + 300, 200)
      : 400;

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
      count: number;
      scrollFactor: number;
      minAlpha: number;
      maxAlpha: number;
      minScale: number;
      maxScale: number;
      depth: number;
      tints: number[];
    };
    const PARALLAX_LAYERS: ParallaxLayer[] = [
      {
        count: 90,
        scrollFactor: 0.05,
        minAlpha: 0.06,
        maxAlpha: 0.22,
        minScale: 0.14,
        maxScale: 0.32,
        depth: -300,
        tints: [0xffffff, 0xaaccff],
      },
      {
        count: 60,
        scrollFactor: 0.15,
        minAlpha: 0.1,
        maxAlpha: 0.4,
        minScale: 0.22,
        maxScale: 0.55,
        depth: -200,
        tints: [0xffffff, 0xaaccff, 0xffffcc],
      },
      {
        count: 35,
        scrollFactor: 0.3,
        minAlpha: 0.15,
        maxAlpha: 0.55,
        minScale: 0.32,
        maxScale: 0.75,
        depth: -100,
        tints: [0xffffff, 0xaaccff],
      },
    ];
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
        if (Math.random() > 0.65) {
          const tw = addTwinkleTween(this, dot, {
            minAlpha: Math.max(0.02, alpha * 0.3),
            maxAlpha: Math.min(0.9, alpha * 1.8),
            minDuration: 1800,
            maxDuration: 6000,
            delay: Math.random() * 5000,
          });
          starTweens.push(tw);
        }
      }
    }
    if (starTweens.length > 0) registerAmbientCleanup(this, starTweens);

    // ── Hyperlane network ─────────────────────────────────────────────────────
    const hyperlanes = state.hyperlanes ?? [];
    const hlGraphics = this.add.graphics().setDepth(-10);
    for (const hl of hyperlanes) {
      const sA = systemLookup.get(hl.systemA);
      const sB = systemLookup.get(hl.systemB);
      if (!sA || !sB) continue;
      hlGraphics.lineStyle(1, theme.colors.accent, 0.15);
      hlGraphics.beginPath();
      hlGraphics.moveTo(sA.x, sA.y);
      hlGraphics.lineTo(sB.x, sB.y);
      hlGraphics.strokePath();
    }

    // ── Planet count per system ───────────────────────────────────────────────
    const planetCountBySystem = new Map<string, number>();
    for (const p of planets) {
      planetCountBySystem.set(
        p.systemId,
        (planetCountBySystem.get(p.systemId) ?? 0) + 1,
      );
    }

    // ── Star systems (route-highlighted vs dim) ───────────────────────────────
    for (const sys of systems) {
      const isRoute = routeSystemIds.has(sys.id);
      const pCount = planetCountBySystem.get(sys.id) ?? 0;
      const baseR = Math.max(3, 3 + Math.min(3, pCount));
      const r = isRoute ? baseR + 2 : baseR;
      const outerHalo = this.add
        .circle(sys.x, sys.y, r * 4, sys.starColor)
        .setAlpha(isRoute ? 0.12 : 0.04)
        .setDepth(-5);
      if (isRoute) {
        addPulseTween(this, outerHalo, {
          minAlpha: 0.06,
          maxAlpha: 0.18,
          duration: 2500 + Math.random() * 2000,
          delay: Math.random() * 2000,
        });
      }
      this.add
        .circle(sys.x, sys.y, r * 1.8, sys.starColor)
        .setAlpha(isRoute ? 0.3 : 0.12)
        .setDepth(-4);
      this.add
        .circle(sys.x, sys.y, r, sys.starColor, isRoute ? 0.95 : 0.55)
        .setDepth(-3);
      this.add
        .text(sys.x, sys.y + r + 5, sys.name, {
          fontSize: `${isRoute ? theme.fonts.caption.size + 1 : theme.fonts.caption.size - 1}px`,
          fontFamily: theme.fonts.caption.family,
          color: isRoute
            ? colorToString(theme.colors.text)
            : colorToString(theme.colors.textDim),
          stroke: "#000000",
          strokeThickness: isRoute ? 3 : 1,
        })
        .setOrigin(0.5, 0)
        .setAlpha(isRoute ? 0.9 : 0.3)
        .setDepth(-3);
    }

    // ── Route revenue lookup ──────────────────────────────────────────────────
    const routeRevenueMap = new Map<string, number>();
    for (const rp of this.turnResult.routePerformance) {
      routeRevenueMap.set(rp.routeId, rp.revenue);
    }

    // ── Route lines + animated ships ─────────────────────────────────────────
    const routeGraphics = this.add.graphics().setDepth(0);
    for (const route of state.activeRoutes) {
      const oSysId = planetSystemMap.get(route.originPlanetId);
      const dSysId = planetSystemMap.get(route.destinationPlanetId);
      if (!oSysId || !dSysId) continue;
      const oSys = systemLookup.get(oSysId);
      const dSys = systemLookup.get(dSysId);
      if (!oSys || !dSys) continue;
      const ox = oSys.x;
      const oy = oSys.y;
      const dx = dSys.x;
      const dy = dSys.y;
      const angle = Math.atan2(dy - oy, dx - ox);
      const halfDur = ANIM_DURATION / 2;
      const routeRevenue = routeRevenueMap.get(route.id) ?? 0;
      const routeColor =
        routeRevenue >= 1000
          ? theme.colors.profit
          : routeRevenue > 0
            ? theme.colors.accent
            : theme.colors.textDim;
      // Glow underlayer
      routeGraphics.lineStyle(6, routeColor, 0.1);
      routeGraphics.beginPath();
      routeGraphics.moveTo(ox, oy);
      routeGraphics.lineTo(dx, dy);
      routeGraphics.strokePath();
      // Route line
      routeGraphics.lineStyle(2, routeColor, 0.75);
      routeGraphics.beginPath();
      routeGraphics.moveTo(ox, oy);
      routeGraphics.lineTo(dx, dy);
      routeGraphics.strokePath();
      // Endpoint halos
      this.add.circle(ox, oy, 9, routeColor, 0.18).setDepth(1);
      this.add.circle(dx, dy, 9, routeColor, 0.18).setDepth(1);
      // Ship sprite or fallback pip
      const firstShipId = route.assignedShipIds[0];
      const firstShip = firstShipId
        ? state.fleet.find((s) => s.id === firstShipId)
        : undefined;
      const shipIconKey = firstShip
        ? getShipIconKey(firstShip.class)
        : undefined;
      const shipTint = firstShip
        ? getShipColor(firstShip.class)
        : theme.colors.accent;
      const delay = Math.random() * halfDur * 0.5;
      if (shipIconKey && this.textures.exists(shipIconKey)) {
        const sp = this.add
          .image(ox, oy, shipIconKey)
          .setDisplaySize(22, 22)
          .setTint(shipTint)
          .setAlpha(0.95)
          .setRotation(angle)
          .setDepth(12);
        const sg = this.add.circle(ox, oy, 13, shipTint, 0.18).setDepth(11);
        this.tweens.add({
          targets: [sp, sg],
          x: dx,
          y: dy,
          duration: halfDur,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
          delay,
          onYoyo: () => {
            sp.setRotation(angle + Math.PI);
          },
          onRepeat: () => {
            sp.setRotation(angle);
          },
        });
        for (let t = 0; t < 3; t++) {
          const trail = this.add
            .circle(ox, oy, 3 - t, shipTint, 0.45 - t * 0.12)
            .setDepth(10);
          this.tweens.add({
            targets: trail,
            x: dx,
            y: dy,
            duration: halfDur,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
            delay: delay + 85 * (t + 1),
          });
        }
      } else {
        const pip = this.add.circle(ox, oy, 5, shipTint).setDepth(12);
        const glow = this.add.circle(ox, oy, 11, shipTint, 0.2).setDepth(11);
        this.tweens.add({
          targets: [pip, glow],
          x: dx,
          y: dy,
          duration: halfDur,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
          delay,
        });
        for (let t = 0; t < 2; t++) {
          const trail = this.add
            .circle(ox, oy, 3 - t, shipTint, 0.4 - t * 0.15)
            .setDepth(10);
          this.tweens.add({
            targets: trail,
            x: dx,
            y: dy,
            duration: halfDur,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
            delay: delay + 85 * (t + 1),
          });
        }
      }
      // Revenue popup at midpoint
      if (routeRevenue > 0) {
        const midX = (ox + dx) / 2;
        const midY = (oy + dy) / 2;
        this.time.delayedCall(halfDur + delay, () => {
          if (this.animationComplete) return;
          new FloatingText(
            this,
            midX,
            midY,
            "+" + formatCash(routeRevenue),
            theme.colors.profit,
            { size: "large", riseDistance: 60 },
          );
          getAudioDirector().sfx("route_complete");
        });
      }
    }

    // Pulse route lines alpha
    this.tweens.add({
      targets: routeGraphics,
      alpha: { from: 0.65, to: 1.0 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // ── Camera drag & zoom ────────────────────────────────────────────────────
    this.input.on(
      "wheel",
      (
        _ptr: Phaser.Input.Pointer,
        _over: Phaser.GameObjects.GameObject[],
        _dx: number,
        dy: number,
      ) => {
        cam.setZoom(
          Phaser.Math.Clamp(
            cam.zoom + (dy < 0 ? ZOOM_STEP : -ZOOM_STEP),
            MIN_ZOOM,
            MAX_ZOOM,
          ),
        );
      },
    );
    this.input.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      this.isDragging = false;
      this.dragStartX = ptr.x;
      this.dragStartY = ptr.y;
      this.camStartX = cam.scrollX;
      this.camStartY = cam.scrollY;
    });
    this.input.on("pointermove", (ptr: Phaser.Input.Pointer) => {
      if (!ptr.isDown) return;
      const ddx = ptr.x - this.dragStartX;
      const ddy = ptr.y - this.dragStartY;
      if (!this.isDragging && Math.abs(ddx) + Math.abs(ddy) < DRAG_THRESHOLD)
        return;
      this.isDragging = true;
      cam.scrollX = this.camStartX - ddx / cam.zoom;
      cam.scrollY = this.camStartY - ddy / cam.zoom;
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
    const simLabel = hudText(
      sfW / 2,
      8,
      `\u27eb SIMULATING Q${quarter} Y${year} \u27ea`,
      theme.colors.accent,
      13,
      3,
    ).setOrigin(0.5, 0);
    this.tweens.add({
      targets: simLabel,
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
    const RP = 10;
    const RPW = 210;
    const RPX = sfW - RPW - RP;
    const RBPT = 30;
    this.add
      .rectangle(RPX, RBPT, RPW, 218, 0x050c1a, 0.84)
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.55)
      .setScrollFactor(0)
      .setDepth(49);
    hudText(RPX + 8, RBPT + 6, "FINANCIAL REPORT", theme.colors.accent, 10, 2);
    this.add
      .rectangle(RPX + 4, RBPT + 20, RPW - 8, 1, theme.colors.accent, 0.28)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(50);
    let ty = RBPT + 26;
    hudText(RPX + 8, ty, "REVENUE", theme.colors.textDim, 9, 1);
    ty += 13;
    this.revenueText = hudText(
      RPX + 8,
      ty,
      formatCash(0),
      theme.colors.profit,
      15,
      2,
    );
    ty += 22;
    hudText(RPX + 8, ty, "OPERATING COSTS", theme.colors.textDim, 9, 1);
    ty += 13;
    this.costsText = hudText(
      RPX + 8,
      ty,
      formatCash(0),
      theme.colors.loss,
      15,
      2,
    );
    ty += 22;
    this.add
      .rectangle(RPX + 4, ty, RPW - 8, 1, theme.colors.panelBorder, 0.4)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(50);
    ty += 8;
    hudText(RPX + 8, ty, "NET PROFIT", theme.colors.textDim, 9, 1);
    ty += 13;
    this.profitText = hudText(
      RPX + 8,
      ty,
      formatCash(0),
      theme.colors.text,
      17,
      2,
    );
    ty += 25;
    this.add
      .rectangle(RPX + 4, ty, RPW - 8, 1, theme.colors.panelBorder, 0.35)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(50);
    ty += 8;
    hudText(
      RPX + 8,
      ty,
      `\u25b6 ${state.activeRoutes.length} active routes`,
      theme.colors.textDim,
      10,
      1,
    );
    ty += 14;
    hudText(
      RPX + 8,
      ty,
      `\u25b6 ${state.fleet.length} ships in fleet`,
      theme.colors.textDim,
      10,
      1,
    );
    ty += 14;
    hudText(
      RPX + 8,
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
    const sfW = cam.width / cam.zoom;
    const popupH = 72;
    const popupW = 300;
    const containerY = 60 + index * (popupH + 8);
    const container = this.add
      .container(sfW + popupW, containerY)
      .setScrollFactor(0)
      .setDepth(60);
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
      MilestoneOverlay.show(
        this,
        "sim_complete",
        "SIM COMPLETE",
        sign + "\u00A7" + Math.abs(Math.round(net)).toLocaleString() + " Net",
      );
    }
    this.time.timeScale = 1;
    this.time.delayedCall(isLargeProfit ? 2200 : 500, () => {
      const hud = this.scene.get("GameHUDScene") as GameHUDScene;
      hud.switchContentScene("TurnReportScene");
    });
  }
}

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
  attachReflowHandler,
} from "../ui/index.ts";
import type { GameHUDScene } from "./GameHUDScene.ts";
import type { GameState, TurnResult } from "../data/types.ts";
import { EventCategory } from "../data/types.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import { buildGalaxyRouteTrafficVisuals } from "../game/routes/RouteManager.ts";
import { getActiveGalaxyView } from "./galaxy3d/GalaxyView3D.ts";

function formatCash(amount: number): string {
  return "§" + Math.round(amount).toLocaleString("en-US");
}

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

  private leaderCashTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private leaderProfitTexts: Map<string, Phaser.GameObjects.Text> = new Map();

  private revenueText!: Phaser.GameObjects.Text;
  private costsText!: Phaser.GameObjects.Text;
  private profitText!: Phaser.GameObjects.Text;

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

    // ── Simulate the turn (animation is purely cosmetic) ──────────────────────
    const state = gameStore.getState();
    const rng = new SeededRNG(state.seed + state.turn);
    this.newState = simulateTurn(state, rng);
    this.turnResult = this.newState.history[this.newState.history.length - 1];

    const ANIM_DURATION = 5000;

    // Refresh the active galaxy view's route visuals to match the new turn.
    // GalaxyMapScene stays running as the backdrop; this keeps its lanes current.
    const trafficVisuals = buildGalaxyRouteTrafficVisuals(this.newState);
    getActiveGalaxyView()?.setRoutes(trafficVisuals);

    // ── Revenue pop timers (projected onto 3D route curves) ───────────────────
    const routeRevenueMap = new Map<string, number>();
    for (const rp of this.turnResult.routePerformance) {
      routeRevenueMap.set(rp.routeId, rp.revenue);
    }
    const halfDur = ANIM_DURATION / 2;
    for (const [routeId, revenue] of routeRevenueMap) {
      if (revenue <= 0) continue;
      this.time.delayedCall(halfDur, () => {
        if (this.animationComplete) return;
        const view = getActiveGalaxyView();
        if (!view) return;
        const curve = view.getRouteCurve(routeId);
        if (!curve) return;
        const mid = new THREE.Vector3();
        curve.getPointAt(0.5, mid);
        const proj = view.projectToScreenDesign({
          x: mid.x,
          y: mid.y,
          z: mid.z,
        });
        if (!proj.visible) return;
        new FloatingText(
          this,
          proj.x,
          proj.y,
          "+" + formatCash(revenue),
          theme.colors.profit,
          { size: "large", riseDistance: 60 },
        );
        getAudioDirector().sfx("route_complete");
      });
    }

    // ── Leaderboard data ──────────────────────────────────────────────────────
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

    // ── Text helper (screen-fixed, dark stroke for galaxy backdrop legibility) ─
    const hudText = (
      x: number,
      y: number,
      txt: string,
      col: number,
      fs = 12,
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

    // ── Screen-absolute layout anchors ────────────────────────────────────────
    // The nav sidebar (GameHUDScene) covers x = 0..navSidebarWidth.
    // The top HUD bar covers y = 0..contentTop.  All sim elements must live
    // inside the content rectangle so they don't underlay those chrome strips.
    const cLeft = L.navSidebarWidth + 12;
    const cTop = L.contentTop + 6;
    const cCenterX = Math.round((L.navSidebarWidth + L.gameWidth) / 2);

    // ── Top-centre: blinking turn indicator ───────────────────────────────────
    const quarter = ((state.turn - 1) % 4) + 1;
    const year = Math.floor((state.turn - 1) / 4) + 1;
    this.simLabel = hudText(
      cCenterX,
      cTop + 2,
      `⟫ SIMULATING Q${quarter} Y${year} ⟪`,
      theme.colors.accent,
      14,
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
    const LPW = 200;
    const maxRows = Math.min(leaderboard.length, 7);
    const ROW_H = 48;
    const lPanelH = 32 + maxRows * ROW_H;

    this.add
      .rectangle(cLeft, cTop + 24, LPW, lPanelH, 0x050c1a, 0.88)
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.6)
      .setScrollFactor(0)
      .setDepth(49);
    hudText(cLeft + 8, cTop + 30, "STANDINGS", theme.colors.accent, 11, 2);
    this.add
      .rectangle(cLeft + 4, cTop + 44, LPW - 8, 1, theme.colors.accent, 0.28)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(50);

    for (let i = 0; i < maxRows; i++) {
      const e = leaderboard[i];
      const ry = cTop + 50 + i * ROW_H;
      if (e.isPlayer) {
        this.add
          .rectangle(
            cLeft + 2,
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
        .circle(cLeft + 10, ry + 9, 4, medalColor, i <= 2 ? 0.9 : 0.45)
        .setScrollFactor(0)
        .setDepth(51);
      const truncName =
        e.name.length > 16 ? e.name.substring(0, 14) + "…" : e.name;
      hudText(
        cLeft + 20,
        ry + 1,
        `${i + 1}. ${truncName}${e.bankrupt ? " ☠" : ""}`,
        e.isPlayer ? theme.colors.accent : theme.colors.text,
        12,
        2,
      );
      const cashT = hudText(
        cLeft + 20,
        ry + 17,
        formatCash(e.startCash),
        theme.colors.text,
        13,
        2,
      );
      this.leaderCashTexts.set(e.id, cashT);
      const profitCol = e.profit >= 0 ? theme.colors.profit : theme.colors.loss;
      const profitT = hudText(
        cLeft + 20,
        ry + 33,
        (e.profit >= 0 ? "+" : "") + formatCash(0),
        profitCol,
        11,
        1,
      );
      this.leaderProfitTexts.set(e.id, profitT);
      hudText(
        cLeft + LPW - 6,
        ry + 17,
        `${e.routeCount}▸`,
        theme.colors.textDim,
        11,
        1,
      ).setOrigin(1, 0);
    }

    // ── Right panel: Financial Report ─────────────────────────────────────────
    const RPW = 220;
    const RP = 12;
    this.rightPanelContainer = this.add
      .container(L.gameWidth - RPW - RP, L.contentTop)
      .setScrollFactor(0)
      .setDepth(49);

    this.rightPanelContainer.add(
      this.add
        .rectangle(0, 6, RPW, 234, 0x050c1a, 0.88)
        .setOrigin(0, 0)
        .setStrokeStyle(1, theme.colors.panelBorder, 0.6),
    );

    const rightHudText = (
      x: number,
      y: number,
      txt: string,
      col: number,
      fs = 12,
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

    rightHudText(8, 12, "FINANCIAL REPORT", theme.colors.accent, 11, 2);
    this.rightPanelContainer.add(
      this.add
        .rectangle(4, 26, RPW - 8, 1, theme.colors.accent, 0.28)
        .setOrigin(0, 0),
    );

    let ty = 32;
    rightHudText(8, ty, "REVENUE", theme.colors.textDim, 10, 1);
    ty += 14;
    this.revenueText = rightHudText(
      8,
      ty,
      formatCash(0),
      theme.colors.profit,
      16,
      2,
    );
    ty += 26;
    rightHudText(8, ty, "OPERATING COSTS", theme.colors.textDim, 10, 1);
    ty += 14;
    this.costsText = rightHudText(
      8,
      ty,
      formatCash(0),
      theme.colors.loss,
      16,
      2,
    );
    ty += 26;
    this.rightPanelContainer.add(
      this.add
        .rectangle(4, ty, RPW - 8, 1, theme.colors.panelBorder, 0.4)
        .setOrigin(0, 0),
    );
    ty += 10;
    rightHudText(8, ty, "NET PROFIT", theme.colors.textDim, 10, 1);
    ty += 14;
    this.profitText = rightHudText(
      8,
      ty,
      formatCash(0),
      theme.colors.text,
      18,
      2,
    );
    ty += 30;
    this.rightPanelContainer.add(
      this.add
        .rectangle(4, ty, RPW - 8, 1, theme.colors.panelBorder, 0.35)
        .setOrigin(0, 0),
    );
    ty += 10;
    rightHudText(
      8,
      ty,
      `▶ ${state.activeRoutes.length} active routes`,
      theme.colors.textDim,
      11,
      1,
    );
    ty += 16;
    rightHudText(
      8,
      ty,
      `▶ ${state.fleet.length} ships in fleet`,
      theme.colors.textDim,
      11,
      1,
    );
    ty += 20;
    rightHudText(
      8,
      ty,
      "Scroll to zoom · Drag to pan",
      theme.colors.textDim,
      10,
      0,
    ).setAlpha(0.5);

    // ── Tween: animate financial numbers and leaderboard cash ─────────────────
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
          this.leaderCashTexts.get(e.id)?.setText(formatCash(animCash));
          const pt = this.leaderProfitTexts.get(e.id);
          if (pt) {
            pt.setText(
              (e.profit >= 0 ? "+" : "") + formatCash(Math.round(e.profit * p)),
            );
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

    // ── Speed controls ────────────────────────────────────────────────────────
    const BTN_W = 88;
    const BTN_H = 34;
    const BTN_GAP = 10;
    const totalBW = BTN_W * 4 + BTN_GAP * 3;
    const speedDefs = [
      { label: "1×", speed: 1 },
      { label: "2×", speed: 2 },
      { label: "4×", speed: 4 },
      { label: "Skip", speed: 0 },
    ];
    const btnStartX = cCenterX - Math.round(totalBW / 2);
    const btnBaseY = L.hudBottomBarTop - BTN_H - 10;
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

    this.relayout();
    attachReflowHandler(this, () => this.relayout());
  }

  private relayout(): void {
    const L = getLayout();
    const RPW = 220;
    const RP = 12;
    const BTN_W = 88;
    const BTN_H = 34;
    const BTN_GAP = 10;
    const totalBW = BTN_W * 4 + BTN_GAP * 3;
    const cCenterX = Math.round((L.navSidebarWidth + L.gameWidth) / 2);

    this.simLabel.setPosition(cCenterX, L.contentTop + 8);
    this.rightPanelContainer.setPosition(L.gameWidth - RPW - RP, L.contentTop);

    const btnStartX = cCenterX - Math.round(totalBW / 2);
    const btnBaseY = L.hudBottomBarTop - BTN_H - 10;
    for (let i = 0; i < this.speedButtons.length; i++) {
      this.speedButtons[i].setPosition(
        btnStartX + i * (BTN_W + BTN_GAP),
        btnBaseY,
      );
    }
  }

  private setSpeed(multiplier: number): void {
    this.tweens.timeScale = multiplier;
    this.time.timeScale = multiplier;
  }

  private showEventPopup(
    name: string,
    description: string,
    index: number,
    category?: string,
  ): void {
    const theme = getTheme();
    const L = getLayout();
    const sfW = this.cameras.main.width;
    const popupH = 76;
    const popupW = 310;
    const startY = L.contentTop + 60 + index * (popupH + 10);
    const container = this.add
      .container(sfW + popupW, startY)
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
    if (isHazard) audio.sfx("event_hazard");
    else if (isOpportunity) audio.sfx("event_opportunity");
    else audio.sfx("ui_click_secondary");

    const bg = this.add
      .rectangle(0, 0, popupW, popupH, theme.colors.panelBg, 0.94)
      .setOrigin(0, 0);
    const border = this.add
      .rectangle(0, 0, 4, popupH, borderColor)
      .setOrigin(0, 0);
    const truncName = name.length > 32 ? name.substring(0, 29) + "…" : name;
    const nameText = this.add.text(12, 8, truncName, {
      fontSize: `${theme.fonts.body.size + 1}px`,
      fontFamily: theme.fonts.body.family,
      color: colorToString(nameColor),
    });
    const shortDesc =
      description.length > 110
        ? description.substring(0, 107) + "…"
        : description;
    const descText = this.add.text(12, 30, shortDesc, {
      fontSize: `${theme.fonts.caption.size}px`,
      fontFamily: theme.fonts.caption.family,
      color: colorToString(theme.colors.textDim),
      wordWrap: { width: 286 },
    });
    container.add([bg, border, nameText, descText]);
    this.tweens.add({
      targets: container,
      x: sfW - popupW - 12,
      duration: 400,
      ease: "Back.easeOut",
    });
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

  private finishAnimation(): void {
    if (this.animationComplete) return;
    this.animationComplete = true;
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
        sign + "§" + Math.abs(Math.round(net)).toLocaleString("en-US") + " Net",
      );
    }
    this.time.timeScale = 1;
    this.time.delayedCall(isLargeProfit ? 2200 : 500, () => {
      const hud = this.scene.get("GameHUDScene") as GameHUDScene;
      hud.switchContentScene("TurnReportScene");
    });
  }
}

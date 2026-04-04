import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { simulateTurn } from "../game/simulation/TurnSimulator.ts";
import { SeededRNG } from "../utils/SeededRNG.ts";
import { getTheme, colorToString } from "../ui/Theme.ts";
import { Button } from "../ui/Button.ts";
import { Label } from "../ui/Label.ts";
import { Panel } from "../ui/Panel.ts";
import { createStarfield } from "../ui/Starfield.ts";
import type { GameHUDScene } from "./GameHUDScene.ts";
import { GAME_WIDTH, GAME_HEIGHT, CONTENT_TOP } from "../ui/Layout.ts";
import type { GameState, TurnResult } from "../data/types.ts";
import { EventCategory } from "../data/types.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import { FloatingText } from "../ui/FloatingText.ts";
import { MilestoneOverlay } from "../ui/MilestoneOverlay.ts";
import { flashScreen } from "../ui/AmbientFX.ts";

function formatCash(amount: number): string {
  return "\u00A7" + amount.toLocaleString();
}

export class SimPlaybackScene extends Phaser.Scene {
  private newState!: GameState;
  private turnResult!: TurnResult;
  private animationComplete = false;
  private revenueLabel!: Label;
  private costsLabel!: Label;
  private profitLabel!: Label;

  constructor() {
    super({ key: "SimPlaybackScene" });
  }

  create(): void {
    const theme = getTheme();
    this.animationComplete = false;

    // Starfield background (depth -100 by default)
    createStarfield(this);

    // -----------------------------------------------------------------------
    // Step 1: Run simulation immediately — animation is purely cosmetic
    // -----------------------------------------------------------------------
    const state = gameStore.getState();
    const rng = new SeededRNG(state.seed + state.turn);
    this.newState = simulateTurn(state, rng);
    this.turnResult = this.newState.history[this.newState.history.length - 1];

    const ANIM_DURATION = 5000; // 5 seconds at 1x speed

    // -----------------------------------------------------------------------
    // Step 2: Simplified galaxy view — systems as dots, route lines
    // -----------------------------------------------------------------------
    const { systems, planets } = state.galaxy;

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
      x: GAME_WIDTH - 230,
      y: CONTENT_TOP + 10,
      width: 220,
      height: 130,
      showGlow: false,
    });
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
    const btnY = GAME_HEIGHT - 50;
    const btnWidth = 80;
    const btnHeight = 32;
    const totalBtnWidth = btnWidth * 4 + 30;
    const startX = GAME_WIDTH / 2 - totalBtnWidth / 2;

    new Button(this, {
      x: startX,
      y: btnY,
      width: btnWidth,
      height: btnHeight,
      label: "1x",
      onClick: () => this.setSpeed(1),
    });

    new Button(this, {
      x: startX + btnWidth + 10,
      y: btnY,
      width: btnWidth,
      height: btnHeight,
      label: "2x",
      onClick: () => this.setSpeed(2),
    });

    new Button(this, {
      x: startX + (btnWidth + 10) * 2,
      y: btnY,
      width: btnWidth,
      height: btnHeight,
      label: "4x",
      onClick: () => this.setSpeed(4),
    });

    new Button(this, {
      x: startX + (btnWidth + 10) * 3,
      y: btnY,
      width: btnWidth,
      height: btnHeight,
      label: "Skip",
      onClick: () => this.skipAnimation(),
    });
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

    const container = this.add.container(1280, popupY);

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
      x: 960,
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

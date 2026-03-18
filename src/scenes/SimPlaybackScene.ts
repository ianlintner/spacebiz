import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { simulateTurn } from "../game/simulation/TurnSimulator.ts";
import { SeededRNG } from "../utils/SeededRNG.ts";
import { getTheme, colorToString } from "../ui/Theme.ts";
import { Button } from "../ui/Button.ts";
import { Label } from "../ui/Label.ts";
import type { GameState, TurnResult } from "../data/types.ts";

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
    this.cameras.main.setBackgroundColor(theme.colors.background);
    this.animationComplete = false;

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

    // Draw systems
    for (const sys of systems) {
      this.add.circle(sys.x, sys.y, 4, sys.starColor, 0.6);
      this.add
        .text(sys.x, sys.y + 8, sys.name, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
        })
        .setOrigin(0.5, 0);
    }

    // Draw route lines and animate ships
    const routeGraphics = this.add.graphics();
    routeGraphics.lineStyle(1, theme.colors.accent, 0.3);

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

      // Animated ship dot traveling the route
      const shipDot = this.add.circle(
        originSys.x,
        originSys.y,
        3,
        theme.colors.accent,
      );
      this.tweens.add({
        targets: shipDot,
        x: destSys.x,
        y: destSys.y,
        duration: ANIM_DURATION / 2,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    // -----------------------------------------------------------------------
    // Step 3: Revenue / Cost ticker (top-right)
    // -----------------------------------------------------------------------
    const tickerX = 1070;
    const tickerY = 70;

    this.add
      .rectangle(tickerX - 10, tickerY - 10, 220, 110, theme.colors.panelBg, 0.85)
      .setOrigin(0, 0);

    new Label(this, {
      x: tickerX,
      y: tickerY,
      text: "Turn Simulation",
      style: "caption",
      color: theme.colors.accent,
    });

    this.revenueLabel = new Label(this, {
      x: tickerX,
      y: tickerY + 22,
      text: "Revenue: " + formatCash(0),
      style: "body",
      color: theme.colors.profit,
    });

    this.costsLabel = new Label(this, {
      x: tickerX,
      y: tickerY + 44,
      text: "Costs: " + formatCash(0),
      style: "body",
      color: theme.colors.loss,
    });

    this.profitLabel = new Label(this, {
      x: tickerX,
      y: tickerY + 72,
      text: "Profit: " + formatCash(0),
      style: "value",
      color: theme.colors.text,
    });

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
          this.showEventPopup(eventName, description, index);
        });
      });
    }

    // -----------------------------------------------------------------------
    // Step 5: Speed control buttons
    // -----------------------------------------------------------------------
    const btnY = 660;
    const btnWidth = 80;
    const btnHeight = 36;
    const totalBtnWidth = btnWidth * 4 + 30;
    const startX = 640 - totalBtnWidth / 2;

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
  // Event popup slide-in
  // -------------------------------------------------------------------------

  private showEventPopup(
    name: string,
    description: string,
    index: number,
  ): void {
    const theme = getTheme();
    const popupY = 200 + index * 70;

    const container = this.add.container(1280, popupY);

    const bg = this.add
      .rectangle(0, 0, 300, 55, theme.colors.panelBg, 0.9)
      .setOrigin(0, 0);
    const border = this.add
      .rectangle(0, 0, 4, 55, theme.colors.warning)
      .setOrigin(0, 0);

    const nameText = this.add.text(12, 6, name, {
      fontSize: `${theme.fonts.body.size}px`,
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.accent),
    });

    const shortDesc =
      description.length > 45
        ? description.substring(0, 42) + "..."
        : description;
    const descText = this.add.text(12, 28, shortDesc, {
      fontSize: `${theme.fonts.caption.size}px`,
      fontFamily: theme.fonts.caption.family,
      color: colorToString(theme.colors.textDim),
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

    // Brief pause then transition to the turn report
    this.time.timeScale = 1;
    this.time.delayedCall(500, () => {
      this.scene.start("TurnReportScene");
    });
  }
}

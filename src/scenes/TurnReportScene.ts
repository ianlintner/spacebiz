import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { getTheme, colorToString } from "../ui/Theme.ts";
import { Panel } from "../ui/Panel.ts";
import { Button } from "../ui/Button.ts";
import { DataTable } from "../ui/DataTable.ts";
import { ScrollableList } from "../ui/ScrollableList.ts";
import { PortraitPanel } from "../ui/PortraitPanel.ts";
import { createStarfield } from "../ui/Starfield.ts";
import { autoSave } from "../game/SaveManager.ts";
import { AdviserPanel } from "../ui/AdviserPanel.ts";
import { consumeMessages } from "../game/adviser/AdviserEngine.ts";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  CONTENT_TOP,
  CONTENT_HEIGHT,
  SIDEBAR_LEFT,
  SIDEBAR_WIDTH,
  MAIN_CONTENT_LEFT,
  MAIN_CONTENT_WIDTH,
} from "../ui/Layout.ts";
import type { TurnResult } from "../data/types.ts";
import type { GameHUDScene } from "./GameHUDScene.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import { MilestoneOverlay } from "../ui/MilestoneOverlay.ts";

function formatCash(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(Math.round(amount));
  return sign + "\u00A7" + abs.toLocaleString();
}

/** Grade the turn: S/A/B/C/D/F based on net-profit margin. */
function getTurnGrade(
  netProfit: number,
  revenue: number,
): { grade: string; color: number } {
  const margin = revenue > 0 ? netProfit / revenue : netProfit >= 0 ? 1 : -1;
  if (margin >= 0.4) return { grade: "S", color: 0xffdd00 };
  if (margin >= 0.2) return { grade: "A", color: 0x00ff88 };
  if (margin >= 0.05) return { grade: "B", color: 0x00ccff };
  if (margin >= 0) return { grade: "C", color: 0x88cc88 };
  if (margin >= -0.15) return { grade: "D", color: 0xff9900 };
  return { grade: "F", color: 0xff4444 };
}

export class TurnReportScene extends Phaser.Scene {
  constructor() {
    super({ key: "TurnReportScene" });
  }

  create(): void {
    const theme = getTheme();
    const state = gameStore.getState();
    getAudioDirector().setMusicState("report");

    const history = state.history;
    const lastTurn: TurnResult | undefined = history[history.length - 1];

    if (!lastTurn) {
      // Safety: should never arrive here without history, but handle gracefully
      const hud = this.scene.get("GameHUDScene") as GameHUDScene;
      hud.switchContentScene("GalaxyMapScene");
      return;
    }

    // Auto-save after each completed turn so the player can resume later
    autoSave(state);

    // Starfield background
    createStarfield(this);

    // -----------------------------------------------------------------------
    // Left sidebar — PortraitPanel with turn summary
    // -----------------------------------------------------------------------
    const totalCosts =
      lastTurn.fuelCosts +
      lastTurn.maintenanceCosts +
      lastTurn.loanPayments +
      lastTurn.otherCosts;
    const netColor =
      lastTurn.netProfit >= 0 ? theme.colors.profit : theme.colors.loss;

    const portrait = new PortraitPanel(this, {
      x: SIDEBAR_LEFT,
      y: CONTENT_TOP,
      width: SIDEBAR_WIDTH,
      height: CONTENT_HEIGHT,
    });
    portrait.updatePortrait(
      "event",
      lastTurn.turn,
      `Turn ${lastTurn.turn} Report`,
      [
        { label: "Revenue", value: formatCash(lastTurn.revenue) },
        { label: "Costs", value: formatCash(totalCosts) },
        { label: "Net Profit", value: formatCash(lastTurn.netProfit) },
      ],
      { eventCategory: "market" },
    );

    // Manually color the net profit stat label if possible — PortraitPanel
    // doesn't support per-stat colors, so we accept the default styling here.
    void netColor; // acknowledged but not applicable via API

    // -----------------------------------------------------------------------
    // P&L Panel (top of main content area)
    // -----------------------------------------------------------------------
    const plPanel = new Panel(this, {
      x: MAIN_CONTENT_LEFT,
      y: CONTENT_TOP,
      width: MAIN_CONTENT_WIDTH,
      height: 200,
      title: "Profit & Loss",
    });
    const plContent = plPanel.getContentArea();

    const plRows: Array<{ label: string; value: string; color: number }> = [
      {
        label: "Revenue",
        value: formatCash(lastTurn.revenue),
        color: theme.colors.profit,
      },
      {
        label: "Fuel Costs",
        value: formatCash(-lastTurn.fuelCosts),
        color: theme.colors.loss,
      },
      {
        label: "Maintenance",
        value: formatCash(-lastTurn.maintenanceCosts),
        color: theme.colors.loss,
      },
      {
        label: "Loan Interest",
        value: formatCash(-lastTurn.loanPayments),
        color: theme.colors.loss,
      },
    ];

    let rowY = plContent.y + 4;
    for (let i = 0; i < plRows.length; i++) {
      const row = plRows[i];
      const delay = i * 90;

      const labelText = this.add
        .text(plContent.x + 8, rowY, row.label, {
          fontSize: `${theme.fonts.body.size}px`,
          fontFamily: theme.fonts.body.family,
          color: colorToString(theme.colors.text),
        })
        .setAlpha(0);
      plPanel.add(labelText);

      const valueText = this.add
        .text(plContent.x + plContent.width - 8, rowY, row.value, {
          fontSize: `${theme.fonts.value.size}px`,
          fontFamily: theme.fonts.value.family,
          color: colorToString(row.color),
        })
        .setOrigin(1, 0)
        .setAlpha(0);
      plPanel.add(valueText);

      // Stagger-in: slide from left + fade
      this.tweens.add({
        targets: [labelText, valueText],
        alpha: 1,
        x: `+=18`,
        duration: 220,
        delay,
        ease: "Cubic.easeOut",
        onStart: () => {
          labelText.x -= 18;
          valueText.x -= 18;
        },
      });

      rowY += 28;
    }

    // Separator line
    const sepLine = this.add
      .rectangle(
        plContent.x + 8,
        rowY + 4,
        plContent.width - 16,
        1,
        theme.colors.panelBorder,
      )
      .setOrigin(0, 0);
    plPanel.add(sepLine);
    rowY += 12;

    // Net profit row — animated counter
    const plNetColor =
      lastTurn.netProfit >= 0 ? theme.colors.profit : theme.colors.loss;
    const netLabel = this.add
      .text(plContent.x + 8, rowY, "Net Profit", {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
      })
      .setAlpha(0);
    plPanel.add(netLabel);

    const netValue = this.add
      .text(plContent.x + plContent.width - 8, rowY, formatCash(0), {
        fontSize: `${theme.fonts.value.size}px`,
        fontFamily: theme.fonts.value.family,
        color: colorToString(plNetColor),
      })
      .setOrigin(1, 0)
      .setAlpha(0);
    plPanel.add(netValue);

    // Fade in the net row after the P&L rows have appeared
    const netRevealDelay = plRows.length * 90 + 80;
    this.tweens.add({
      targets: [netLabel, netValue],
      alpha: 1,
      duration: 260,
      delay: netRevealDelay,
    });

    // Animate the counter rolling up from 0 to final value
    const counterTarget = { value: 0 };
    this.tweens.add({
      targets: counterTarget,
      value: lastTurn.netProfit,
      duration: 700,
      delay: netRevealDelay + 60,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        netValue.setText(formatCash(counterTarget.value));
      },
      onComplete: () => {
        netValue.setText(formatCash(lastTurn.netProfit));
        // Punch-in scale on completion
        this.tweens.add({
          targets: netValue,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 120,
          yoyo: true,
          ease: "Back.easeOut",
        });
      },
    });

    // ── Performance grade badge ────────────────────────────────────────────
    const { grade, color: gradeColor } = getTurnGrade(
      lastTurn.netProfit,
      lastTurn.revenue,
    );
    const gradeLabel = this.add
      .text(plContent.x + plContent.width - 8, plContent.y + 4, grade, {
        fontSize: "42px",
        fontFamily: theme.fonts.heading.family,
        fontStyle: "bold",
        color: "#" + gradeColor.toString(16).padStart(6, "0"),
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setScale(1.5);
    plPanel.add(gradeLabel);
    this.tweens.add({
      targets: gradeLabel,
      alpha: 0.85,
      scaleX: 1,
      scaleY: 1,
      duration: 320,
      delay: netRevealDelay + 700,
      ease: "Back.easeOut",
    });

    // ── Streak badge ───────────────────────────────────────────────────────
    const streakTurns = state.storyteller.consecutiveProfitTurns;
    if (streakTurns >= 2) {
      const streakText = `\uD83D\uDD25 ${streakTurns}-Turn Streak!`;
      const streakBadge = this.add
        .text(plContent.x + plContent.width / 2, rowY, streakText, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.accent),
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0)
        .setAlpha(0);
      plPanel.add(streakBadge);
      this.tweens.add({
        targets: streakBadge,
        alpha: 1,
        y: `+=0`,
        duration: 280,
        delay: netRevealDelay + 820,
      });
    }

    // ── Audio & milestone overlay ──────────────────────────────────────────
    const audio = getAudioDirector();
    const revealDelay = netRevealDelay + 700;
    this.time.delayedCall(revealDelay, () => {
      if (lastTurn.netProfit >= 0) {
        audio.sfx("milestone_profit");
        // Big profit milestone
        if (lastTurn.netProfit >= 5000) {
          MilestoneOverlay.show(
            this,
            "big_profit",
            "PROFITABLE!",
            "+" + "\u00A7" + Math.round(lastTurn.netProfit).toLocaleString(),
          );
        } else if (streakTurns >= 3) {
          MilestoneOverlay.show(
            this,
            "profit_streak",
            `\uD83D\uDD25 ${streakTurns}-TURN STREAK!`,
            "Keep the momentum going!",
          );
        }
      } else {
        audio.sfxLossSting();
        if (lastTurn.netProfit < -10000) {
          MilestoneOverlay.show(
            this,
            "loss_warning",
            "HEAVY LOSSES",
            formatCash(lastTurn.netProfit) + " this turn",
          );
        }
      }
    });

    // -----------------------------------------------------------------------
    // Route Performance (middle of main content area)
    // -----------------------------------------------------------------------
    const routePerf = lastTurn.routePerformance;

    // Build planet name lookup for route labels
    const planetMap = new Map<string, string>();
    for (const planet of state.galaxy.planets) {
      planetMap.set(planet.id, planet.name);
    }

    // Build route label lookup
    const routeLabelMap = new Map<string, string>();
    for (const route of state.activeRoutes) {
      const originName = planetMap.get(route.originPlanetId) ?? "???";
      const destName = planetMap.get(route.destinationPlanetId) ?? "???";
      routeLabelMap.set(route.id, `${originName} > ${destName}`);
    }

    new Panel(this, {
      x: MAIN_CONTENT_LEFT,
      y: CONTENT_TOP + 210,
      width: MAIN_CONTENT_WIDTH,
      height: 180,
      title: "Route Performance",
    });

    const routeTable = new DataTable(this, {
      x: MAIN_CONTENT_LEFT + 10,
      y: CONTENT_TOP + 250,
      width: MAIN_CONTENT_WIDTH - 20,
      height: 130,
      columns: [
        {
          key: "route",
          label: "Route",
          width: 200,
        },
        {
          key: "trips",
          label: "Trips",
          width: 70,
          align: "right",
        },
        {
          key: "revenue",
          label: "Revenue",
          width: 130,
          align: "right",
          format: (v) => formatCash(v as number),
          colorFn: () => theme.colors.profit,
        },
        {
          key: "fuelCost",
          label: "Fuel Cost",
          width: 130,
          align: "right",
          format: (v) => formatCash(v as number),
          colorFn: () => theme.colors.loss,
        },
        {
          key: "cargo",
          label: "Cargo",
          width: 90,
          align: "right",
        },
        {
          key: "breakdowns",
          label: "Breakdowns",
          width: 90,
          align: "right",
          colorFn: (v) => ((v as number) > 0 ? theme.colors.loss : null),
        },
      ],
    });

    const routeRows = routePerf.map((rp) => ({
      route: routeLabelMap.get(rp.routeId) ?? rp.routeId,
      trips: rp.trips,
      revenue: rp.revenue,
      fuelCost: rp.fuelCost,
      cargo: rp.cargoMoved + rp.passengersMoved,
      breakdowns: rp.breakdowns,
    }));
    routeTable.setRows(routeRows);

    // -----------------------------------------------------------------------
    // Bottom row: News Digest (left) + Market Changes (right)
    // -----------------------------------------------------------------------
    const bottomY = CONTENT_TOP + 400;
    const halfWidth = MAIN_CONTENT_WIDTH / 2 - 5;

    // News Digest (bottom-left)
    new Panel(this, {
      x: MAIN_CONTENT_LEFT,
      y: bottomY,
      width: halfWidth,
      height: 200,
      title: "News Digest",
    });

    const newsList = new ScrollableList(this, {
      x: MAIN_CONTENT_LEFT + 10,
      y: bottomY + 40,
      width: halfWidth - 20,
      height: 150,
      itemHeight: 60,
    });

    const eventNames = lastTurn.eventsOccurred;
    const activeEvents = state.activeEvents;

    if (eventNames.length === 0) {
      const emptyItem = this.add.container(0, 0);
      const emptyText = this.add.text(10, 12, "No notable events this turn.", {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.textDim),
      });
      emptyItem.add(emptyText);
      newsList.addItem(emptyItem);
    } else {
      for (const eventName of eventNames) {
        const detail = activeEvents.find((e) => e.name === eventName);
        const desc = detail ? detail.description : "";

        const item = this.add.container(0, 0);
        const nameText = this.add.text(10, 4, eventName, {
          fontSize: `${theme.fonts.body.size}px`,
          fontFamily: theme.fonts.body.family,
          color: colorToString(theme.colors.accent),
          wordWrap: { width: halfWidth - 40 },
        });
        const descText = this.add.text(10, 24, desc, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
          wordWrap: { width: halfWidth - 40 },
        });
        item.add([nameText, descText]);
        newsList.addItem(item);
      }
    }

    // Market Changes (bottom-right)
    const marketPanel = new Panel(this, {
      x: MAIN_CONTENT_LEFT + MAIN_CONTENT_WIDTH / 2 + 5,
      y: bottomY,
      width: halfWidth,
      height: 200,
      title: "Market Changes",
    });
    const mpContent = marketPanel.getContentArea();

    // Fuel price summary
    const fuelText = `Fuel price: ${formatCash(state.market.fuelPrice)} (${state.market.fuelTrend})`;
    const fuelLabel = this.add.text(
      mpContent.x + 8,
      mpContent.y + 4,
      fuelText,
      {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
      },
    );
    marketPanel.add(fuelLabel);

    // Show summary of cargo delivered this turn
    const cargoEntries = Object.entries(lastTurn.cargoDelivered).filter(
      ([, amount]) => amount > 0,
    );
    let marketY = mpContent.y + 32;
    if (cargoEntries.length > 0) {
      const cargoHeader = this.add.text(
        mpContent.x + 8,
        marketY,
        "Cargo delivered this turn:",
        {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
        },
      );
      marketPanel.add(cargoHeader);
      marketY += 20;

      for (const [cargoType, amount] of cargoEntries) {
        const cargoLine = this.add.text(
          mpContent.x + 16,
          marketY,
          `${cargoType}: ${(amount as number).toLocaleString()} units`,
          {
            fontSize: `${theme.fonts.caption.size}px`,
            fontFamily: theme.fonts.caption.family,
            color: colorToString(theme.colors.text),
          },
        );
        marketPanel.add(cargoLine);
        marketY += 18;
      }
    }

    if (lastTurn.passengersTransported > 0) {
      const paxText = this.add.text(
        mpContent.x + 8,
        marketY + 4,
        `Passengers: ${lastTurn.passengersTransported.toLocaleString()}`,
        {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.text),
        },
      );
      marketPanel.add(paxText);
    }

    // -----------------------------------------------------------------------
    // Adviser panel — Rex's commentary on the turn
    // -----------------------------------------------------------------------
    const adviserMsgs = state.adviser?.pendingMessages ?? [];
    if (adviserMsgs.length > 0) {
      const advPanel = new AdviserPanel(this, {
        x: MAIN_CONTENT_LEFT,
        y: CONTENT_TOP + CONTENT_HEIGHT - 160,
        width: MAIN_CONTENT_WIDTH,
      });
      advPanel.setDepth(150);
      advPanel.showMessages(adviserMsgs);

      // Consume messages from state so they aren't shown again
      const { adviser: updatedAdviser } = consumeMessages(state.adviser);
      gameStore.update({ adviser: updatedAdviser });
    }

    // -----------------------------------------------------------------------
    // Continue button — centered at bottom
    // -----------------------------------------------------------------------
    new Button(this, {
      x: GAME_WIDTH / 2 - 80,
      y: GAME_HEIGHT - 60,
      width: 160,
      height: 40,
      label: state.gameOver ? "View Results" : "Continue",
      onClick: () => {
        if (state.gameOver) {
          // GameOver exits HUD-managed flow entirely — use scene.start directly
          this.scene.start("GameOverScene");
        } else {
          gameStore.update({ phase: "planning" });
          const hud = this.scene.get("GameHUDScene") as GameHUDScene;
          hud.switchContentScene("GalaxyMapScene");
        }
      },
    });
  }
}

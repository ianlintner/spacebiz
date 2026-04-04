import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { getTheme, colorToString } from "../ui/Theme.ts";
import { Label } from "../ui/Label.ts";
import { Button } from "../ui/Button.ts";
import { Panel } from "../ui/Panel.ts";
import { DataTable } from "../ui/DataTable.ts";
import { createStarfield } from "../ui/Starfield.ts";
import { CargoType } from "../data/types.ts";
import type { CargoType as CargoTypeT } from "../data/types.ts";
import {
  calculateScore,
  saveHighScore,
  getHighScores,
} from "../game/scoring/ScoreCalculator.ts";
import { calculateShipValue } from "../game/fleet/FleetManager.ts";
import {
  GAME_WIDTH,
  CONTENT_TOP,
  CONTENT_HEIGHT,
  FULL_CONTENT_LEFT,
} from "../ui/Layout.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import { AdviserPanel } from "../ui/AdviserPanel.ts";
import { buildRevealMessages } from "../game/adviser/AdviserEngine.ts";

function formatCash(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(Math.round(amount));
  return sign + "\u00A7" + abs.toLocaleString();
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameOverScene" });
  }

  create(): void {
    const theme = getTheme();
    const state = gameStore.getState();
    getAudioDirector().setMusicState("gameover");

    // Stop the HUD scene since the game is over
    this.scene.stop("GameHUDScene");

    // Starfield background
    createStarfield(this);

    // -----------------------------------------------------------------------
    // Win / Lose heading with glow
    // -----------------------------------------------------------------------
    const isVictory = state.gameOverReason === "completed";
    const headingText = isVictory ? "VICTORY!" : "BANKRUPTCY!";
    const headingColor = isVictory ? theme.colors.profit : theme.colors.loss;

    const heading = new Label(this, {
      x: GAME_WIDTH / 2,
      y: CONTENT_TOP + 10,
      text: headingText,
      style: "heading",
      color: headingColor,
      glow: true,
    });
    heading.setOrigin(0.5, 0.5);
    heading.setFontSize(48);

    // Subtitle
    const subtitleText = isVictory
      ? `Congratulations, ${state.companyName}! You survived all ${state.maxTurns} turns.`
      : `${state.companyName} has gone bankrupt after ${state.turn - 1} turns.`;
    const subtitle = new Label(this, {
      x: GAME_WIDTH / 2,
      y: CONTENT_TOP + 60,
      text: subtitleText,
      style: "body",
      color: theme.colors.text,
      maxWidth: GAME_WIDTH - 80,
    });
    subtitle.setOrigin(0.5, 0);

    // -----------------------------------------------------------------------
    // Score calculation and breakdown
    // -----------------------------------------------------------------------
    const finalScore = calculateScore(state);

    // Compute breakdown components (mirrors ScoreCalculator logic)
    const fleetValue = state.fleet.reduce(
      (sum, ship) => sum + calculateShipValue(ship),
      0,
    );
    const loanBalance = state.loans.reduce(
      (sum, loan) => sum + loan.remainingBalance,
      0,
    );
    const netWorth = state.cash + fleetValue - loanBalance;
    const reputationBonus = state.reputation * 100;

    const allCargoTypes: CargoTypeT[] = Object.values(CargoType);
    let totalCargoDelivered = 0;
    for (const turnResult of state.history) {
      for (const ct of allCargoTypes) {
        totalCargoDelivered += turnResult.cargoDelivered[ct] ?? 0;
      }
    }
    const cargoBonus = totalCargoDelivered * 0.5;
    const routeBonus = state.activeRoutes.length * 500;

    // -----------------------------------------------------------------------
    // Score breakdown panel (left side, glass panel)
    // -----------------------------------------------------------------------
    const scorePanel = new Panel(this, {
      x: FULL_CONTENT_LEFT,
      y: CONTENT_TOP + 90,
      width: 520,
      height: 280,
      title: "Score Breakdown",
    });
    const spContent = scorePanel.getContentArea();

    const breakdownRows: Array<{
      label: string;
      value: string;
      color: number;
    }> = [
      {
        label: "Net Worth",
        value: formatCash(netWorth),
        color: netWorth >= 0 ? theme.colors.profit : theme.colors.loss,
      },
      {
        label: "Reputation Bonus",
        value: `+${Math.round(reputationBonus).toLocaleString()}`,
        color: theme.colors.accent,
      },
      {
        label: "Cargo Bonus",
        value: `+${Math.round(cargoBonus).toLocaleString()}`,
        color: theme.colors.accent,
      },
      {
        label: "Route Bonus",
        value: `+${routeBonus.toLocaleString()}`,
        color: theme.colors.accent,
      },
    ];

    let rowY = spContent.y + 4;
    for (const row of breakdownRows) {
      const labelText = this.add.text(spContent.x + 8, rowY, row.label, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
      });
      scorePanel.add(labelText);

      const valueText = this.add
        .text(spContent.x + spContent.width - 8, rowY, row.value, {
          fontSize: `${theme.fonts.value.size}px`,
          fontFamily: theme.fonts.value.family,
          color: colorToString(row.color),
        })
        .setOrigin(1, 0);
      scorePanel.add(valueText);

      rowY += 32;
    }

    // Separator
    const sep = this.add
      .rectangle(
        spContent.x + 8,
        rowY + 4,
        spContent.width - 16,
        1,
        theme.colors.panelBorder,
      )
      .setOrigin(0, 0);
    scorePanel.add(sep);
    rowY += 16;

    // Total score
    const totalLabel = this.add.text(spContent.x + 8, rowY, "TOTAL SCORE", {
      fontSize: `${theme.fonts.heading.size}px`,
      fontFamily: theme.fonts.heading.family,
      color: colorToString(theme.colors.text),
    });
    scorePanel.add(totalLabel);

    const totalValue = this.add
      .text(
        spContent.x + spContent.width - 8,
        rowY,
        finalScore.toLocaleString(),
        {
          fontSize: `${theme.fonts.heading.size}px`,
          fontFamily: theme.fonts.heading.family,
          color: colorToString(theme.colors.accent),
        },
      )
      .setOrigin(1, 0);
    scorePanel.add(totalValue);

    // -----------------------------------------------------------------------
    // Save high score
    // -----------------------------------------------------------------------
    saveHighScore(state.companyName, finalScore, state.seed);

    // -----------------------------------------------------------------------
    // High score table (right side, glass panel)
    // -----------------------------------------------------------------------
    const hsPanelX = FULL_CONTENT_LEFT + 540;
    const hsPanelY = CONTENT_TOP + 90;
    const hsPanelWidth = 520;
    const hsPanelHeight = 280;

    new Panel(this, {
      x: hsPanelX,
      y: hsPanelY,
      width: hsPanelWidth,
      height: hsPanelHeight,
      title: "High Scores",
    });

    const highScores = getHighScores();

    const hsTable = new DataTable(this, {
      x: hsPanelX + 10,
      y: hsPanelY + 40,
      width: hsPanelWidth - 20,
      height: hsPanelHeight - 50,
      columns: [
        {
          key: "rank",
          label: "#",
          width: 50,
          align: "center",
        },
        {
          key: "name",
          label: "Name",
          width: 200,
        },
        {
          key: "score",
          label: "Score",
          width: 140,
          align: "right",
          format: (v) => (v as number).toLocaleString(),
          colorFn: () => theme.colors.accent,
        },
        {
          key: "seed",
          label: "Seed",
          width: 110,
          align: "right",
        },
      ],
    });

    const hsRows = highScores.map((hs, index) => ({
      rank: index + 1,
      name: hs.name,
      score: hs.score,
      seed: hs.seed,
    }));
    hsTable.setRows(hsRows);

    // -----------------------------------------------------------------------
    // Action buttons — centered horizontally below panels
    // -----------------------------------------------------------------------
    const btnWidth = 180;
    const btnHeight = 48;
    const btnY = CONTENT_TOP + CONTENT_HEIGHT - 100;

    // -----------------------------------------------------------------------
    // Rex's Reveal — the adviser reveals their true role
    // -----------------------------------------------------------------------
    if (state.adviser && !state.adviser.secretRevealed) {
      const revealMsgs = buildRevealMessages(state);
      if (revealMsgs.length > 0) {
        const revealPanel = new AdviserPanel(this, {
          x: FULL_CONTENT_LEFT,
          y: btnY - 120,
          width: GAME_WIDTH - FULL_CONTENT_LEFT * 2,
        });
        revealPanel.setDepth(150);
        revealPanel.showMessages(revealMsgs);
        gameStore.update({
          adviser: { ...state.adviser, secretRevealed: true },
        });
      }
    }

    new Button(this, {
      x: GAME_WIDTH / 2 - btnWidth - 20,
      y: btnY,
      width: btnWidth,
      height: btnHeight,
      label: "Play Again",
      onClick: () => {
        this.scene.start("MainMenuScene");
      },
    });

    new Button(this, {
      x: GAME_WIDTH / 2 + 20,
      y: btnY,
      width: btnWidth,
      height: btnHeight,
      label: "Main Menu",
      onClick: () => {
        this.scene.start("MainMenuScene");
      },
    });
  }
}

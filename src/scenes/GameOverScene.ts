import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import {
  getTheme,
  colorToString,
  Label,
  Button,
  Panel,
  DataTable,
  createStarfield,
  getLayout,
  AdviserPanel,
} from "../ui/index.ts";
import { CargoType } from "../data/types.ts";
import type { CargoType as CargoTypeT } from "../data/types.ts";
import {
  calculateScore,
  saveHighScore,
  getHighScores,
  rankCompanies,
} from "../game/scoring/ScoreCalculator.ts";
import { calculateShipValue } from "../game/fleet/FleetManager.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import { buildRevealMessages } from "../game/adviser/AdviserEngine.ts";
import { CARGO_DIVERSITY_BONUS } from "../data/constants.ts";

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
    const L = getLayout();
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
      x: L.gameWidth / 2,
      y: L.contentTop + 10,
      text: headingText,
      style: "heading",
      color: headingColor,
      glow: true,
    });
    heading.setOrigin(0.5, 0.5);
    heading.setFontSize(48);
    heading.setStroke("#000000", 3);

    // Subtitle
    const subtitleText = isVictory
      ? `Congratulations, ${state.companyName}! You survived all ${state.maxTurns} turns.`
      : `${state.companyName} has gone bankrupt after ${state.turn - 1} turns.`;
    const subtitle = new Label(this, {
      x: L.gameWidth / 2,
      y: L.contentTop + 60,
      text: subtitleText,
      style: "body",
      color: theme.colors.text,
      maxWidth: L.gameWidth - 80,
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
    const cargoTypeTotals = new Set<CargoTypeT>();
    for (const turnResult of state.history) {
      for (const ct of allCargoTypes) {
        const amount = turnResult.cargoDelivered[ct] ?? 0;
        totalCargoDelivered += amount;
        if (amount > 0) cargoTypeTotals.add(ct);
      }
    }
    const cargoBonus = totalCargoDelivered * 0.5;
    const diversityBonus = cargoTypeTotals.size * CARGO_DIVERSITY_BONUS;
    const routeBonus = state.activeRoutes.length * 500;

    // Empire bonus: count distinct empires the player trades with
    const empireIds = new Set<string>();
    for (const route of state.activeRoutes) {
      for (const sys of state.galaxy.systems) {
        if (
          route.originPlanetId.startsWith(
            `planet-${sys.id.replace("system-", "")}-`,
          ) ||
          route.destinationPlanetId.startsWith(
            `planet-${sys.id.replace("system-", "")}-`,
          )
        ) {
          empireIds.add(sys.empireId);
        }
      }
    }
    const empireBonus = empireIds.size * 1000;

    // -----------------------------------------------------------------------
    // Score breakdown panel (left side, glass panel)
    // -----------------------------------------------------------------------
    const scorePanel = new Panel(this, {
      x: L.fullContentLeft,
      y: L.contentTop + 90,
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
        label: `Diversity Bonus (${cargoTypeTotals.size} types)`,
        value: `+${diversityBonus.toLocaleString()}`,
        color: theme.colors.accent,
      },
      {
        label: "Route Bonus",
        value: `+${routeBonus.toLocaleString()}`,
        color: theme.colors.accent,
      },
      {
        label: "Empire Bonus",
        value: `+${empireBonus.toLocaleString()}`,
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
      .text(spContent.x + spContent.width - 8, rowY, "0", {
        fontSize: `${theme.fonts.heading.size}px`,
        fontFamily: theme.fonts.heading.family,
        color: colorToString(theme.colors.accent),
      })
      .setOrigin(1, 0);
    scorePanel.add(totalValue);

    // Animate score counter rolling up
    const scoreCounter = { value: 0 };
    this.tweens.add({
      targets: scoreCounter,
      value: finalScore,
      duration: 1200,
      delay: 400,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        totalValue.setText(Math.round(scoreCounter.value).toLocaleString());
      },
      onComplete: () => {
        totalValue.setText(finalScore.toLocaleString());
        this.tweens.add({
          targets: totalValue,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 150,
          yoyo: true,
          ease: "Back.easeOut",
        });
      },
    });

    // -----------------------------------------------------------------------
    // Save high score
    // -----------------------------------------------------------------------
    saveHighScore(state.companyName, finalScore, state.seed);

    // -----------------------------------------------------------------------
    // High score table (right side, glass panel)
    // -----------------------------------------------------------------------
    const hsPanelX = L.fullContentLeft + 540;
    const hsPanelY = L.contentTop + 90;
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
    // Company Rankings panel (full width below score + high score panels)
    // -----------------------------------------------------------------------
    const rankings = rankCompanies(state);
    const rankPanelY = L.contentTop + 380;
    const rankPanelHeight = 160;
    new Panel(this, {
      x: L.fullContentLeft,
      y: rankPanelY,
      width: hsPanelX + hsPanelWidth - L.fullContentLeft,
      height: rankPanelHeight,
      title: "Company Rankings",
    });

    const rankTable = new DataTable(this, {
      x: L.fullContentLeft + 10,
      y: rankPanelY + 40,
      width: hsPanelX + hsPanelWidth - L.fullContentLeft - 20,
      height: rankPanelHeight - 50,
      columns: [
        { key: "rank", label: "#", width: 50, align: "center" },
        {
          key: "name",
          label: "Company",
          width: 250,
          colorFn: (v) =>
            typeof v === "string" && v.endsWith("(You)")
              ? theme.colors.accent
              : null,
        },
        {
          key: "netWorth",
          label: "Net Worth",
          width: 150,
          align: "right",
          format: (v) => formatCash(v as number),
          colorFn: (v) =>
            (v as number) >= 0 ? theme.colors.profit : theme.colors.loss,
        },
        { key: "fleet", label: "Ships", width: 80, align: "right" },
        { key: "routes", label: "Routes", width: 80, align: "right" },
        {
          key: "score",
          label: "Score",
          width: 150,
          align: "right",
          format: (v) => (v as number).toLocaleString(),
          colorFn: () => theme.colors.accent,
        },
      ],
    });

    const rankRows = rankings.map((r, i) => ({
      rank: i + 1,
      name: r.isPlayer ? `${r.name} (You)` : r.name,
      isPlayer: r.isPlayer,
      netWorth: r.netWorth,
      fleet: r.fleetSize,
      routes: r.routeCount,
      score: r.score,
    }));
    rankTable.setRows(rankRows);

    // -----------------------------------------------------------------------
    // Action buttons — centered horizontally below panels
    // -----------------------------------------------------------------------
    const btnWidth = 180;
    const btnHeight = 48;
    const btnY = L.contentTop + L.contentHeight - 100;

    // -----------------------------------------------------------------------
    // Rex's Reveal — the adviser reveals their true role.
    //
    // High-score and ranking panels are the primary content on this screen,
    // so anchor the reveal drawer to the bottom-right (narrow, closed-by-
    // default) instead of spanning the full width where it would overlap
    // the Company Rankings table.
    // -----------------------------------------------------------------------
    if (state.adviser && !state.adviser.secretRevealed) {
      const revealMsgs = buildRevealMessages(state);
      if (revealMsgs.length > 0) {
        const revealPanelW = 220;
        const revealTabW = 36; // mirrors AdviserPanel TAB_WIDTH
        const revealX = L.gameWidth - revealPanelW - revealTabW - 12;
        const revealY = btnY - 200;
        const revealPanel = new AdviserPanel(this, {
          x: revealX,
          y: revealY,
          width: revealPanelW,
        });
        revealPanel.setDepth(150);
        revealPanel.showMessages(revealMsgs);
        gameStore.update({
          adviser: { ...state.adviser, secretRevealed: true },
        });
      }
    }

    new Button(this, {
      x: L.gameWidth / 2 - btnWidth - 20,
      y: btnY,
      width: btnWidth,
      height: btnHeight,
      label: "Play Again",
      onClick: () => {
        this.scene.start("MainMenuScene");
      },
    });

    new Button(this, {
      x: L.gameWidth / 2 + 20,
      y: btnY,
      width: btnWidth,
      height: btnHeight,
      label: "Main Menu",
      onClick: () => {
        this.scene.start("MainMenuScene");
      },
    });

    // Restart scene on resize so layout recalculates
    const onResize = () => {
      this.scene.restart();
    };
    this.scale.on("resize", onResize);
    this.events.once("shutdown", () => {
      this.scale.off("resize", onResize);
    });
  }
}

import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import {
  getTheme,
  colorToString,
  Label,
  Button,
  Panel,
  DataTable,
  ScrollFrame,
  createStarfield,
  getLayout,
  AdviserPanel,
  attachReflowHandler,
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
  return sign + "\u00A7" + abs.toLocaleString("en-US");
}

const SCORE_PANEL_WIDTH = 520;
const SCORE_PANEL_HEIGHT = 280;
const HS_PANEL_WIDTH = 520;
const HS_PANEL_HEIGHT = 280;
const HS_PANEL_X_OFFSET = 540;
const RANK_PANEL_HEIGHT = 160;
const BTN_WIDTH = 180;
const BTN_HEIGHT = 48;
const REVEAL_PANEL_WIDTH = 220;
const REVEAL_TAB_WIDTH = 36; // mirrors AdviserPanel TAB_WIDTH

export class GameOverScene extends Phaser.Scene {
  private heading!: Label;
  private subtitle!: Label;
  private scorePanel!: Panel;
  private scoreRowLabels: Phaser.GameObjects.Text[] = [];
  private scoreRowValues: Phaser.GameObjects.Text[] = [];
  private scoreSeparator!: Phaser.GameObjects.Rectangle;
  private totalLabel!: Phaser.GameObjects.Text;
  private totalValue!: Phaser.GameObjects.Text;
  private hsPanel!: Panel;
  private hsTableFrame!: ScrollFrame;
  private hsTable!: DataTable;
  private rankPanel!: Panel;
  private rankTableFrame!: ScrollFrame;
  private rankTable!: DataTable;
  private playAgainButton!: Button;
  private mainMenuButton!: Button;
  private revealPanel: AdviserPanel | null = null;

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

    this.heading = new Label(this, {
      x: L.gameWidth / 2,
      y: L.contentTop + 10,
      text: headingText,
      style: "heading",
      color: headingColor,
      glow: true,
    });
    this.heading.setOrigin(0.5, 0.5);
    this.heading.setFontSize(48);
    this.heading.setStroke("#000000", 3);

    // Subtitle
    const subtitleText = isVictory
      ? `Congratulations, ${state.companyName}! You survived all ${state.maxTurns} turns.`
      : `${state.companyName} has gone bankrupt after ${state.turn - 1} turns.`;
    this.subtitle = new Label(this, {
      x: L.gameWidth / 2,
      y: L.contentTop + 60,
      text: subtitleText,
      style: "body",
      color: theme.colors.text,
      maxWidth: L.gameWidth - 80,
    });
    this.subtitle.setOrigin(0.5, 0);

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
    this.scorePanel = new Panel(this, {
      x: L.fullContentLeft,
      y: L.contentTop + 90,
      width: SCORE_PANEL_WIDTH,
      height: SCORE_PANEL_HEIGHT,
      title: "Score Breakdown",
    });

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
        value: `+${Math.round(reputationBonus).toLocaleString("en-US")}`,
        color: theme.colors.accent,
      },
      {
        label: "Cargo Bonus",
        value: `+${Math.round(cargoBonus).toLocaleString("en-US")}`,
        color: theme.colors.accent,
      },
      {
        label: `Diversity Bonus (${cargoTypeTotals.size} types)`,
        value: `+${diversityBonus.toLocaleString("en-US")}`,
        color: theme.colors.accent,
      },
      {
        label: "Route Bonus",
        value: `+${routeBonus.toLocaleString("en-US")}`,
        color: theme.colors.accent,
      },
      {
        label: "Empire Bonus",
        value: `+${empireBonus.toLocaleString("en-US")}`,
        color: theme.colors.accent,
      },
    ];

    for (const row of breakdownRows) {
      const labelText = this.add.text(0, 0, row.label, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
      });
      this.scorePanel.add(labelText);
      this.scoreRowLabels.push(labelText);

      const valueText = this.add
        .text(0, 0, row.value, {
          fontSize: `${theme.fonts.value.size}px`,
          fontFamily: theme.fonts.value.family,
          color: colorToString(row.color),
        })
        .setOrigin(1, 0);
      this.scorePanel.add(valueText);
      this.scoreRowValues.push(valueText);
    }

    // Separator
    this.scoreSeparator = this.add
      .rectangle(0, 0, 1, 1, theme.colors.panelBorder)
      .setOrigin(0, 0);
    this.scorePanel.add(this.scoreSeparator);

    // Total score
    this.totalLabel = this.add.text(0, 0, "TOTAL SCORE", {
      fontSize: `${theme.fonts.heading.size}px`,
      fontFamily: theme.fonts.heading.family,
      color: colorToString(theme.colors.text),
    });
    this.scorePanel.add(this.totalLabel);

    this.totalValue = this.add
      .text(0, 0, "0", {
        fontSize: `${theme.fonts.heading.size}px`,
        fontFamily: theme.fonts.heading.family,
        color: colorToString(theme.colors.accent),
      })
      .setOrigin(1, 0);
    this.scorePanel.add(this.totalValue);

    // Animate score counter rolling up
    const scoreCounter = { value: 0 };
    this.tweens.add({
      targets: scoreCounter,
      value: finalScore,
      duration: 1200,
      delay: 400,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        this.totalValue.setText(
          Math.round(scoreCounter.value).toLocaleString("en-US"),
        );
      },
      onComplete: () => {
        this.totalValue.setText(finalScore.toLocaleString("en-US"));
        this.tweens.add({
          targets: this.totalValue,
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
    const hsPanelX = L.fullContentLeft + HS_PANEL_X_OFFSET;
    const hsPanelY = L.contentTop + 90;

    this.hsPanel = new Panel(this, {
      x: hsPanelX,
      y: hsPanelY,
      width: HS_PANEL_WIDTH,
      height: HS_PANEL_HEIGHT,
      title: "High Scores",
    });

    const highScores = getHighScores();

    this.hsTableFrame = new ScrollFrame(this, {
      x: hsPanelX + 10,
      y: hsPanelY + 40,
      width: HS_PANEL_WIDTH - 20,
      height: HS_PANEL_HEIGHT - 50,
    });
    this.hsTable = new DataTable(this, {
      x: 0,
      y: 0,
      width: HS_PANEL_WIDTH - 20,
      height: HS_PANEL_HEIGHT - 50,
      contentSized: true,
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
          format: (v) => (v as number).toLocaleString("en-US"),
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
    this.hsTableFrame.setContent(this.hsTable);
    this.hsTable.setRows(hsRows);

    // -----------------------------------------------------------------------
    // Company Rankings panel (full width below score + high score panels)
    // -----------------------------------------------------------------------
    const rankings = rankCompanies(state);
    const rankPanelY = L.contentTop + 380;
    const rankPanelWidth = hsPanelX + HS_PANEL_WIDTH - L.fullContentLeft;
    this.rankPanel = new Panel(this, {
      x: L.fullContentLeft,
      y: rankPanelY,
      width: rankPanelWidth,
      height: RANK_PANEL_HEIGHT,
      title: "Company Rankings",
    });

    this.rankTableFrame = new ScrollFrame(this, {
      x: L.fullContentLeft + 10,
      y: rankPanelY + 40,
      width: rankPanelWidth - 20,
      height: RANK_PANEL_HEIGHT - 50,
    });
    this.rankTable = new DataTable(this, {
      x: 0,
      y: 0,
      width: rankPanelWidth - 20,
      height: RANK_PANEL_HEIGHT - 50,
      contentSized: true,
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
          format: (v) => (v as number).toLocaleString("en-US"),
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
    this.rankTableFrame.setContent(this.rankTable);
    this.rankTable.setRows(rankRows);

    // -----------------------------------------------------------------------
    // Action buttons — centered horizontally below panels
    // -----------------------------------------------------------------------
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
        const revealX =
          L.gameWidth - REVEAL_PANEL_WIDTH - REVEAL_TAB_WIDTH - 12;
        const revealY = btnY - 200;
        this.revealPanel = new AdviserPanel(this, {
          x: revealX,
          y: revealY,
          width: REVEAL_PANEL_WIDTH,
        });
        this.revealPanel.setDepth(150);
        this.revealPanel.showMessages(revealMsgs);
        gameStore.update({
          adviser: { ...state.adviser, secretRevealed: true },
        });
      }
    }

    this.playAgainButton = new Button(this, {
      x: L.gameWidth / 2 - BTN_WIDTH - 20,
      y: btnY,
      width: BTN_WIDTH,
      height: BTN_HEIGHT,
      label: "Play Again",
      onClick: () => {
        this.scene.start("MainMenuScene");
      },
    });

    this.mainMenuButton = new Button(this, {
      x: L.gameWidth / 2 + 20,
      y: btnY,
      width: BTN_WIDTH,
      height: BTN_HEIGHT,
      label: "Main Menu",
      onClick: () => {
        this.scene.start("MainMenuScene");
      },
    });

    this.relayout();
    attachReflowHandler(this, () => this.relayout());
  }

  private relayout(): void {
    const L = getLayout();

    // Heading + subtitle
    this.heading.setPosition(L.gameWidth / 2, L.contentTop + 10);
    this.subtitle.setPosition(L.gameWidth / 2, L.contentTop + 60);
    this.subtitle.setWordWrapWidth(L.gameWidth - 80);

    // Score breakdown panel
    this.scorePanel.setPosition(L.fullContentLeft, L.contentTop + 90);
    this.scorePanel.setSize(SCORE_PANEL_WIDTH, SCORE_PANEL_HEIGHT);
    const spContent = this.scorePanel.getContentArea();

    let rowY = spContent.y + 4;
    for (let i = 0; i < this.scoreRowLabels.length; i++) {
      this.scoreRowLabels[i]!.setPosition(spContent.x + 8, rowY);
      this.scoreRowValues[i]!.setPosition(
        spContent.x + spContent.width - 8,
        rowY,
      );
      rowY += 32;
    }

    // Separator
    this.scoreSeparator.setPosition(spContent.x + 8, rowY + 4);
    this.scoreSeparator.setSize(spContent.width - 16, 1);
    rowY += 16;

    // Total
    this.totalLabel.setPosition(spContent.x + 8, rowY);
    this.totalValue.setPosition(spContent.x + spContent.width - 8, rowY);

    // High score panel
    const hsPanelX = L.fullContentLeft + HS_PANEL_X_OFFSET;
    const hsPanelY = L.contentTop + 90;
    this.hsPanel.setPosition(hsPanelX, hsPanelY);
    this.hsPanel.setSize(HS_PANEL_WIDTH, HS_PANEL_HEIGHT);

    this.hsTableFrame.setPosition(hsPanelX + 10, hsPanelY + 40);
    this.hsTableFrame.setSize(HS_PANEL_WIDTH - 20, HS_PANEL_HEIGHT - 50);
    this.hsTable.setSize(HS_PANEL_WIDTH - 20, HS_PANEL_HEIGHT - 50);

    // Rankings panel
    const rankPanelY = L.contentTop + 380;
    const rankPanelWidth = hsPanelX + HS_PANEL_WIDTH - L.fullContentLeft;
    this.rankPanel.setPosition(L.fullContentLeft, rankPanelY);
    this.rankPanel.setSize(rankPanelWidth, RANK_PANEL_HEIGHT);

    this.rankTableFrame.setPosition(L.fullContentLeft + 10, rankPanelY + 40);
    this.rankTableFrame.setSize(rankPanelWidth - 20, RANK_PANEL_HEIGHT - 50);
    this.rankTable.setSize(rankPanelWidth - 20, RANK_PANEL_HEIGHT - 50);

    // Action buttons
    const btnY = L.contentTop + L.contentHeight - 100;
    this.playAgainButton.setPosition(L.gameWidth / 2 - BTN_WIDTH - 20, btnY);
    this.mainMenuButton.setPosition(L.gameWidth / 2 + 20, btnY);

    // Adviser reveal panel — reposition + reflow internal width. Pass
    // height=0 to keep AdviserPanel's content-driven internal panelHeight.
    if (this.revealPanel) {
      const revealX = L.gameWidth - REVEAL_PANEL_WIDTH - REVEAL_TAB_WIDTH - 12;
      const revealY = btnY - 200;
      this.revealPanel.setPosition(revealX, revealY);
      this.revealPanel.setSize(REVEAL_PANEL_WIDTH, 0);
    }
  }
}

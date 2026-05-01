import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import {
  getTheme,
  colorToString,
  Panel,
  Button,
  DataTable,
  ScrollFrame,
  PortraitPanel,
  createStarfield,
  MilestoneOverlay,
  getLayout,
  attachReflowHandler,
} from "../ui/index.ts";
import { autoSave } from "../game/SaveManager.ts";
import type { TurnResult } from "../data/types.ts";
import type { GameHUDScene } from "./GameHUDScene.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import { setGalaxy3DVisible } from "./galaxy3d/GalaxyView3D.ts";

function formatCash(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(Math.round(amount));
  return sign + "\u00A7" + abs.toLocaleString("en-US");
}

/** Grade the turn: S/A/B/C/D/F based on net-profit margin. */
function getTurnGrade(
  netProfit: number,
  revenue: number,
): { grade: string; color: number } {
  const theme = getTheme();
  const margin = revenue > 0 ? netProfit / revenue : netProfit >= 0 ? 1 : -1;
  if (margin >= 0.4) return { grade: "S", color: theme.colors.accent };
  if (margin >= 0.2) return { grade: "A", color: theme.colors.profit };
  if (margin >= 0.05) return { grade: "B", color: theme.colors.accentHover };
  if (margin >= 0) return { grade: "C", color: theme.colors.textDim };
  if (margin >= -0.15) return { grade: "D", color: theme.colors.warning };
  return { grade: "F", color: theme.colors.loss };
}

// Layout constants — see original commit for derivation rationale. The
// numbers are reused inside relayout() so we declare them at module scope.
const TR_GAP = 8;
const TR_PL_H = 220;
const TR_ROUTE_H = 152;
const TR_AI_H = 152;
const TR_BOTTOM_H = 72;
const TR_PL_ROW_GAP = 20;

export class TurnReportScene extends Phaser.Scene {
  // Backdrop + structural panels.
  private backdrop?: Phaser.GameObjects.Rectangle;
  private portrait?: PortraitPanel;
  private plPanel?: Panel;
  private routePanel?: Panel;
  private routeTableFrame?: ScrollFrame;
  private routeTable?: DataTable;
  private aiPanel?: Panel;
  private aiTableFrame?: ScrollFrame;
  private aiTable?: DataTable;
  private marketPanel?: Panel;
  private fuelLabel?: Phaser.GameObjects.Text;
  private summaryLabel?: Phaser.GameObjects.Text;
  private dipPanel?: Panel;
  private dipPanelHeight = 0;
  private dipLines: Phaser.GameObjects.Text[] = [];
  private dipLineHeight = 18;

  // P&L panel children (panel-relative coordinates).
  private plLabelTexts: Phaser.GameObjects.Text[] = [];
  private plValueTexts: Phaser.GameObjects.Text[] = [];
  private plRowYs: number[] = [];
  private plSepLine?: Phaser.GameObjects.Rectangle;
  private plSepY = 0;
  private plNetLabel?: Phaser.GameObjects.Text;
  private plNetValue?: Phaser.GameObjects.Text;
  private plNetRowY = 0;
  private plGradeLabel?: Phaser.GameObjects.Text;
  private plStreakBadge?: Phaser.GameObjects.Text;
  private plStreakRowY = 0;

  // Game-over button.
  private resultsButton?: Button;

  constructor() {
    super({ key: "TurnReportScene" });
  }

  create(): void {
    const L = getLayout();
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

    // Hide any active 3D galaxy/system canvas at the DOM level. Phaser-side
    // backdrops cannot occlude the Three.js canvas (zIndex 2 > Phaser zIndex
    // 0), so a Phaser opaque rectangle alone is insufficient. Restored on
    // shutdown so the next content scene (GalaxyMapScene) is visible again.
    setGalaxy3DVisible(false);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      setGalaxy3DVisible(true);
    });

    // Opaque scene backdrop — defensive backup if the DOM hide is bypassed.
    this.backdrop = this.add
      .rectangle(0, 0, L.gameWidth, L.gameHeight, theme.colors.background, 1)
      .setOrigin(0, 0)
      .setDepth(-200);

    // Starfield background
    createStarfield(this);

    // -----------------------------------------------------------------------
    // Left sidebar — PortraitPanel with turn summary
    // -----------------------------------------------------------------------
    const totalCosts =
      lastTurn.fuelCosts +
      lastTurn.maintenanceCosts +
      lastTurn.loanPayments +
      lastTurn.tariffCosts +
      lastTurn.otherCosts;
    const quarter = ((lastTurn.turn - 1) % 4) + 1;
    const year = Math.ceil(lastTurn.turn / 4);
    const netColor =
      lastTurn.netProfit >= 0 ? theme.colors.profit : theme.colors.loss;

    this.portrait = new PortraitPanel(this, {
      x: L.sidebarLeft,
      y: L.contentTop,
      width: L.sidebarWidth,
      height: L.contentHeight,
    });
    this.portrait.updatePortrait(
      "event",
      lastTurn.turn,
      "Quarter Complete",
      [
        { label: "Period", value: `Q${quarter} Y${year}` },
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
    this.plPanel = new Panel(this, {
      x: L.mainContentLeft,
      y: L.contentTop,
      width: L.mainContentWidth,
      height: TR_PL_H,
      title: "Quarter Summary",
    });
    const plContent = this.plPanel.getContentArea();

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

    // Add tariff row if any tariffs were paid
    if (lastTurn.tariffCosts > 0) {
      plRows.push({
        label: "Border Tariffs",
        value: formatCash(-lastTurn.tariffCosts),
        color: theme.colors.loss,
      });
    }

    // Add hub & other costs row if any
    if (lastTurn.otherCosts > 0) {
      plRows.push({
        label: "Hub & Other",
        value: formatCash(-lastTurn.otherCosts),
        color: theme.colors.loss,
      });
    }

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
      this.plPanel.add(labelText);
      this.plLabelTexts.push(labelText);

      const valueText = this.add
        .text(plContent.x + plContent.width - 8, rowY, row.value, {
          fontSize: `${theme.fonts.value.size}px`,
          fontFamily: theme.fonts.value.family,
          color: colorToString(row.color),
        })
        .setOrigin(1, 0)
        .setAlpha(0);
      this.plPanel.add(valueText);
      this.plValueTexts.push(valueText);
      this.plRowYs.push(rowY);

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

      rowY += TR_PL_ROW_GAP;
    }

    // Separator line
    this.plSepY = rowY + 4;
    this.plSepLine = this.add
      .rectangle(
        plContent.x + 8,
        this.plSepY,
        plContent.width - 16,
        1,
        theme.colors.panelBorder,
      )
      .setAlpha(0.5)
      .setOrigin(0, 0.5);
    this.plPanel.add(this.plSepLine);
    rowY += 12;

    // Net profit row — animated counter
    this.plNetRowY = rowY;
    const plNetColor =
      lastTurn.netProfit >= 0 ? theme.colors.profit : theme.colors.loss;
    this.plNetLabel = this.add
      .text(plContent.x + 8, rowY, "Net Profit", {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
      })
      .setAlpha(0);
    this.plPanel.add(this.plNetLabel);

    this.plNetValue = this.add
      .text(plContent.x + plContent.width - 8, rowY, formatCash(0), {
        fontSize: `${theme.fonts.value.size}px`,
        fontFamily: theme.fonts.value.family,
        color: colorToString(plNetColor),
      })
      .setOrigin(1, 0)
      .setAlpha(0);
    this.plPanel.add(this.plNetValue);
    const netValue = this.plNetValue;

    // Fade in the net row after the P&L rows have appeared
    const netRevealDelay = plRows.length * 90 + 80;
    this.tweens.add({
      targets: [this.plNetLabel, netValue],
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
    // Lives in the panel title bar (top-right) so it never overlaps P&L rows.
    const { grade, color: gradeColor } = getTurnGrade(
      lastTurn.netProfit,
      lastTurn.revenue,
    );
    const titleBarH = theme.panel.titleHeight;
    this.plGradeLabel = this.add
      .text(L.mainContentWidth - theme.spacing.md, titleBarH / 2, grade, {
        fontSize: "24px",
        fontFamily: theme.fonts.heading.family,
        fontStyle: "bold",
        color: "#" + gradeColor.toString(16).padStart(6, "0"),
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setOrigin(1, 0.5)
      .setAlpha(0)
      .setScale(1.5);
    this.plPanel.add(this.plGradeLabel);
    this.tweens.add({
      targets: this.plGradeLabel,
      alpha: 0.85,
      scaleX: 1,
      scaleY: 1,
      duration: 320,
      delay: netRevealDelay + 700,
      ease: "Back.easeOut",
    });

    // ── Streak badge ───────────────────────────────────────────────────────
    // Sits below the Net Profit row so the fire emoji can't overlap the cash
    // value. TR_PL_H bumped to 220 to make room.
    const streakTurns = state.storyteller.consecutiveProfitTurns;
    if (streakTurns >= 2) {
      const streakText = `\uD83D\uDD25 ${streakTurns}-Turn Streak!`;
      this.plStreakRowY = rowY + theme.fonts.value.size + 8;
      this.plStreakBadge = this.add
        .text(
          plContent.x + plContent.width / 2,
          this.plStreakRowY,
          streakText,
          {
            fontSize: `${theme.fonts.caption.size}px`,
            fontFamily: theme.fonts.caption.family,
            color: colorToString(theme.colors.accent),
            stroke: "#000000",
            strokeThickness: 2,
          },
        )
        .setOrigin(0.5, 0)
        .setAlpha(0);
      this.plPanel.add(this.plStreakBadge);
      this.tweens.add({
        targets: this.plStreakBadge,
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
            "+" +
              "\u00A7" +
              Math.round(lastTurn.netProfit).toLocaleString("en-US"),
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

    const routeY = L.contentTop + TR_PL_H + TR_GAP;
    this.routePanel = new Panel(this, {
      x: L.mainContentLeft,
      y: routeY,
      width: L.mainContentWidth,
      height: TR_ROUTE_H,
      title: "Top Routes",
    });

    this.routeTableFrame = new ScrollFrame(this, {
      x: L.mainContentLeft + 10,
      y: routeY + 38,
      width: L.mainContentWidth - 20,
      height: TR_ROUTE_H - 44,
    });
    this.routeTable = new DataTable(this, {
      x: 0,
      y: 0,
      width: L.mainContentWidth - 20,
      height: TR_ROUTE_H - 44,
      contentSized: true,
      columns: [
        {
          key: "route",
          label: "Route",
          width: 280,
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
          width: 180,
          align: "right",
          format: (v) => formatCash(v as number),
          colorFn: () => theme.colors.profit,
        },
        {
          key: "margin",
          label: "Margin",
          width: 170,
          align: "right",
          format: (v) => formatCash(v as number),
          colorFn: (v) =>
            (v as number) >= 0 ? theme.colors.profit : theme.colors.loss,
        },
      ],
    });

    // Top-routes panel is ~60px of content — show the best two so the rows
    // don't overflow into "Rival Snapshot" below.
    const routeRows = routePerf
      .map((rp) => ({
        route: routeLabelMap.get(rp.routeId) ?? rp.routeId,
        trips: rp.trips,
        revenue: rp.revenue,
        margin: rp.revenue - rp.fuelCost,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 2);
    this.routeTableFrame.setContent(this.routeTable);
    this.routeTable.setRows(routeRows);

    // -----------------------------------------------------------------------
    // AI Rivals Summary (below route performance)
    // -----------------------------------------------------------------------
    const aiSummaries = lastTurn.aiSummaries ?? [];
    const aiY = routeY + TR_ROUTE_H + TR_GAP;
    if (aiSummaries.length > 0) {
      this.aiPanel = new Panel(this, {
        x: L.mainContentLeft,
        y: aiY,
        width: L.mainContentWidth,
        height: TR_AI_H,
        title: "Rival Snapshot",
      });

      this.aiTableFrame = new ScrollFrame(this, {
        x: L.mainContentLeft + 10,
        y: aiY + 38,
        width: L.mainContentWidth - 20,
        height: TR_AI_H - 44,
      });
      this.aiTable = new DataTable(this, {
        x: 0,
        y: 0,
        width: L.mainContentWidth - 20,
        height: TR_AI_H - 44,
        contentSized: true,
        columns: [
          { key: "name", label: "Company", width: 300 },
          {
            key: "cash",
            label: "Cash",
            width: 180,
            align: "right",
            format: (v) => formatCash(v as number),
          },
          {
            key: "routes",
            label: "Routes",
            width: 100,
            align: "right",
          },
          {
            key: "status",
            label: "Status",
            width: 160,
          },
        ],
      });

      // Cap visible rivals to what physically fits inside TR_AI_H (~42px of
      // content). Earlier code requested 5 rows and they spilled into the
      // Market Changes panel below (QA: "End of Turn Summary Clutter").
      const aiRows = aiSummaries
        .map((s) => ({
          name: s.companyName,
          cash: s.cashAtEnd,
          routes: s.routeCount,
          status: s.bankrupt ? "BANKRUPT" : "Active",
        }))
        .sort((a, b) => b.cash - a.cash)
        .slice(0, 2);
      this.aiTableFrame.setContent(this.aiTable);
      this.aiTable.setRows(aiRows);
    }

    // -----------------------------------------------------------------------
    // Bottom row: Market Changes (full width — ticker moved to global HUD)
    // -----------------------------------------------------------------------
    const bottomY = aiSummaries.length > 0 ? aiY + TR_AI_H + TR_GAP : aiY;

    this.marketPanel = new Panel(this, {
      x: L.mainContentLeft,
      y: bottomY,
      width: L.mainContentWidth,
      height: TR_BOTTOM_H,
      title: "Market Changes",
    });
    const mpContent = this.marketPanel.getContentArea();

    // Fuel price (left) + cargo/passenger totals as a single inline summary
    // line (right). Earlier the cargo grid + passengers stretched the panel
    // beyond its 72px height — they now condense into a single caption that
    // fits the available content area.
    const fuelText = `Fuel price: ${formatCash(state.market.fuelPrice)} (${state.market.fuelTrend})`;
    this.fuelLabel = this.add.text(mpContent.x + 8, mpContent.y + 4, fuelText, {
      fontSize: `${theme.fonts.body.size}px`,
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.text),
    });
    this.marketPanel.add(this.fuelLabel);

    const cargoEntries = Object.entries(lastTurn.cargoDelivered)
      .filter(([, amount]) => amount > 0)
      .sort((a, b) => (b[1] as number) - (a[1] as number));
    const totalCargo = cargoEntries.reduce(
      (acc, [, amount]) => acc + (amount as number),
      0,
    );
    const summaryParts: string[] = [];
    if (totalCargo > 0) {
      const top = cargoEntries
        .slice(0, 2)
        .map(([t, a]) => `${t}: ${(a as number).toLocaleString("en-US")}`)
        .join(" · ");
      summaryParts.push(`Cargo ${totalCargo.toLocaleString("en-US")} (${top})`);
    }
    if (lastTurn.passengersTransported > 0) {
      summaryParts.push(
        `Pax ${lastTurn.passengersTransported.toLocaleString("en-US")}`,
      );
    }
    if (summaryParts.length > 0) {
      this.summaryLabel = this.add.text(
        mpContent.x + mpContent.width - 8,
        mpContent.y + 4,
        summaryParts.join("  ·  "),
        {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
        },
      );
      this.summaryLabel.setOrigin(1, 0);
      this.marketPanel.add(this.summaryLabel);
    }

    // -----------------------------------------------------------------------
    // Diplomatic Activity (renders only when the simulator produced digest
    // entries this turn). Wave 1 surfaces a simple bulleted list; richer
    // formatting (icons, click-throughs to standing changes) ships in wave 2.
    // -----------------------------------------------------------------------
    const diplomacyDigest = state.turnReport?.diplomacyDigest ?? [];
    if (diplomacyDigest.length > 0) {
      this.dipLineHeight = 18;
      this.dipPanelHeight = Math.max(
        56,
        38 + diplomacyDigest.length * this.dipLineHeight + 8,
      );
      const dipY = bottomY + TR_BOTTOM_H + TR_GAP;
      this.dipPanel = new Panel(this, {
        x: L.mainContentLeft,
        y: dipY,
        width: L.mainContentWidth,
        height: this.dipPanelHeight,
        title: "Diplomatic Activity",
      });
      const dipPanel = this.dipPanel;
      const dipContent = dipPanel.getContentArea();
      diplomacyDigest.forEach((line, idx) => {
        const lineLabel = this.add.text(
          dipContent.x + 8,
          dipContent.y + 4 + idx * this.dipLineHeight,
          `• ${line}`,
          {
            fontSize: `${theme.fonts.body.size}px`,
            fontFamily: theme.fonts.body.family,
            color: colorToString(theme.colors.text),
          },
        );
        dipPanel.add(lineLabel);
        this.dipLines.push(lineLabel);
      });
    }

    // -----------------------------------------------------------------------
    // Quarter summary is non-blocking — players can navigate freely while it
    // is open, and the persistent End Quarter button in the HUD advances the
    // turn when they're ready. The only forced flow is GameOver.
    // -----------------------------------------------------------------------
    if (state.gameOver) {
      const btnY = bottomY + TR_BOTTOM_H + TR_GAP;
      this.resultsButton = new Button(this, {
        x: L.gameWidth / 2 - 80,
        y: btnY,
        width: 160,
        height: 40,
        label: "View Results",
        onClick: () => {
          this.scene.start("GameOverScene");
        },
      });
    } else {
      // Ensure the rest of the HUD is unlocked for browsing.
      if (state.phase !== "planning") {
        gameStore.update({ phase: "planning" });
      }
    }

    this.relayout();
    attachReflowHandler(this, () => this.relayout());
  }

  private relayout(): void {
    const L = getLayout();
    const theme = getTheme();

    // Backdrop covers the full canvas.
    this.backdrop?.setPosition(0, 0).setSize(L.gameWidth, L.gameHeight);

    // Note: createStarfield builds particle emitters sized to the canvas
    // at create() time; emitters cannot be resized in place. Out of scope
    // for the sub-widget setSize pass.

    // Sidebar portrait — setPosition before setSize.
    this.portrait?.setPosition(L.sidebarLeft, L.contentTop);
    this.portrait?.setSize(L.sidebarWidth, L.contentHeight);

    // P&L panel.
    if (this.plPanel) {
      this.plPanel.setPosition(L.mainContentLeft, L.contentTop);
      this.plPanel.setSize(L.mainContentWidth, TR_PL_H);
      const plContent = this.plPanel.getContentArea();

      // Reposition row label/value pairs (panel-relative coords).
      for (let i = 0; i < this.plLabelTexts.length; i++) {
        const y = this.plRowYs[i];
        this.plLabelTexts[i].setPosition(plContent.x + 8, y);
        this.plValueTexts[i].setPosition(plContent.x + plContent.width - 8, y);
      }

      // Separator line — re-anchor x and stretch to new content width.
      this.plSepLine?.setPosition(plContent.x + 8, this.plSepY);
      this.plSepLine?.setSize(plContent.width - 16, 1);

      // Net profit row.
      this.plNetLabel?.setPosition(plContent.x + 8, this.plNetRowY);
      this.plNetValue?.setPosition(
        plContent.x + plContent.width - 8,
        this.plNetRowY,
      );

      // Grade badge sits in the panel title bar (panel-relative coords).
      this.plGradeLabel?.setPosition(
        L.mainContentWidth - theme.spacing.md,
        theme.panel.titleHeight / 2,
      );

      // Streak badge centered on content.
      this.plStreakBadge?.setPosition(
        plContent.x + plContent.width / 2,
        this.plStreakRowY,
      );
    }

    // Top Routes panel + table.
    const routeY = L.contentTop + TR_PL_H + TR_GAP;
    if (this.routePanel) {
      this.routePanel.setPosition(L.mainContentLeft, routeY);
      this.routePanel.setSize(L.mainContentWidth, TR_ROUTE_H);
    }
    if (this.routeTableFrame) {
      this.routeTableFrame.setPosition(L.mainContentLeft + 10, routeY + 38);
      this.routeTableFrame.setSize(L.mainContentWidth - 20, TR_ROUTE_H - 44);
    }
    this.routeTable?.setSize(L.mainContentWidth - 20, TR_ROUTE_H - 44);

    // Rival Snapshot panel + table (optional).
    const aiY = routeY + TR_ROUTE_H + TR_GAP;
    if (this.aiPanel) {
      this.aiPanel.setPosition(L.mainContentLeft, aiY);
      this.aiPanel.setSize(L.mainContentWidth, TR_AI_H);
    }
    if (this.aiTableFrame) {
      this.aiTableFrame.setPosition(L.mainContentLeft + 10, aiY + 38);
      this.aiTableFrame.setSize(L.mainContentWidth - 20, TR_AI_H - 44);
    }
    this.aiTable?.setSize(L.mainContentWidth - 20, TR_AI_H - 44);

    // Market Changes panel.
    const bottomY = this.aiPanel ? aiY + TR_AI_H + TR_GAP : aiY;
    if (this.marketPanel) {
      this.marketPanel.setPosition(L.mainContentLeft, bottomY);
      this.marketPanel.setSize(L.mainContentWidth, TR_BOTTOM_H);
      const mpContent = this.marketPanel.getContentArea();
      this.fuelLabel?.setPosition(mpContent.x + 8, mpContent.y + 4);
      this.summaryLabel?.setPosition(
        mpContent.x + mpContent.width - 8,
        mpContent.y + 4,
      );
    }

    // Diplomatic Activity panel (optional).
    if (this.dipPanel) {
      const dipY = bottomY + TR_BOTTOM_H + TR_GAP;
      this.dipPanel.setPosition(L.mainContentLeft, dipY);
      this.dipPanel.setSize(L.mainContentWidth, this.dipPanelHeight);
      const dipContent = this.dipPanel.getContentArea();
      for (let i = 0; i < this.dipLines.length; i++) {
        this.dipLines[i].setPosition(
          dipContent.x + 8,
          dipContent.y + 4 + i * this.dipLineHeight,
        );
      }
    }

    // Game-over button.
    if (this.resultsButton) {
      const btnY = bottomY + TR_BOTTOM_H + TR_GAP;
      this.resultsButton.setPosition(L.gameWidth / 2 - 80, btnY);
    }
  }
}

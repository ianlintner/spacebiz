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

export class TurnReportScene extends Phaser.Scene {
  constructor() {
    super({ key: "TurnReportScene" });
  }

  create(): void {
    const L = getLayout();
    const theme = getTheme();
    const state = gameStore.getState();
    getAudioDirector().setMusicState("report");

    // Flow constants: budget = contentHeight (592px) − 3 × TR_GAP (24px) = 568px.
    // Panel chrome (title bar 36 + bottom padding 8 + content top padding 8 = 52);
    // DataTable header is 36px and each row 32px. Earlier sizes (104/86/132)
    // could not fit even a single row + header inside their panel, so rows
    // overflowed and visibly collided with the next section's title (e.g.
    // "Deep Freight Lines §105,222 2 Active" landing on top of "Market
    // Changes"). Current sizes:
    //   - PL Panel:    192 → 140 content, fits 5 rows × 20 + separator + net.
    //                  PL row spacing was tightened from 28 → 20 below.
    //   - Top Routes:  152 → 100 content = header 36 + 2 rows × 32 exactly.
    //   - Rival Snap:  152 → 100 content = header 36 + 2 rows × 32 exactly.
    //   - Market:       72 →  20 content, fuel-price line only (cargo +
    //                  passengers detail moved to the global ticker).
    const TR_GAP = 8;
    const TR_PL_H = 220;
    const TR_ROUTE_H = 152;
    const TR_AI_H = 152;
    const TR_BOTTOM_H = 72;
    const TR_ROUTE_Y = L.contentTop + TR_PL_H + TR_GAP;
    const TR_AI_Y = TR_ROUTE_Y + TR_ROUTE_H + TR_GAP;
    const TR_PL_ROW_GAP = 20; // tightened from 28 so 5 rows + separator + net fit

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
    this.add
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

    const portrait = new PortraitPanel(this, {
      x: L.sidebarLeft,
      y: L.contentTop,
      width: L.sidebarWidth,
      height: L.contentHeight,
    });
    portrait.updatePortrait(
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
    const plPanel = new Panel(this, {
      x: L.mainContentLeft,
      y: L.contentTop,
      width: L.mainContentWidth,
      height: TR_PL_H,
      title: "Quarter Summary",
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

      rowY += TR_PL_ROW_GAP;
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
      .setAlpha(0.5);
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
    // Lives in the panel title bar (top-right) so it never overlaps P&L rows.
    const { grade, color: gradeColor } = getTurnGrade(
      lastTurn.netProfit,
      lastTurn.revenue,
    );
    const titleBarH = theme.panel.titleHeight;
    const gradeLabel = this.add
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
    // Sits below the Net Profit row so the fire emoji can't overlap the cash
    // value. TR_PL_H bumped to 220 to make room.
    const streakTurns = state.storyteller.consecutiveProfitTurns;
    if (streakTurns >= 2) {
      const streakText = `\uD83D\uDD25 ${streakTurns}-Turn Streak!`;
      const streakBadge = this.add
        .text(
          plContent.x + plContent.width / 2,
          rowY + theme.fonts.value.size + 8,
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

    new Panel(this, {
      x: L.mainContentLeft,
      y: TR_ROUTE_Y,
      width: L.mainContentWidth,
      height: TR_ROUTE_H,
      title: "Top Routes",
    });

    const routeTableFrame = new ScrollFrame(this, {
      x: L.mainContentLeft + 10,
      y: TR_ROUTE_Y + 38,
      width: L.mainContentWidth - 20,
      height: TR_ROUTE_H - 44,
    });
    const routeTable = new DataTable(this, {
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
    routeTableFrame.setContent(routeTable);
    routeTable.setRows(routeRows);

    // -----------------------------------------------------------------------
    // AI Rivals Summary (below route performance)
    // -----------------------------------------------------------------------
    const aiSummaries = lastTurn.aiSummaries ?? [];
    if (aiSummaries.length > 0) {
      new Panel(this, {
        x: L.mainContentLeft,
        y: TR_AI_Y,
        width: L.mainContentWidth,
        height: TR_AI_H,
        title: "Rival Snapshot",
      });

      const aiTableFrame = new ScrollFrame(this, {
        x: L.mainContentLeft + 10,
        y: TR_AI_Y + 38,
        width: L.mainContentWidth - 20,
        height: TR_AI_H - 44,
      });
      const aiTable = new DataTable(this, {
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
      aiTableFrame.setContent(aiTable);
      aiTable.setRows(aiRows);
    }

    // -----------------------------------------------------------------------
    // Bottom row: Market Changes (full width — ticker moved to global HUD)
    // -----------------------------------------------------------------------
    const bottomY =
      aiSummaries.length > 0 ? TR_AI_Y + TR_AI_H + TR_GAP : TR_AI_Y;

    const marketPanel = new Panel(this, {
      x: L.mainContentLeft,
      y: bottomY,
      width: L.mainContentWidth,
      height: TR_BOTTOM_H,
      title: "Market Changes",
    });
    const mpContent = marketPanel.getContentArea();

    // Fuel price (left) + cargo/passenger totals as a single inline summary
    // line (right). Earlier the cargo grid + passengers stretched the panel
    // beyond its 72px height — they now condense into a single caption that
    // fits the available content area.
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
      const summaryLabel = this.add.text(
        mpContent.x + mpContent.width - 8,
        mpContent.y + 4,
        summaryParts.join("  ·  "),
        {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
        },
      );
      summaryLabel.setOrigin(1, 0);
      marketPanel.add(summaryLabel);
    }

    // -----------------------------------------------------------------------
    // Quarter summary is non-blocking — players can navigate freely while it
    // is open, and the persistent End Quarter button in the HUD advances the
    // turn when they're ready. The only forced flow is GameOver.
    // -----------------------------------------------------------------------
    if (state.gameOver) {
      const btnY = bottomY + TR_BOTTOM_H + TR_GAP;
      new Button(this, {
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
  }
}

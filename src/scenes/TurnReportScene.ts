import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { getTheme, colorToString } from "../ui/Theme.ts";
import { Label } from "../ui/Label.ts";
import { Panel } from "../ui/Panel.ts";
import { Button } from "../ui/Button.ts";
import { DataTable } from "../ui/DataTable.ts";
import { ScrollableList } from "../ui/ScrollableList.ts";
import type { TurnResult } from "../data/types.ts";

const HUD_TOP = 60;

function formatCash(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(Math.round(amount));
  return sign + "\u00A7" + abs.toLocaleString();
}

export class TurnReportScene extends Phaser.Scene {
  constructor() {
    super({ key: "TurnReportScene" });
  }

  create(): void {
    const theme = getTheme();
    const state = gameStore.getState();
    const history = state.history;
    const lastTurn: TurnResult | undefined = history[history.length - 1];

    if (!lastTurn) {
      // Safety: should never arrive here without history, but handle gracefully
      this.scene.start("GalaxyMapScene");
      return;
    }

    this.cameras.main.setBackgroundColor(theme.colors.background);

    // -----------------------------------------------------------------------
    // Title
    // -----------------------------------------------------------------------
    const title = new Label(this, {
      x: 640,
      y: HUD_TOP + 10,
      text: `Turn ${lastTurn.turn} Report`,
      style: "heading",
      color: theme.colors.accent,
    });
    title.setOrigin(0.5, 0);

    // -----------------------------------------------------------------------
    // P&L Summary (left column)
    // -----------------------------------------------------------------------
    const plPanel = new Panel(this, {
      x: 20,
      y: HUD_TOP + 50,
      width: 380,
      height: 250,
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
    for (const row of plRows) {
      const labelText = this.add.text(plContent.x + 8, rowY, row.label, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
      });
      plPanel.add(labelText);

      const valueText = this.add
        .text(plContent.x + plContent.width - 8, rowY, row.value, {
          fontSize: `${theme.fonts.value.size}px`,
          fontFamily: theme.fonts.value.family,
          color: colorToString(row.color),
        })
        .setOrigin(1, 0);
      plPanel.add(valueText);

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

    // Net profit row
    const netColor =
      lastTurn.netProfit >= 0 ? theme.colors.profit : theme.colors.loss;
    const netLabel = this.add.text(plContent.x + 8, rowY, "Net Profit", {
      fontSize: `${theme.fonts.body.size}px`,
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.text),
    });
    plPanel.add(netLabel);

    const netValue = this.add
      .text(
        plContent.x + plContent.width - 8,
        rowY,
        formatCash(lastTurn.netProfit),
        {
          fontSize: `${theme.fonts.value.size}px`,
          fontFamily: theme.fonts.value.family,
          color: colorToString(netColor),
        },
      )
      .setOrigin(1, 0);
    plPanel.add(netValue);
    rowY += 32;

    // Cash at end
    const cashLabel = this.add.text(plContent.x + 8, rowY, "Cash", {
      fontSize: `${theme.fonts.caption.size}px`,
      fontFamily: theme.fonts.caption.family,
      color: colorToString(theme.colors.textDim),
    });
    plPanel.add(cashLabel);

    const cashValue = this.add
      .text(
        plContent.x + plContent.width - 8,
        rowY,
        formatCash(lastTurn.cashAtEnd),
        {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(
            lastTurn.cashAtEnd >= 0 ? theme.colors.profit : theme.colors.loss,
          ),
        },
      )
      .setOrigin(1, 0);
    plPanel.add(cashValue);

    // -----------------------------------------------------------------------
    // Route Performance (right column)
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
      x: 420,
      y: HUD_TOP + 50,
      width: 840,
      height: 250,
      title: "Route Performance",
    });

    const routeTable = new DataTable(this, {
      x: 430,
      y: HUD_TOP + 90,
      width: 820,
      height: 200,
      columns: [
        {
          key: "route",
          label: "Route",
          width: 220,
        },
        {
          key: "trips",
          label: "Trips",
          width: 80,
          align: "right",
        },
        {
          key: "revenue",
          label: "Revenue",
          width: 140,
          align: "right",
          format: (v) => formatCash(v as number),
          colorFn: () => theme.colors.profit,
        },
        {
          key: "fuelCost",
          label: "Fuel Cost",
          width: 140,
          align: "right",
          format: (v) => formatCash(v as number),
          colorFn: () => theme.colors.loss,
        },
        {
          key: "cargo",
          label: "Cargo",
          width: 100,
          align: "right",
        },
        {
          key: "breakdowns",
          label: "Breakdowns",
          width: 100,
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
    // News Digest (bottom-left)
    // -----------------------------------------------------------------------
    new Panel(this, {
      x: 20,
      y: HUD_TOP + 315,
      width: 620,
      height: 240,
      title: "News Digest",
    });

    const newsList = new ScrollableList(this, {
      x: 30,
      y: HUD_TOP + 355,
      width: 600,
      height: 190,
      itemHeight: 48,
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
        });
        const descText = this.add.text(10, 24, desc, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
          wordWrap: { width: 580 },
        });
        item.add([nameText, descText]);
        newsList.addItem(item);
      }
    }

    // -----------------------------------------------------------------------
    // Market Changes (bottom-right) — simple summary text
    // -----------------------------------------------------------------------
    const marketPanel = new Panel(this, {
      x: 660,
      y: HUD_TOP + 315,
      width: 600,
      height: 240,
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
    // Continue button
    // -----------------------------------------------------------------------
    const btnWidth = 180;
    new Button(this, {
      x: 640 - btnWidth / 2,
      y: HUD_TOP + 570,
      width: btnWidth,
      height: 44,
      label: state.gameOver ? "View Results" : "Continue",
      onClick: () => {
        if (state.gameOver) {
          this.scene.start("GameOverScene");
        } else {
          gameStore.update({ phase: "planning" });
          this.scene.start("GalaxyMapScene");
        }
      },
    });
  }
}

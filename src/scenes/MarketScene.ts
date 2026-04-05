import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { CargoType } from "../data/types.ts";
import type { CargoType as CargoTypeValue } from "../data/types.ts";
import { BASE_CARGO_PRICES } from "../data/constants.ts";
import { getTheme } from "../ui/Theme.ts";
import { Label } from "../ui/Label.ts";
import { DataTable } from "../ui/DataTable.ts";
import { Panel } from "../ui/Panel.ts";
import { PortraitPanel } from "../ui/PortraitPanel.ts";
import { createStarfield } from "../ui/Starfield.ts";
import {
  CONTENT_TOP,
  CONTENT_HEIGHT,
  SIDEBAR_LEFT,
  SIDEBAR_WIDTH,
  MAIN_CONTENT_LEFT,
  MAIN_CONTENT_WIDTH,
} from "../ui/Layout.ts";

function formatCash(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return sign + "\u00A7" + abs.toLocaleString("en-US");
}

function trendArrow(trend: string): string {
  if (trend === "rising") return "\u25B2";
  if (trend === "falling") return "\u25BC";
  return "\u2500";
}

const CARGO_TYPE_VALUES = Object.values(CargoType) as CargoTypeValue[];

export class MarketScene extends Phaser.Scene {
  private portrait!: PortraitPanel;

  constructor() {
    super({ key: "MarketScene" });
  }

  create(): void {
    const theme = getTheme();
    const state = gameStore.getState();

    // Animated starfield background
    createStarfield(this);

    // --- Left sidebar: Planet portrait (updates on row select) ---
    this.portrait = new PortraitPanel(this, {
      x: SIDEBAR_LEFT,
      y: CONTENT_TOP,
      width: SIDEBAR_WIDTH,
      height: CONTENT_HEIGHT,
    });
    // Default state: no planet selected
    this.portrait.updatePortrait("planet", 0, "Galaxy Market", [], {
      planetType: "terran",
    });

    // --- Main content panel ---
    const contentPanel = new Panel(this, {
      x: MAIN_CONTENT_LEFT,
      y: CONTENT_TOP,
      width: MAIN_CONTENT_WIDTH,
      height: CONTENT_HEIGHT,
      title: "Galaxy Market Overview",
    });
    const content = contentPanel.getContentArea();
    const absX = MAIN_CONTENT_LEFT + content.x;
    const absY = CONTENT_TOP + content.y;

    // Fuel price display inside content panel
    const fuelTrendStr = trendArrow(state.market.fuelTrend);
    new Label(this, {
      x: absX,
      y: absY + 2,
      text: `Fuel Price: ${formatCash(state.market.fuelPrice)} ${fuelTrendStr}`,
      style: "value",
      color: theme.colors.accent,
    });

    // Build columns: Planet, Type, then one per cargo type
    const planetColWidth = 100;
    const typeColWidth = 80;
    const cargoColWidth = Math.floor(
      (content.width - planetColWidth - typeColWidth) /
        CARGO_TYPE_VALUES.length,
    );

    const columns = [
      {
        key: "planet",
        label: "Planet",
        width: planetColWidth,
        sortable: true,
      },
      { key: "type", label: "Type", width: typeColWidth, sortable: true },
    ];

    for (const ct of CARGO_TYPE_VALUES) {
      columns.push({
        key: ct,
        label: ct.charAt(0).toUpperCase() + ct.slice(1),
        width: cargoColWidth,
        sortable: true,
      });
    }

    // Build column definitions with formatting
    const columnDefs = columns.map((col) => {
      if (col.key === "planet" || col.key === "type") {
        return col;
      }

      const cargoKey = col.key as CargoTypeValue;
      const basePrice = BASE_CARGO_PRICES[cargoKey];

      return {
        ...col,
        align: "right" as const,
        format: (v: unknown) => {
          if (v == null) return "\u2014";
          return formatCash(v as number);
        },
        colorFn: (v: unknown) => {
          if (v == null) return theme.colors.textDim;
          const price = v as number;
          if (price > basePrice * 1.2) return theme.colors.profit;
          return theme.colors.text;
        },
      };
    });

    const table = new DataTable(this, {
      x: absX,
      y: absY + 28,
      width: content.width,
      height: content.height - 32,
      columns: columnDefs,
      keyboardNavigation: true,
      autoFocus: true,
      emptyStateText: "No market data available",
      emptyStateHint:
        "Generate a galaxy to inspect local and galaxy-wide prices.",
      onRowSelect: (_rowIndex, rowData) => {
        const planetName = rowData["planet"] as string;
        const planetType = rowData["type"] as string;
        const currentState = gameStore.getState();
        const planet = currentState.galaxy.planets.find(
          (p) => p.name === planetName,
        );
        if (planet) {
          // Build a cargo summary for the sidebar stats
          const planetMarket = currentState.market.planetMarkets[planet.id];
          const stats: Array<{ label: string; value: string }> = [
            { label: "Type", value: planetType },
          ];
          if (planetMarket) {
            // Show top cargo prices as summary
            for (const ct of CARGO_TYPE_VALUES) {
              const entry = planetMarket[ct];
              if (entry) {
                stats.push({
                  label: ct.charAt(0).toUpperCase() + ct.slice(1),
                  value: formatCash(entry.currentPrice),
                });
              }
            }
          }
          this.portrait.showPlanet(planet);
        }
      },
    });

    // Build rows
    const rows: Record<string, unknown>[] = [];
    for (const planet of state.galaxy.planets) {
      const planetMarket = state.market.planetMarkets[planet.id];
      const row: Record<string, unknown> = {
        planet: planet.name,
        type: planet.type,
      };

      for (const ct of CARGO_TYPE_VALUES) {
        if (planetMarket) {
          const entry = planetMarket[ct];
          row[ct] = entry.currentPrice;
        } else {
          row[ct] = null;
        }
      }

      rows.push(row);
    }

    table.setRows(rows);
  }
}

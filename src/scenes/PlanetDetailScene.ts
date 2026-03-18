import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { CargoType } from "../data/types.ts";
import type { Planet, CargoMarketEntry } from "../data/types.ts";
import { getTheme, colorToString } from "../ui/Theme.ts";
import { Panel } from "../ui/Panel.ts";
import { Label } from "../ui/Label.ts";
import { Button } from "../ui/Button.ts";
import { DataTable } from "../ui/DataTable.ts";
import { ScrollableList } from "../ui/ScrollableList.ts";
import { Modal } from "../ui/Modal.ts";
import { PortraitPanel } from "../ui/PortraitPanel.ts";
import { calculateDistance, createRoute } from "../game/routes/RouteManager.ts";
import { GAME_WIDTH, GAME_HEIGHT, CONTENT_GAP } from "../ui/Layout.ts";

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

function trendColor(trend: string): number {
  const theme = getTheme();
  if (trend === "rising") return theme.colors.profit;
  if (trend === "falling") return theme.colors.loss;
  return theme.colors.text;
}

function formatPopulation(pop: number): string {
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(1)}M`;
  if (pop >= 1_000) return `${(pop / 1_000).toFixed(1)}K`;
  return String(pop);
}

const CARGO_TYPE_VALUES = Object.values(CargoType) as CargoType[];

export class PlanetDetailScene extends Phaser.Scene {
  private planetId = "";

  constructor() {
    super({ key: "PlanetDetailScene" });
  }

  init(data: { planetId: string }): void {
    this.planetId = data.planetId;
  }

  create(): void {
    const theme = getTheme();
    const state = gameStore.getState();
    const planet = state.galaxy.planets.find((p) => p.id === this.planetId);
    if (!planet) return;

    const planetMarket = state.market.planetMarkets[this.planetId];

    // Overlay background
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, theme.colors.modalOverlay, 0.6)
      .setOrigin(0, 0)
      .setInteractive();

    // Overlay layout: sidebar (PortraitPanel) + content panel
    const overlayWidth = 900;
    const overlayHeight = 580;
    const overlayX = (GAME_WIDTH - overlayWidth) / 2;
    const overlayY = (GAME_HEIGHT - overlayHeight) / 2;
    const portraitWidth = 200;
    const contentX = overlayX + portraitWidth + CONTENT_GAP;
    const contentWidth = overlayWidth - portraitWidth - CONTENT_GAP;

    // Portrait panel (left sidebar)
    const portraitPanel = new PortraitPanel(this, {
      x: overlayX,
      y: overlayY,
      width: portraitWidth,
      height: overlayHeight,
    });
    portraitPanel.showPlanet(planet);

    // Content panel (right)
    const panel = new Panel(this, {
      x: contentX,
      y: overlayY,
      width: contentWidth,
      height: overlayHeight,
      title: planet.name,
    });

    const contentArea = panel.getContentArea();

    // Planet info
    new Label(this, {
      x: contentX + contentArea.x,
      y: overlayY + contentArea.y,
      text: `Type: ${planet.type}  |  Population: ${formatPopulation(planet.population)}`,
      style: "body",
    });

    // Market data table
    const tableY = overlayY + contentArea.y + 35;
    const tableWidth = contentArea.width;
    const colScale = tableWidth / 600; // scale columns proportionally

    const table = new DataTable(this, {
      x: contentX + contentArea.x,
      y: tableY,
      width: tableWidth,
      height: 320,
      columns: [
        { key: "cargoType", label: "Cargo Type", width: Math.floor(130 * colScale), sortable: true },
        {
          key: "supply",
          label: "Supply",
          width: Math.floor(80 * colScale),
          align: "right",
          sortable: true,
          format: (v) => String(Math.round(v as number)),
        },
        {
          key: "demand",
          label: "Demand",
          width: Math.floor(80 * colScale),
          align: "right",
          sortable: true,
          format: (v) => String(Math.round(v as number)),
        },
        {
          key: "price",
          label: "Price",
          width: Math.floor(100 * colScale),
          align: "right",
          sortable: true,
          format: (v) => formatCash(v as number),
        },
        {
          key: "trend",
          label: "Trend",
          width: Math.floor(70 * colScale),
          align: "center",
          format: (v) => trendArrow(v as string),
          colorFn: (v) => trendColor(v as string),
        },
        {
          key: "saturation",
          label: "Sat%",
          width: Math.floor(80 * colScale),
          align: "right",
          format: (v) => `${Math.round((v as number) * 100)}%`,
        },
      ],
    });

    // Build rows from market data
    if (planetMarket) {
      const rows = CARGO_TYPE_VALUES.map((ct) => {
        const entry: CargoMarketEntry = planetMarket[ct];
        return {
          cargoType: ct,
          supply: entry.baseSupply,
          demand: entry.baseDemand,
          price: entry.currentPrice,
          trend: entry.trend,
          saturation: entry.saturation,
        };
      });
      table.setRows(rows);
    }

    // Buttons row at bottom of content panel
    const buttonY = overlayY + overlayHeight - 60;

    // Create Route button
    new Button(this, {
      x: contentX + contentArea.x,
      y: buttonY,
      width: 150,
      label: "Create Route",
      onClick: () => {
        this.showDestinationPicker(planet);
      },
    });

    // Close button
    new Button(this, {
      x: contentX + contentWidth - contentArea.x - 120,
      y: buttonY,
      width: 120,
      label: "Close",
      onClick: () => {
        this.closeOverlay();
      },
    });
  }

  private showDestinationPicker(originPlanet: Planet): void {
    const theme = getTheme();
    const state = gameStore.getState();
    const otherPlanets = state.galaxy.planets.filter(
      (p) => p.id !== originPlanet.id,
    );

    // Overlay for destination picker
    const overlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, theme.colors.modalOverlay, 0.5)
      .setOrigin(0, 0)
      .setInteractive();

    const listW = 400;
    const listH = 450;
    const listX = (GAME_WIDTH - listW) / 2;
    const listY = (GAME_HEIGHT - listH) / 2;

    const pickerPanel = new Panel(this, {
      x: listX,
      y: listY,
      width: listW,
      height: listH,
      title: "Select Destination",
    });

    const pickerContent = pickerPanel.getContentArea();

    const list = new ScrollableList(this, {
      x: listX + pickerContent.x,
      y: listY + pickerContent.y,
      width: pickerContent.width,
      height: pickerContent.height - 50,
      itemHeight: 36,
      onSelect: (index: number) => {
        const destPlanet = otherPlanets[index];
        if (!destPlanet) return;

        // Calculate distance
        const freshState = gameStore.getState();
        const distance = calculateDistance(
          originPlanet,
          destPlanet,
          freshState.galaxy.systems,
        );

        // Create the route
        const route = createRoute(
          originPlanet.id,
          destPlanet.id,
          distance,
          null,
        );

        // Update state
        gameStore.update({
          activeRoutes: [...freshState.activeRoutes, route],
        });

        // Clean up picker
        overlay.destroy();
        pickerPanel.destroy();
        list.destroy();

        // Show confirmation
        const modal = new Modal(this, {
          title: "Route Created",
          body: `Route from ${originPlanet.name} to ${destPlanet.name} created.\nDistance: ${distance.toFixed(1)} units.\nAssign ships and cargo in the Routes scene.`,
          onOk: () => {
            modal.destroy();
          },
        });
        modal.show();
      },
    });

    // Populate the list
    for (const p of otherPlanets) {
      const itemContainer = this.add.container(0, 0);
      const itemText = this.add.text(10, 8, `${p.name} (${p.type})`, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
      });
      itemContainer.add(itemText);
      list.addItem(itemContainer);
    }
  }

  private closeOverlay(): void {
    // Just stop this overlay scene — the content scene underneath is still running
    this.scene.stop();
  }
}

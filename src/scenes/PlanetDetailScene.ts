import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { CargoType } from "../data/types.ts";
import type { Planet, CargoMarketEntry } from "../data/types.ts";
import {
  getTheme,
  Panel,
  Label,
  Button,
  DataTable,
  ScrollFrame,
  Modal,
  PortraitPanel,
  openRouteBuilder,
  SceneUiDirector,
  getLayout,
  getCargoIconKey,
  getCargoColor,
  getCargoLabel,
} from "../ui/index.ts";

const CARGO_TYPE_VALUES = Object.values(CargoType) as Array<
  (typeof CargoType)[keyof typeof CargoType]
>;

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

export class PlanetDetailScene extends Phaser.Scene {
  private planetId = "";
  private ui!: SceneUiDirector;

  constructor() {
    super({ key: "PlanetDetailScene" });
  }

  init(data: { planetId: string }): void {
    this.planetId = data.planetId;
  }

  create(): void {
    this.scene.bringToTop();
    this.ui = new SceneUiDirector(this);

    const L = getLayout();
    const theme = getTheme();
    const state = gameStore.getState();
    const planet = state.galaxy.planets.find((p) => p.id === this.planetId);
    if (!planet) return;

    const planetMarket = state.market.planetMarkets[this.planetId];

    // Overlay background
    this.add
      .rectangle(
        0,
        0,
        L.gameWidth,
        L.gameHeight,
        theme.colors.modalOverlay,
        0.7,
      )
      .setOrigin(0, 0)
      .setInteractive();

    // Overlay layout: sidebar (PortraitPanel) + content panel
    const overlayWidth = 900;
    const overlayHeight = 580;
    const overlayX = (L.gameWidth - overlayWidth) / 2;
    const overlayY = (L.gameHeight - overlayHeight) / 2;
    const portraitWidth = 200;
    const contentX = overlayX + portraitWidth + L.contentGap;
    const contentWidth = overlayWidth - portraitWidth - L.contentGap;

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

    new Label(this, {
      x: contentX + contentArea.x,
      y: overlayY + contentArea.y + 20,
      text: "Local market for this world — use Market for galaxy-wide comparison. Esc or Close returns to the system map.",
      style: "caption",
      color: theme.colors.textDim,
      maxWidth: contentArea.width,
    });

    // Market data table
    const tableY = overlayY + contentArea.y + 54;
    const tableWidth = contentArea.width;
    const colScale = tableWidth / 600; // scale columns proportionally

    const tableFrame = new ScrollFrame(this, {
      x: contentX + contentArea.x,
      y: tableY,
      width: tableWidth,
      height: 320,
    });
    const table = new DataTable(this, {
      x: 0,
      y: 0,
      width: tableWidth,
      height: 320,
      contentSized: true,
      columns: [
        {
          key: "cargoType",
          label: "Cargo Type",
          width: Math.floor(130 * colScale),
          sortable: true,
          format: (v) => getCargoLabel(v as string),
          iconFn: (v) => getCargoIconKey(v as string),
          iconTintFn: (v) => getCargoColor(v as string),
        },
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
    tableFrame.setContent(table);

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
    openRouteBuilder(this, {
      ui: this.ui,
      title: `Create Route from ${originPlanet.name}`,
      confirmLabel: "Create Route",
      initialOriginPlanetId: originPlanet.id,
      lockOrigin: true,
      allowAutoBuy: true,
      onComplete: (result) => {
        const latestState = gameStore.getState();
        const destination = latestState.galaxy.planets.find(
          (planet) => planet.id === result.destinationPlanetId,
        );
        const shipSummary = result.assignedShipName
          ? result.assignedShipName
          : "Assign later in Routes";
        const modal = new Modal(this, {
          title: "Route Ready",
          body: `Route ${originPlanet.name} → ${destination?.name ?? "Destination"} created.\nCargo: ${getCargoLabel(result.cargoType)}\nShip: ${shipSummary}`,
          width: 440,
          height: 260,
          onOk: () => {
            modal.destroy();
          },
        });
        modal.show();
      },
    });
  }

  private closeOverlay(): void {
    // Just stop this overlay scene — the content scene underneath is still running
    this.scene.stop();
  }
}

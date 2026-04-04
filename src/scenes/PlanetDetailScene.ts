import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { CargoType } from "../data/types.ts";
import type {
  Planet,
  CargoMarketEntry,
  CargoType as CargoTypeValue,
  Ship,
  ShipClass,
} from "../data/types.ts";
import { getTheme, colorToString } from "../ui/Theme.ts";
import { Panel } from "../ui/Panel.ts";
import { Label } from "../ui/Label.ts";
import { Button } from "../ui/Button.ts";
import { DataTable } from "../ui/DataTable.ts";
import { ScrollableList } from "../ui/ScrollableList.ts";
import { Modal } from "../ui/Modal.ts";
import { PortraitPanel } from "../ui/PortraitPanel.ts";
import {
  calculateDistance,
  createRoute,
  assignShipToRoute,
} from "../game/routes/RouteManager.ts";
import { buyShip } from "../game/fleet/FleetManager.ts";
import { SHIP_TEMPLATES } from "../data/constants.ts";
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
    this.scene.bringToTop();

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
        {
          key: "cargoType",
          label: "Cargo Type",
          width: Math.floor(130 * colScale),
          sortable: true,
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
    this.scene.bringToTop();

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

        // Clean up picker
        overlay.destroy();
        pickerPanel.destroy();
        list.destroy();

        this.showQuickRouteSetup(originPlanet, destPlanet);
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

  private showQuickRouteSetup(originPlanet: Planet, destPlanet: Planet): void {
    this.scene.bringToTop();

    const theme = getTheme();
    const cargoTypes = Object.values(CargoType) as CargoTypeValue[];

    let selectedCargoIndex = 0;
    let selectedShipId: string | null = null; // null = auto-select
    let autoBuy = true;

    const overlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, theme.colors.modalOverlay, 0.6)
      .setOrigin(0, 0)
      .setInteractive();

    const panelW = 560;
    const panelH = 420;
    const panelX = (GAME_WIDTH - panelW) / 2;
    const panelY = (GAME_HEIGHT - panelH) / 2;

    const panel = new Panel(this, {
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
      title: "Create Route (Quick Setup)",
    });

    const content = panel.getContentArea();
    const uiObjects: Phaser.GameObjects.GameObject[] = [overlay, panel];

    const routeInfo = new Label(this, {
      x: panelX + content.x,
      y: panelY + content.y,
      text: `${originPlanet.name} → ${destPlanet.name}`,
      style: "value",
      color: theme.colors.accent,
    });
    uiObjects.push(routeInfo);

    const distance = calculateDistance(
      originPlanet,
      destPlanet,
      gameStore.getState().galaxy.systems,
    );
    const distanceInfo = new Label(this, {
      x: panelX + content.x,
      y: panelY + content.y + 28,
      text: `Distance: ${distance.toFixed(1)} units`,
      style: "caption",
      color: theme.colors.textDim,
    });
    uiObjects.push(distanceInfo);

    const cargoTitle = new Label(this, {
      x: panelX + content.x,
      y: panelY + content.y + 72,
      text: "Cargo",
      style: "body",
    });
    uiObjects.push(cargoTitle);

    const cargoValue = new Label(this, {
      x: panelX + content.x + 96,
      y: panelY + content.y + 72,
      text: cargoTypes[selectedCargoIndex],
      style: "value",
      color: theme.colors.accent,
    });
    uiObjects.push(cargoValue);

    const availableShipsAtOpen = gameStore
      .getState()
      .fleet.filter((s) => !s.assignedRouteId);

    const shipTitle = new Label(this, {
      x: panelX + content.x,
      y: panelY + content.y + 132,
      text: "Ship",
      style: "body",
    });
    uiObjects.push(shipTitle);

    const shipValue = new Label(this, {
      x: panelX + content.x + 96,
      y: panelY + content.y + 132,
      text: availableShipsAtOpen.length > 0 ? "Auto Select" : "No free ships",
      style: "value",
      color: theme.colors.accent,
    });
    uiObjects.push(shipValue);

    const autoBuyBtn = new Button(this, {
      x: panelX + content.x,
      y: panelY + content.y + 184,
      width: 180,
      label: "Auto-buy if needed: ON",
      onClick: () => {
        autoBuy = !autoBuy;
        autoBuyBtn.setLabel(`Auto-buy if needed: ${autoBuy ? "ON" : "OFF"}`);
      },
    });
    uiObjects.push(autoBuyBtn);

    const cargoPrevBtn = new Button(this, {
      x: panelX + content.x + 300,
      y: panelY + content.y + 66,
      width: 46,
      height: 32,
      label: "<",
      onClick: () => {
        selectedCargoIndex =
          (selectedCargoIndex - 1 + cargoTypes.length) % cargoTypes.length;
        cargoValue.setText(cargoTypes[selectedCargoIndex]);
      },
    });
    const cargoNextBtn = new Button(this, {
      x: panelX + content.x + 352,
      y: panelY + content.y + 66,
      width: 46,
      height: 32,
      label: ">",
      onClick: () => {
        selectedCargoIndex = (selectedCargoIndex + 1) % cargoTypes.length;
        cargoValue.setText(cargoTypes[selectedCargoIndex]);
      },
    });
    uiObjects.push(cargoPrevBtn, cargoNextBtn);

    const shipPrevBtn = new Button(this, {
      x: panelX + content.x + 300,
      y: panelY + content.y + 126,
      width: 46,
      height: 32,
      label: "<",
      onClick: () => {
        if (availableShipsAtOpen.length === 0) return;
        const options = [null, ...availableShipsAtOpen.map((s) => s.id)];
        const idx = options.findIndex((id) => id === selectedShipId);
        const next = (idx - 1 + options.length) % options.length;
        selectedShipId = options[next];
        shipValue.setText(
          selectedShipId
            ? (availableShipsAtOpen.find((s) => s.id === selectedShipId)
                ?.name ?? "Auto Select")
            : "Auto Select",
        );
      },
    });
    const shipNextBtn = new Button(this, {
      x: panelX + content.x + 352,
      y: panelY + content.y + 126,
      width: 46,
      height: 32,
      label: ">",
      onClick: () => {
        if (availableShipsAtOpen.length === 0) return;
        const options = [null, ...availableShipsAtOpen.map((s) => s.id)];
        const idx = options.findIndex((id) => id === selectedShipId);
        const next = (idx + 1) % options.length;
        selectedShipId = options[next];
        shipValue.setText(
          selectedShipId
            ? (availableShipsAtOpen.find((s) => s.id === selectedShipId)
                ?.name ?? "Auto Select")
            : "Auto Select",
        );
      },
    });
    uiObjects.push(shipPrevBtn, shipNextBtn);

    const cleanUp = (): void => {
      for (const obj of uiObjects) {
        if (obj.active) obj.destroy();
      }
    };

    const createBtn = new Button(this, {
      x: panelX + content.x,
      y: panelY + panelH - 62,
      width: 220,
      label: "Create & Assign Route",
      onClick: () => {
        const chosenCargo = cargoTypes[selectedCargoIndex];

        const freshState = gameStore.getState();
        const latestOrigin = freshState.galaxy.planets.find(
          (p) => p.id === originPlanet.id,
        );
        const latestDest = freshState.galaxy.planets.find(
          (p) => p.id === destPlanet.id,
        );
        if (!latestOrigin || !latestDest) {
          cleanUp();
          return;
        }

        const latestDistance = calculateDistance(
          latestOrigin,
          latestDest,
          freshState.galaxy.systems,
        );
        const route = createRoute(
          latestOrigin.id,
          latestDest.id,
          latestDistance,
          chosenCargo,
        );

        let updatedFleet = [...freshState.fleet];
        let updatedRoutes = [...freshState.activeRoutes, route];
        let updatedCash = freshState.cash;

        let shipIdToAssign: string | null = null;
        if (
          selectedShipId &&
          updatedFleet.some(
            (s) => s.id === selectedShipId && !s.assignedRouteId,
          )
        ) {
          shipIdToAssign = selectedShipId;
        } else {
          shipIdToAssign = pickBestAvailableShipId(updatedFleet, chosenCargo);
        }

        if (!shipIdToAssign && autoBuy) {
          const cheapest = getCheapestCompatibleShipClass(chosenCargo);
          if (cheapest) {
            const template = SHIP_TEMPLATES[cheapest];
            if (updatedCash >= template.purchaseCost) {
              const { ship, cost } = buyShip(cheapest, updatedFleet);
              updatedFleet = [...updatedFleet, ship];
              updatedCash -= cost;
              shipIdToAssign = ship.id;
            }
          }
        }

        if (shipIdToAssign) {
          const assigned = assignShipToRoute(
            shipIdToAssign,
            route.id,
            updatedFleet,
            updatedRoutes,
          );
          updatedFleet = assigned.fleet;
          updatedRoutes = assigned.routes;
        }

        gameStore.update({
          fleet: updatedFleet,
          activeRoutes: updatedRoutes,
          cash: updatedCash,
        });

        cleanUp();

        const assignedShip = shipIdToAssign
          ? (updatedFleet.find((s) => s.id === shipIdToAssign)?.name ??
            "Assigned")
          : "None";
        const modal = new Modal(this, {
          title: "Route Ready",
          body: `Route ${latestOrigin.name} → ${latestDest.name} created.\nCargo: ${chosenCargo}\nShip: ${assignedShip}${shipIdToAssign ? "" : " (assign later in Routes)"}`,
          onOk: () => {
            modal.destroy();
          },
        });
        modal.show();
      },
    });
    uiObjects.push(createBtn);

    const cancelBtn = new Button(this, {
      x: panelX + panelW - content.x - 120,
      y: panelY + panelH - 62,
      width: 120,
      label: "Cancel",
      onClick: () => {
        cleanUp();
      },
    });
    uiObjects.push(cancelBtn);
  }

  private closeOverlay(): void {
    // Just stop this overlay scene — the content scene underneath is still running
    this.scene.stop();
  }
}

function pickBestAvailableShipId(
  fleet: Ship[],
  cargoType: CargoTypeValue,
): string | null {
  const available = fleet.filter((s) => !s.assignedRouteId);
  if (available.length === 0) return null;

  if (cargoType === CargoType.Passengers) {
    const passengerShips = available
      .filter((s) => s.passengerCapacity > 0)
      .sort((a, b) => b.passengerCapacity - a.passengerCapacity);
    return passengerShips[0]?.id ?? available[0].id;
  }

  const cargoShips = available
    .filter((s) => s.cargoCapacity > 0)
    .sort((a, b) => b.cargoCapacity - a.cargoCapacity);
  return cargoShips[0]?.id ?? available[0].id;
}

function getCheapestCompatibleShipClass(
  cargoType: CargoTypeValue,
): ShipClass | null {
  const classes = Object.keys(SHIP_TEMPLATES) as ShipClass[];
  const compatible = classes.filter((cls) => {
    const t = SHIP_TEMPLATES[cls];
    return cargoType === CargoType.Passengers
      ? t.passengerCapacity > 0
      : t.cargoCapacity > 0;
  });

  if (compatible.length === 0) return null;
  compatible.sort(
    (a, b) => SHIP_TEMPLATES[a].purchaseCost - SHIP_TEMPLATES[b].purchaseCost,
  );
  return compatible[0];
}

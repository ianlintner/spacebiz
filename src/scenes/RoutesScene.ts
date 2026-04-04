import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { CargoType } from "../data/types.ts";
import type { CargoType as CargoTypeValue } from "../data/types.ts";
import { getTheme, colorToString } from "../ui/Theme.ts";
import { Button } from "../ui/Button.ts";
import { DataTable } from "../ui/DataTable.ts";
import { Modal } from "../ui/Modal.ts";
import { ScrollableList } from "../ui/ScrollableList.ts";
import { Panel } from "../ui/Panel.ts";
import { PortraitPanel } from "../ui/PortraitPanel.ts";
import { SceneUiDirector } from "../ui/SceneUiDirector.ts";
import { createStarfield } from "../ui/Starfield.ts";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  CONTENT_TOP,
  CONTENT_HEIGHT,
  SIDEBAR_LEFT,
  SIDEBAR_WIDTH,
  MAIN_CONTENT_LEFT,
  MAIN_CONTENT_WIDTH,
} from "../ui/Layout.ts";
import {
  calculateDistance,
  createRoute,
  assignShipToRoute,
  deleteRoute,
  estimateRouteRevenue,
  estimateRouteFuelCost,
} from "../game/routes/RouteManager.ts";

function formatCash(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return sign + "\u00A7" + abs.toLocaleString("en-US");
}

export class RoutesScene extends Phaser.Scene {
  private selectedRouteId: string | null = null;
  private routeTable!: DataTable;
  private portrait!: PortraitPanel;
  private ui!: SceneUiDirector;

  constructor() {
    super({ key: "RoutesScene" });
  }

  create(): void {
    this.selectedRouteId = null;
    this.ui = new SceneUiDirector(this);

    // Starfield background
    createStarfield(this);

    // Sidebar portrait — destination planet of selected route
    this.portrait = new PortraitPanel(this, {
      x: SIDEBAR_LEFT,
      y: CONTENT_TOP,
      width: SIDEBAR_WIDTH,
      height: CONTENT_HEIGHT,
    });
    this.portrait.updatePortrait("planet", 0, "Select a Route", [], {
      planetType: "terran",
    });

    // Content panel
    const contentPanel = new Panel(this, {
      x: MAIN_CONTENT_LEFT,
      y: CONTENT_TOP,
      width: MAIN_CONTENT_WIDTH,
      height: CONTENT_HEIGHT,
      title: "Route Management",
    });
    const content = contentPanel.getContentArea();
    const absX = MAIN_CONTENT_LEFT + content.x;
    const absY = CONTENT_TOP + content.y;

    // Route table
    this.routeTable = new DataTable(this, {
      x: absX,
      y: absY,
      width: content.width,
      height: content.height - 50,
      columns: [
        { key: "origin", label: "Origin", width: 120, sortable: true },
        {
          key: "destination",
          label: "Destination",
          width: 120,
          sortable: true,
        },
        {
          key: "distance",
          label: "Distance",
          width: 80,
          align: "right",
          sortable: true,
          format: (v) => (v as number).toFixed(1),
        },
        {
          key: "ships",
          label: "Ships",
          width: 60,
          align: "center",
          sortable: true,
        },
        { key: "cargoType", label: "Cargo", width: 100, sortable: true },
        {
          key: "revenue",
          label: "Est. Revenue",
          width: 110,
          align: "right",
          format: (v) =>
            (v as string | number) === "\u2014"
              ? "\u2014"
              : formatCash(v as number),
          colorFn: (v) => {
            const theme2 = getTheme();
            return typeof v === "number"
              ? theme2.colors.profit
              : theme2.colors.textDim;
          },
        },
        {
          key: "fuelCost",
          label: "Est. Fuel",
          width: 110,
          align: "right",
          format: (v) =>
            (v as string | number) === "\u2014"
              ? "\u2014"
              : formatCash(v as number),
          colorFn: (v) => {
            const theme2 = getTheme();
            return typeof v === "number"
              ? theme2.colors.loss
              : theme2.colors.textDim;
          },
        },
        {
          key: "profit",
          label: "Est. Profit",
          width: 110,
          align: "right",
          format: (v) =>
            (v as string | number) === "\u2014"
              ? "\u2014"
              : formatCash(v as number),
          colorFn: (v) => {
            const theme2 = getTheme();
            if (typeof v !== "number") return theme2.colors.textDim;
            return v >= 0 ? theme2.colors.profit : theme2.colors.loss;
          },
        },
      ],
      onRowSelect: (_rowIndex, rowData) => {
        this.selectedRouteId = rowData["id"] as string;
        const currentState = gameStore.getState();
        const route = currentState.activeRoutes.find(
          (r) => r.id === this.selectedRouteId,
        );
        if (route) {
          const destPlanet = currentState.galaxy.planets.find(
            (p) => p.id === route.destinationPlanetId,
          );
          if (destPlanet) {
            const planetIndex = currentState.galaxy.planets.indexOf(destPlanet);
            this.portrait.updatePortrait(
              "planet",
              planetIndex,
              destPlanet.name,
              [
                { label: "Type", value: destPlanet.type },
                { label: "Distance", value: route.distance.toFixed(1) },
                { label: "Cargo", value: route.cargoType ?? "None" },
              ],
              { planetType: destPlanet.type },
            );
          }
        }
      },
    });

    this.refreshTable();

    // Buttons at bottom of content panel
    const buttonY = absY + content.height - 40;

    new Button(this, {
      x: absX,
      y: buttonY,
      width: 140,
      label: "Create Route",
      onClick: () => this.startCreateRoute(),
    });

    new Button(this, {
      x: absX + 160,
      y: buttonY,
      width: 140,
      label: "Delete Route",
      onClick: () => this.confirmDeleteRoute(),
    });

    new Button(this, {
      x: absX + 320,
      y: buttonY,
      width: 140,
      label: "Assign Ship",
      onClick: () => this.showAssignShip(),
    });

    new Button(this, {
      x: absX + 480,
      y: buttonY,
      width: 140,
      label: "Set Cargo",
      onClick: () => this.showSetCargo(),
    });
  }

  private refreshTable(): void {
    const state = gameStore.getState();

    const planetMap = new Map<string, string>();
    for (const p of state.galaxy.planets) {
      planetMap.set(p.id, p.name);
    }

    const rows = state.activeRoutes.map((route) => {
      const firstShipId = route.assignedShipIds[0];
      const firstShip = firstShipId
        ? state.fleet.find((s) => s.id === firstShipId)
        : undefined;

      let revenue: number | string = "\u2014";
      let fuelCost: number | string = "\u2014";
      let profit: number | string = "\u2014";

      if (firstShip && route.cargoType) {
        const rev = estimateRouteRevenue(route, firstShip, state.market);
        const fuel = estimateRouteFuelCost(
          route,
          firstShip,
          state.market.fuelPrice,
        );
        revenue = rev;
        fuelCost = fuel;
        profit = rev - fuel;
      }

      return {
        id: route.id,
        origin: planetMap.get(route.originPlanetId) ?? route.originPlanetId,
        destination:
          planetMap.get(route.destinationPlanetId) ?? route.destinationPlanetId,
        distance: route.distance,
        ships: route.assignedShipIds.length,
        cargoType: route.cargoType ?? "None",
        revenue,
        fuelCost,
        profit,
      };
    });

    this.routeTable.setRows(rows);
  }

  private startCreateRoute(): void {
    const theme = getTheme();
    const state = gameStore.getState();
    const planets = state.galaxy.planets;

    // Step 1: Pick origin
    const layer = this.ui.openLayer({ key: "routes-create-origin" });
    layer.createOverlay({
      alpha: 0.6,
      color: theme.colors.modalOverlay,
      closeOnPointerUp: true,
    });

    const panelW = 400;
    const panelH = 480;
    const panelX = (GAME_WIDTH - panelW) / 2;
    const panelY = (GAME_HEIGHT - panelH) / 2;

    const originPanel = layer.track(
      new Panel(this, {
        x: panelX,
        y: panelY,
        width: panelW,
        height: panelH,
        title: "Select Origin",
      }),
    );

    const content = originPanel.getContentArea();

    const originList = layer.track(
      new ScrollableList(this, {
        x: panelX + content.x,
        y: panelY + content.y,
        width: content.width,
        height: content.height - 10,
        itemHeight: 36,
        onSelect: (index: number) => {
          const originPlanet = planets[index];
          if (!originPlanet) return;

          layer.destroy();

          // Step 2: Pick destination
          this.pickDestination(originPlanet.id);
        },
      }),
    );

    for (const p of planets) {
      const itemContainer = this.add.container(0, 0);
      const itemText = this.add.text(10, 8, `${p.name} (${p.type})`, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
        wordWrap: { width: content.width - 20 },
      });
      itemContainer.add(itemText);
      originList.addItem(itemContainer);
    }
  }

  private pickDestination(originPlanetId: string): void {
    const theme = getTheme();
    const state = gameStore.getState();
    const otherPlanets = state.galaxy.planets.filter(
      (p) => p.id !== originPlanetId,
    );

    const layer = this.ui.openLayer({ key: "routes-create-destination" });
    layer.createOverlay({
      alpha: 0.6,
      color: theme.colors.modalOverlay,
      closeOnPointerUp: true,
    });

    const panelW = 400;
    const panelH = 480;
    const panelX = (GAME_WIDTH - panelW) / 2;
    const panelY = (GAME_HEIGHT - panelH) / 2;

    const destPanel = layer.track(
      new Panel(this, {
        x: panelX,
        y: panelY,
        width: panelW,
        height: panelH,
        title: "Select Destination",
      }),
    );

    const content = destPanel.getContentArea();

    const destList = layer.track(
      new ScrollableList(this, {
        x: panelX + content.x,
        y: panelY + content.y,
        width: content.width,
        height: content.height - 10,
        itemHeight: 36,
        onSelect: (index: number) => {
          const destPlanet = otherPlanets[index];
          if (!destPlanet) return;

          layer.destroy();

          // Step 3: Pick cargo type
          this.pickCargoType(originPlanetId, destPlanet.id);
        },
      }),
    );

    for (const p of otherPlanets) {
      const itemContainer = this.add.container(0, 0);
      const itemText = this.add.text(10, 8, `${p.name} (${p.type})`, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
        wordWrap: { width: content.width - 20 },
      });
      itemContainer.add(itemText);
      destList.addItem(itemContainer);
    }
  }

  private pickCargoType(originPlanetId: string, destPlanetId: string): void {
    const theme = getTheme();
    const cargoTypes = Object.values(CargoType) as CargoTypeValue[];

    const layer = this.ui.openLayer({ key: "routes-create-cargo" });
    layer.createOverlay({
      alpha: 0.6,
      color: theme.colors.modalOverlay,
      closeOnPointerUp: true,
    });

    const panelW = 350;
    const panelH = 420;
    const panelX = (GAME_WIDTH - panelW) / 2;
    const panelY = (GAME_HEIGHT - panelH) / 2;

    const cargoPanel = layer.track(
      new Panel(this, {
        x: panelX,
        y: panelY,
        width: panelW,
        height: panelH,
        title: "Select Cargo Type",
      }),
    );

    const content = cargoPanel.getContentArea();

    const cargoList = layer.track(
      new ScrollableList(this, {
        x: panelX + content.x,
        y: panelY + content.y,
        width: content.width,
        height: content.height - 10,
        itemHeight: 36,
        onSelect: (index: number) => {
          const selectedCargo = cargoTypes[index];
          if (!selectedCargo) return;

          // Create the route
          const freshState = gameStore.getState();
          const originPlanet = freshState.galaxy.planets.find(
            (p) => p.id === originPlanetId,
          );
          const destPlanet = freshState.galaxy.planets.find(
            (p) => p.id === destPlanetId,
          );

          if (!originPlanet || !destPlanet) return;

          const distance = calculateDistance(
            originPlanet,
            destPlanet,
            freshState.galaxy.systems,
          );

          const route = createRoute(
            originPlanetId,
            destPlanetId,
            distance,
            selectedCargo,
          );

          gameStore.update({
            activeRoutes: [...freshState.activeRoutes, route],
          });

          layer.destroy();

          this.refreshTable();
        },
      }),
    );

    for (const ct of cargoTypes) {
      const itemContainer = this.add.container(0, 0);
      const itemText = this.add.text(10, 8, ct, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
      });
      itemContainer.add(itemText);
      cargoList.addItem(itemContainer);
    }
  }

  private confirmDeleteRoute(): void {
    if (!this.selectedRouteId) {
      const noSelectModal = new Modal(this, {
        title: "No Route Selected",
        body: "Please select a route from the table first.",
        onOk: () => {
          noSelectModal.destroy();
        },
      });
      noSelectModal.show();
      return;
    }

    const modal = new Modal(this, {
      title: "Delete Route",
      body: "Are you sure you want to delete this route? All assigned ships will be unassigned.",
      onOk: () => {
        const freshState = gameStore.getState();
        const { fleet, routes } = deleteRoute(
          this.selectedRouteId!,
          freshState.fleet,
          freshState.activeRoutes,
        );
        gameStore.update({ fleet, activeRoutes: routes });
        this.selectedRouteId = null;
        modal.destroy();
        this.refreshTable();
      },
      onCancel: () => {
        modal.destroy();
      },
    });
    modal.show();
  }

  private showAssignShip(): void {
    if (!this.selectedRouteId) {
      const noSelectModal = new Modal(this, {
        title: "No Route Selected",
        body: "Please select a route from the table first.",
        onOk: () => {
          noSelectModal.destroy();
        },
      });
      noSelectModal.show();
      return;
    }

    const theme = getTheme();
    const state = gameStore.getState();
    const availableShips = state.fleet.filter((s) => !s.assignedRouteId);

    if (availableShips.length === 0) {
      const noShipsModal = new Modal(this, {
        title: "No Available Ships",
        body: "All ships are currently assigned to routes. Unassign a ship first or buy a new one.",
        onOk: () => {
          noShipsModal.destroy();
        },
      });
      noShipsModal.show();
      return;
    }

    const layer = this.ui.openLayer({ key: "routes-assign-ship" });
    layer.createOverlay({
      alpha: 0.6,
      color: theme.colors.modalOverlay,
      closeOnPointerUp: true,
    });

    const panelW = 450;
    const panelH = 400;
    const panelX = (GAME_WIDTH - panelW) / 2;
    const panelY = (GAME_HEIGHT - panelH) / 2;

    const shipPanel = layer.track(
      new Panel(this, {
        x: panelX,
        y: panelY,
        width: panelW,
        height: panelH,
        title: "Assign Ship",
      }),
    );

    const content = shipPanel.getContentArea();
    const routeId = this.selectedRouteId;

    const shipList = layer.track(
      new ScrollableList(this, {
        x: panelX + content.x,
        y: panelY + content.y,
        width: content.width,
        height: content.height - 50,
        itemHeight: 40,
        onSelect: (index: number) => {
          const ship = availableShips[index];
          if (!ship || !routeId) return;

          const freshState = gameStore.getState();
          const result = assignShipToRoute(
            ship.id,
            routeId,
            freshState.fleet,
            freshState.activeRoutes,
          );
          gameStore.update({
            fleet: result.fleet,
            activeRoutes: result.routes,
          });

          layer.destroy();
          this.refreshTable();
        },
      }),
    );

    for (const ship of availableShips) {
      const itemContainer = this.add.container(0, 0);
      const nameText = this.add.text(10, 4, `${ship.name} (${ship.class})`, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
        wordWrap: { width: content.width - 20 },
      });
      const statsText = this.add.text(
        10,
        22,
        `Cargo: ${ship.cargoCapacity}  Pax: ${ship.passengerCapacity}  Spd: ${ship.speed}`,
        {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
          wordWrap: { width: content.width - 20 },
        },
      );
      itemContainer.add([nameText, statsText]);
      shipList.addItem(itemContainer);
    }

    layer.track(
      new Button(this, {
        x: panelX + panelW - content.x - 100,
        y: panelY + panelH - 50,
        width: 100,
        label: "Close",
        onClick: () => {
          layer.destroy();
        },
      }),
    );
  }

  private showSetCargo(): void {
    if (!this.selectedRouteId) {
      const noSelectModal = new Modal(this, {
        title: "No Route Selected",
        body: "Please select a route from the table first.",
        onOk: () => {
          noSelectModal.destroy();
        },
      });
      noSelectModal.show();
      return;
    }

    const theme = getTheme();
    const cargoTypes = Object.values(CargoType) as CargoTypeValue[];
    const routeId = this.selectedRouteId;

    const layer = this.ui.openLayer({ key: "routes-set-cargo" });
    layer.createOverlay({
      alpha: 0.6,
      color: theme.colors.modalOverlay,
      closeOnPointerUp: true,
    });

    const panelW = 350;
    const panelH = 400;
    const panelX = (GAME_WIDTH - panelW) / 2;
    const panelY = (GAME_HEIGHT - panelH) / 2;

    const cargoPanel = layer.track(
      new Panel(this, {
        x: panelX,
        y: panelY,
        width: panelW,
        height: panelH,
        title: "Set Cargo Type",
      }),
    );

    const content = cargoPanel.getContentArea();

    const cargoList = layer.track(
      new ScrollableList(this, {
        x: panelX + content.x,
        y: panelY + content.y,
        width: content.width,
        height: content.height - 50,
        itemHeight: 36,
        onSelect: (index: number) => {
          const selectedCargo = cargoTypes[index];
          if (!selectedCargo || !routeId) return;

          const freshState = gameStore.getState();
          const updatedRoutes = freshState.activeRoutes.map((r) =>
            r.id === routeId ? { ...r, cargoType: selectedCargo } : r,
          );
          gameStore.update({ activeRoutes: updatedRoutes });

          layer.destroy();
          this.refreshTable();
        },
      }),
    );

    for (const ct of cargoTypes) {
      const itemContainer = this.add.container(0, 0);
      const itemText = this.add.text(10, 8, ct, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
      });
      itemContainer.add(itemText);
      cargoList.addItem(itemContainer);
    }

    layer.track(
      new Button(this, {
        x: panelX + panelW - content.x - 100,
        y: panelY + panelH - 50,
        width: 100,
        label: "Close",
        onClick: () => {
          layer.destroy();
        },
      }),
    );
  }
}

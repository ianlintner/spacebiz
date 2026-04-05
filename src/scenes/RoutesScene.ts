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
import { openRouteBuilder } from "../ui/RouteBuilderPanel.ts";
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
  private selectedRouteSummary!: Phaser.GameObjects.Text;
  private selectedRouteHint!: Phaser.GameObjects.Text;
  private deleteRouteButton!: Button;
  private assignShipButton!: Button;
  private setCargoButton!: Button;

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

    this.selectedRouteSummary = this.add.text(
      absX,
      absY,
      "Pick a route to manage it",
      {
        fontSize: `${getTheme().fonts.value.size}px`,
        fontFamily: getTheme().fonts.value.family,
        color: colorToString(getTheme().colors.accent),
        wordWrap: { width: content.width },
      },
    );

    this.selectedRouteHint = this.add.text(
      absX,
      absY + 24,
      "Enter on a route continues the next useful step. Unassigned routes need a ship before profit estimates appear.",
      {
        fontSize: `${getTheme().fonts.caption.size}px`,
        fontFamily: getTheme().fonts.caption.family,
        color: colorToString(getTheme().colors.textDim),
        wordWrap: { width: content.width },
      },
    );

    // Route table
    this.routeTable = new DataTable(this, {
      x: absX,
      y: absY + 54,
      width: content.width,
      height: content.height - 104,
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
      keyboardNavigation: true,
      autoFocus: true,
      emptyStateText: "No trade routes yet",
      emptyStateHint: "Create a route to start assigning ships and cargo.",
      onRowActivate: () => {
        this.activateSelectedRoute();
      },
      onRowSelect: (_rowIndex, rowData) => {
        this.selectedRouteId = rowData["id"] as string;
        this.updateSelectedRouteUi();
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

    this.deleteRouteButton = new Button(this, {
      x: absX + 160,
      y: buttonY,
      width: 140,
      label: "Delete Route",
      disabled: true,
      onClick: () => this.confirmDeleteRoute(),
    });

    this.assignShipButton = new Button(this, {
      x: absX + 320,
      y: buttonY,
      width: 140,
      label: "Assign Ship",
      disabled: true,
      onClick: () => this.showAssignShip(),
    });

    this.setCargoButton = new Button(this, {
      x: absX + 480,
      y: buttonY,
      width: 140,
      label: "Set Cargo",
      disabled: true,
      onClick: () => this.showSetCargo(),
    });

    this.updateSelectedRouteUi();
  }

  private refreshTable(): void {
    const state = gameStore.getState();

    if (
      this.selectedRouteId &&
      !state.activeRoutes.some((route) => route.id === this.selectedRouteId)
    ) {
      this.selectedRouteId = null;
    }

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
    this.updateSelectedRouteUi();
  }

  private updateSelectedRouteUi(): void {
    const theme = getTheme();
    const state = gameStore.getState();
    const route = state.activeRoutes.find(
      (entry) => entry.id === this.selectedRouteId,
    );

    const hasSelection = Boolean(route);
    this.deleteRouteButton?.setDisabled(!hasSelection);
    this.assignShipButton?.setDisabled(!hasSelection);
    this.setCargoButton?.setDisabled(!hasSelection);

    if (!route) {
      this.selectedRouteSummary?.setText("Pick a route to manage it");
      this.selectedRouteHint?.setText(
        "Create a route, then assign a ship and fine-tune cargo from here. Enter on a selected route opens the next useful step.",
      );
      this.portrait?.updatePortrait("planet", 0, "Select a Route", [], {
        planetType: "terran",
      });
      return;
    }

    const origin = state.galaxy.planets.find(
      (planet) => planet.id === route.originPlanetId,
    );
    const destination = state.galaxy.planets.find(
      (planet) => planet.id === route.destinationPlanetId,
    );
    const destinationIndex = destination
      ? state.galaxy.planets.indexOf(destination)
      : 0;
    const firstShip = route.assignedShipIds[0]
      ? state.fleet.find((ship) => ship.id === route.assignedShipIds[0])
      : undefined;

    if (destination) {
      this.portrait.updatePortrait(
        "planet",
        destinationIndex,
        destination.name,
        [
          { label: "Type", value: destination.type },
          { label: "Distance", value: route.distance.toFixed(1) },
          { label: "Cargo", value: route.cargoType ?? "None" },
          {
            label: "Ships",
            value: route.assignedShipIds.length.toString(),
          },
        ],
        { planetType: destination.type },
      );
    }

    const routeTitle = `${origin?.name ?? "Origin"} → ${destination?.name ?? "Destination"}`;
    this.selectedRouteSummary.setText(routeTitle);

    if (route.assignedShipIds.length === 0) {
      this.selectedRouteHint.setText(
        "Next step: assign a ship to start flying this route. Press Enter or use Assign Ship.",
      );
      this.assignShipButton.setLabel("Assign Ship");
    } else if (!firstShip) {
      this.selectedRouteHint.setText(
        "This route has assigned ship IDs but no matching ship was found. Delete or reassign to recover.",
      );
      this.assignShipButton.setLabel("Assign Ship");
    } else {
      const revenue = route.cargoType
        ? estimateRouteRevenue(route, firstShip, state.market)
        : null;
      const fuel = route.cargoType
        ? estimateRouteFuelCost(route, firstShip, state.market.fuelPrice)
        : null;
      const profit = revenue != null && fuel != null ? revenue - fuel : null;
      const profitLabel =
        profit == null
          ? "—"
          : `${profit >= 0 ? "profit" : "loss"} ${formatCash(profit)}`;
      this.selectedRouteHint.setText(
        `Assigned: ${firstShip.name}. Cargo: ${route.cargoType ?? "None"}. Current estimate: ${profitLabel}. Enter adjusts cargo; Assign Ship adds another ship.`,
      );
      this.assignShipButton.setLabel(
        route.assignedShipIds.length > 0 ? "Add Ship" : "Assign Ship",
      );
    }

    this.selectedRouteSummary.setColor(colorToString(theme.colors.accent));
  }

  private activateSelectedRoute(): void {
    const route = gameStore
      .getState()
      .activeRoutes.find((entry) => entry.id === this.selectedRouteId);
    if (!route) {
      return;
    }

    if (route.assignedShipIds.length === 0) {
      this.showAssignShip();
      return;
    }

    this.showSetCargo();
  }

  private startCreateRoute(): void {
    openRouteBuilder(this, {
      ui: this.ui,
      title: "Create Trade Route",
      confirmLabel: "Create Route",
      allowAutoBuy: true,
      onComplete: () => {
        this.refreshTable();
      },
    });
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
        keyboardNavigation: true,
        autoFocus: true,
        onCancel: () => {
          layer.destroy();
        },
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
        keyboardNavigation: true,
        autoFocus: true,
        onCancel: () => {
          layer.destroy();
        },
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

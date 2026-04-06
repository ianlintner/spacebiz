import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { ShipClass } from "../data/types.ts";
import type { Ship, ShipClass as ShipClassType } from "../data/types.ts";
import { SHIP_TEMPLATES } from "../data/constants.ts";
import {
  getTheme,
  colorToString,
  Label,
  Button,
  DataTable,
  Modal,
  ScrollableList,
  Panel,
  PortraitPanel,
  SceneUiDirector,
  createStarfield,
  GAME_WIDTH,
  GAME_HEIGHT,
  CONTENT_TOP,
  CONTENT_HEIGHT,
  SIDEBAR_LEFT,
  SIDEBAR_WIDTH,
  MAIN_CONTENT_LEFT,
  MAIN_CONTENT_WIDTH,
} from "../ui/index.ts";
import {
  buyShip,
  sellShip,
  overhaulShip,
  calculateShipValue,
} from "../game/fleet/FleetManager.ts";

function formatCash(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return sign + "\u00A7" + abs.toLocaleString("en-US");
}

function conditionColor(value: unknown): number {
  const cond = value as number;
  const theme = getTheme();
  if (cond > 70) return theme.colors.profit;
  if (cond >= 40) return theme.colors.warning;
  return theme.colors.loss;
}

export class FleetScene extends Phaser.Scene {
  private selectedShipId: string | null = null;
  private fleetTable!: DataTable;
  private portrait!: PortraitPanel;
  private ui!: SceneUiDirector;

  constructor() {
    super({ key: "FleetScene" });
  }

  create(): void {
    const theme = getTheme();
    this.selectedShipId = null;
    this.ui = new SceneUiDirector(this);

    // Starfield background
    createStarfield(this);

    // Sidebar portrait
    this.portrait = new PortraitPanel(this, {
      x: SIDEBAR_LEFT,
      y: CONTENT_TOP,
      width: SIDEBAR_WIDTH,
      height: CONTENT_HEIGHT,
    });
    this.portrait.updatePortrait("ship", 0, "Select a Ship", []);

    // Content panel
    const contentPanel = new Panel(this, {
      x: MAIN_CONTENT_LEFT,
      y: CONTENT_TOP,
      width: MAIN_CONTENT_WIDTH,
      height: CONTENT_HEIGHT,
      title: "Fleet Management",
    });
    const content = contentPanel.getContentArea();
    const absX = MAIN_CONTENT_LEFT + content.x;
    const absY = CONTENT_TOP + content.y;

    // Cash display inside content panel header area
    const state = gameStore.getState();
    const cashLabel = new Label(this, {
      x: MAIN_CONTENT_LEFT + MAIN_CONTENT_WIDTH - 16,
      y: absY + 2,
      text: `Cash: ${formatCash(state.cash)}`,
      style: "value",
      color: theme.colors.accent,
    });
    cashLabel.setOrigin(1, 0);

    // Fleet table
    this.fleetTable = new DataTable(this, {
      x: absX,
      y: absY + 28,
      width: content.width,
      height: content.height - 80,
      columns: [
        { key: "name", label: "Name", width: 110, sortable: true },
        { key: "class", label: "Class", width: 100, sortable: true },
        {
          key: "cargo",
          label: "Cargo",
          width: 70,
          align: "right",
          sortable: true,
        },
        {
          key: "pax",
          label: "Pax",
          width: 60,
          align: "right",
          sortable: true,
        },
        {
          key: "speed",
          label: "Speed",
          width: 60,
          align: "right",
          sortable: true,
        },
        {
          key: "condition",
          label: "Condition",
          width: 85,
          align: "right",
          sortable: true,
          format: (v) => `${Math.round(v as number)}%`,
          colorFn: conditionColor,
        },
        { key: "route", label: "Route", width: 130, sortable: true },
        {
          key: "maintenance",
          label: "Maint.",
          width: 100,
          align: "right",
          sortable: true,
          format: (v) => formatCash(v as number),
        },
        {
          key: "value",
          label: "Value",
          width: 100,
          align: "right",
          format: (v) => formatCash(v as number),
        },
      ],
      keyboardNavigation: true,
      autoFocus: true,
      emptyStateText: "No ships in your fleet",
      emptyStateHint: "Buy your first ship to begin building routes.",
      onRowSelect: (rowIndex, rowData) => {
        this.selectedShipId = rowData["id"] as string;
        const currentState = gameStore.getState();
        const ship = currentState.fleet.find(
          (s) => s.id === this.selectedShipId,
        );
        if (ship) {
          const template = SHIP_TEMPLATES[ship.class];
          this.portrait.updatePortrait(
            "ship",
            rowIndex,
            ship.name,
            [
              { label: "Class", value: template.name },
              {
                label: "Condition",
                value: `${Math.round(ship.condition)}%`,
              },
              { label: "Speed", value: ship.speed.toString() },
              { label: "Cargo", value: ship.cargoCapacity.toString() },
            ],
            { shipClass: ship.class },
          );
        }
      },
    });

    this.refreshTable();

    // Buttons at bottom of content panel
    const buttonY = absY + content.height - 40;

    new Button(this, {
      x: absX,
      y: buttonY,
      width: 130,
      label: "Buy Ship",
      onClick: () => this.showBuyShipPanel(),
    });

    new Button(this, {
      x: absX + 150,
      y: buttonY,
      width: 130,
      label: "Sell Ship",
      onClick: () => this.confirmSellShip(),
    });

    new Button(this, {
      x: absX + 300,
      y: buttonY,
      width: 130,
      label: "Overhaul",
      onClick: () => this.confirmOverhaul(),
    });
  }

  private refreshTable(): void {
    const state = gameStore.getState();
    const routeMap = new Map<string, string>();
    for (const route of state.activeRoutes) {
      const origin = state.galaxy.planets.find(
        (p) => p.id === route.originPlanetId,
      );
      const dest = state.galaxy.planets.find(
        (p) => p.id === route.destinationPlanetId,
      );
      const routeName =
        origin && dest ? `${origin.name} -> ${dest.name}` : route.id;
      routeMap.set(route.id, routeName);
    }

    const rows = state.fleet.map((ship: Ship) => ({
      id: ship.id,
      name: ship.name,
      class: ship.class,
      cargo: ship.cargoCapacity,
      pax: ship.passengerCapacity,
      speed: ship.speed,
      condition: ship.condition,
      route: ship.assignedRouteId
        ? (routeMap.get(ship.assignedRouteId) ?? "Assigned")
        : "Idle",
      maintenance: ship.maintenanceCost,
      value: calculateShipValue(ship),
    }));

    this.fleetTable.setRows(rows);
  }

  private showBuyShipPanel(): void {
    const theme = getTheme();
    const state = gameStore.getState();
    const layer = this.ui.openLayer({ key: "fleet-buy-ship" });
    layer.createOverlay({
      alpha: 0.6,
      color: theme.colors.modalOverlay,
      closeOnPointerUp: true,
    });

    const panelW = 600;
    const panelH = 500;
    const panelX = (GAME_WIDTH - panelW) / 2;
    const panelY = (GAME_HEIGHT - panelH) / 2;

    const buyPanel = layer.track(
      new Panel(this, {
        x: panelX,
        y: panelY,
        width: panelW,
        height: panelH,
        title: "Buy Ship",
      }),
    );

    const content = buyPanel.getContentArea();

    const list = layer.track(
      new ScrollableList(this, {
        x: panelX + content.x,
        y: panelY + content.y,
        width: content.width,
        height: content.height - 50,
        itemHeight: 48,
        keyboardNavigation: true,
        autoFocus: true,
        onCancel: () => {
          layer.destroy();
        },
        onSelect: (index: number) => {
          const shipClasses = Object.values(ShipClass) as ShipClassType[];
          const selectedClass = shipClasses[index];
          if (!selectedClass) return;

          const template = SHIP_TEMPLATES[selectedClass];
          const freshState = gameStore.getState();

          if (freshState.cash < template.purchaseCost) {
            const errorModal = new Modal(this, {
              title: "Insufficient Funds",
              body: `You need ${formatCash(template.purchaseCost)} but only have ${formatCash(freshState.cash)}.`,
              onOk: () => {
                errorModal.destroy();
              },
            });
            errorModal.show();
            return;
          }

          const { ship, cost } = buyShip(selectedClass, freshState.fleet);
          gameStore.update({
            fleet: [...freshState.fleet, ship],
            cash: freshState.cash - cost,
          });

          layer.destroy();
          this.refreshTable();
        },
      }),
    );

    const shipClasses = Object.values(ShipClass) as ShipClassType[];
    for (const sc of shipClasses) {
      const template = SHIP_TEMPLATES[sc];
      const canAfford = state.cash >= template.purchaseCost;
      const itemContainer = this.add.container(0, 0);

      const nameText = this.add.text(10, 6, template.name, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(
          canAfford ? theme.colors.text : theme.colors.textDim,
        ),
      });

      const statsText = this.add.text(
        10,
        26,
        `Cargo: ${template.cargoCapacity}  Pax: ${template.passengerCapacity}  Spd: ${template.speed}  Cost: ${formatCash(template.purchaseCost)}`,
        {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
          wordWrap: { width: content.width - 20 },
        },
      );

      itemContainer.add([nameText, statsText]);
      list.addItem(itemContainer);
    }

    // Close button for buy panel
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

  private confirmSellShip(): void {
    if (!this.selectedShipId) {
      const noSelectModal = new Modal(this, {
        title: "No Ship Selected",
        body: "Please select a ship from the table first.",
        onOk: () => {
          noSelectModal.destroy();
        },
      });
      noSelectModal.show();
      return;
    }

    const state = gameStore.getState();
    const ship = state.fleet.find((s) => s.id === this.selectedShipId);
    if (!ship) return;

    const salePrice = calculateShipValue(ship);

    const modal = new Modal(this, {
      title: "Sell Ship",
      body: `Sell ${ship.name} for ${formatCash(salePrice)}?`,
      onOk: () => {
        const freshState = gameStore.getState();
        const { updatedFleet, salePrice: price } = sellShip(
          this.selectedShipId!,
          freshState.fleet,
        );
        gameStore.update({
          fleet: updatedFleet,
          cash: freshState.cash + price,
        });
        this.selectedShipId = null;
        modal.destroy();
        this.refreshTable();
      },
      onCancel: () => {
        modal.destroy();
      },
    });
    modal.show();
  }

  private confirmOverhaul(): void {
    if (!this.selectedShipId) {
      const noSelectModal = new Modal(this, {
        title: "No Ship Selected",
        body: "Please select a ship from the table first.",
        onOk: () => {
          noSelectModal.destroy();
        },
      });
      noSelectModal.show();
      return;
    }

    const state = gameStore.getState();
    const ship = state.fleet.find((s) => s.id === this.selectedShipId);
    if (!ship) return;

    const cost = ship.purchaseCost * 0.3;

    if (state.cash < cost) {
      const errorModal = new Modal(this, {
        title: "Insufficient Funds",
        body: `Overhaul costs ${formatCash(cost)} but you only have ${formatCash(state.cash)}.`,
        onOk: () => {
          errorModal.destroy();
        },
      });
      errorModal.show();
      return;
    }

    const modal = new Modal(this, {
      title: "Overhaul Ship",
      body: `Overhaul ${ship.name} for ${formatCash(cost)}? This will restore condition to 90%.`,
      onOk: () => {
        const freshState = gameStore.getState();
        const { updatedFleet, cost: overhaulCost } = overhaulShip(
          this.selectedShipId!,
          freshState.fleet,
        );
        gameStore.update({
          fleet: updatedFleet,
          cash: freshState.cash - overhaulCost,
        });
        modal.destroy();
        this.refreshTable();
      },
      onCancel: () => {
        modal.destroy();
      },
    });
    modal.show();
  }
}

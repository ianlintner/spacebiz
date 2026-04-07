import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { SHIP_TEMPLATES } from "../data/constants.ts";
import { CargoType } from "../data/types.ts";
import type {
  CargoType as CargoTypeValue,
  Planet,
  Ship,
  ShipClass,
  ShipTemplate,
} from "../data/types.ts";
import { buyShip } from "../game/fleet/FleetManager.ts";
import {
  assignShipToRoute,
  calculateDistance,
  calculateLicenseFee,
  createRoute,
  estimateRouteFuelCost,
  estimateRouteRevenue,
} from "../game/routes/RouteManager.ts";
import { getLayout } from "./Layout.ts";
import { Button } from "./Button.ts";
import { Label } from "./Label.ts";
import { MiniMap } from "./MiniMap.ts";
import { Panel } from "./Panel.ts";
import { DEPTH_MODAL } from "./DepthLayers.ts";
import type { SceneUiDirector } from "./SceneUiDirector.ts";
import type { SceneUiLayer } from "./SceneUiDirector.ts";
import { getTheme } from "./Theme.ts";

const CARGO_VALUES = Object.values(CargoType) as CargoTypeValue[];

type FieldKey = "origin" | "destination" | "cargo" | "ship" | "autoBuy";

export interface RouteBuilderResult {
  routeId: string;
  originPlanetId: string;
  destinationPlanetId: string;
  cargoType: CargoTypeValue;
  assignedShipId: string | null;
  assignedShipName: string | null;
  autoBoughtShipName: string | null;
}

export interface RouteBuilderOptions {
  ui: SceneUiDirector;
  title?: string;
  confirmLabel?: string;
  initialOriginPlanetId?: string;
  initialDestinationPlanetId?: string;
  initialCargoType?: CargoTypeValue;
  lockOrigin?: boolean;
  allowAutoBuy?: boolean;
  onComplete?: (result: RouteBuilderResult) => void;
  onCancel?: () => void;
}

interface PreviewShip {
  id: string | null;
  name: string;
  cargoCapacity: number;
  passengerCapacity: number;
  speed: number;
  fuelEfficiency: number;
  purchaseCost?: number;
  isPurchasedPreview?: boolean;
}

export function openRouteBuilder(
  scene: Phaser.Scene,
  options: RouteBuilderOptions,
): void {
  const layer = options.ui.openLayer({ key: "route-builder" });
  const theme = getTheme();
  layer.createOverlay({
    alpha: 0.68,
    color: theme.colors.modalOverlay,
    closeOnPointerUp: false,
    activationDelayMs: 120,
    onPointerUp: () => {
      options.onCancel?.();
      layer.destroy();
    },
  });

  // RouteBuilderPanel creates all objects at scene level and tracks them
  new RouteBuilderPanel(scene, layer, options);
}

/**
 * RouteBuilderPanel is a plain controller class (NOT a Phaser Container).
 * All visual objects are created at absolute scene coordinates and added
 * directly to the scene's display list via layer.track(). This avoids
 * Phaser Container nesting issues where Button hitZones end up at wrong
 * coordinates and child objects may not render.
 */
class RouteBuilderPanel {
  private readonly scene: Phaser.Scene;
  private readonly layer: SceneUiLayer;
  private readonly options: RouteBuilderOptions;
  private readonly planets: Planet[];
  private readonly fieldOrder: FieldKey[];
  private readonly keyHandler: (event: KeyboardEvent) => void;
  private readonly panelX: number;
  private readonly panelY: number;
  private readonly panelWidth = 620;
  private readonly panelHeight = 620;
  private originIndex: number;
  private destinationIndex: number;
  private cargoIndex: number;
  private shipOptionIndex = 0;
  private focusedFieldIndex = 0;
  private autoBuy: boolean;
  private titleValue!: Label;
  private originValue!: Label;
  private destinationValue!: Label;
  private cargoValue!: Label;
  private shipValue!: Label;
  private autoBuyButton!: Button;
  private distanceValue!: Label;
  private recommendationValue!: Label;
  private revenueValue!: Label;
  private fuelValue!: Label;
  private profitValue!: Label;
  private statusValue!: Label;
  private hintValue!: Label;
  private fieldLabels = new Map<FieldKey, Label>();
  private fieldValues = new Map<FieldKey, Label>();
  private miniMap: MiniMap | null = null;

  constructor(
    scene: Phaser.Scene,
    layer: SceneUiLayer,
    options: RouteBuilderOptions,
  ) {
    this.scene = scene;
    this.layer = layer;
    this.options = options;
    this.planets = [...gameStore.getState().galaxy.planets];
    this.autoBuy = options.allowAutoBuy ?? true;

    const L = getLayout();
    this.panelX = Math.floor((L.gameWidth - this.panelWidth) / 2);
    this.panelY = Math.floor((L.gameHeight - this.panelHeight) / 2);

    this.originIndex = this.getInitialOriginIndex();
    this.destinationIndex = this.getInitialDestinationIndex();
    this.cargoIndex = this.getInitialCargoIndex();

    this.fieldOrder = options.lockOrigin
      ? ["destination", "cargo", "ship", "autoBuy"]
      : ["origin", "destination", "cargo", "ship", "autoBuy"];

    const panel = new Panel(scene, {
      x: this.panelX,
      y: this.panelY,
      width: this.panelWidth,
      height: this.panelHeight,
      title: options.title ?? "Route Builder",
    });
    panel.setDepth(DEPTH_MODAL);
    layer.track(panel);

    const content = panel.getContentArea();

    this.titleValue = new Label(scene, {
      x: this.panelX + content.x,
      y: this.panelY + content.y,
      text: "",
      style: "value",
    });
    this.titleValue.setDepth(DEPTH_MODAL);
    layer.track(this.titleValue);

    this.hintValue = new Label(scene, {
      x: this.panelX + content.x,
      y: this.panelY + content.y + 26,
      text: "↑ ↓ choose field • ← → change • Enter create • Esc cancel",
      style: "caption",
      color: getTheme().colors.textDim,
      maxWidth: content.width,
    });
    this.hintValue.setDepth(DEPTH_MODAL);
    layer.track(this.hintValue);

    let rowY = content.y + 66;
    this.createFieldRow("origin", "Origin", rowY, !options.lockOrigin);
    rowY += 46;
    this.createFieldRow("destination", "Destination", rowY, true);
    rowY += 46;
    this.createFieldRow("cargo", "Cargo", rowY, true);
    rowY += 46;
    this.createFieldRow("ship", "Ship", rowY, true);
    rowY += 56;

    // Wire field value labels to named properties for refreshUi()
    this.originValue = this.fieldValues.get("origin")!;
    this.destinationValue = this.fieldValues.get("destination")!;
    this.cargoValue = this.fieldValues.get("cargo")!;
    this.shipValue = this.fieldValues.get("ship")!;

    this.autoBuyButton = new Button(scene, {
      x: this.panelX + content.x,
      y: this.panelY + rowY,
      width: 260,
      label: "",
      onClick: () => {
        this.toggleAutoBuy();
      },
    });
    this.autoBuyButton.setDepth(DEPTH_MODAL);
    layer.track(this.autoBuyButton);

    rowY += 58;

    const statsTitle = new Label(scene, {
      x: this.panelX + content.x,
      y: this.panelY + rowY,
      text: "Route preview",
      style: "body",
      color: getTheme().colors.accent,
    });
    statsTitle.setDepth(DEPTH_MODAL);
    layer.track(statsTitle);

    rowY += 30;
    this.distanceValue = this.createSummaryLabel(content.x, rowY);
    rowY += 24;
    this.recommendationValue = this.createSummaryLabel(content.x, rowY);
    rowY += 24;
    this.statusValue = this.createSummaryLabel(
      content.x,
      rowY,
      getTheme().colors.textDim,
    );
    rowY += 32;
    this.revenueValue = this.createSummaryLabel(content.x, rowY);
    rowY += 24;
    this.fuelValue = this.createSummaryLabel(content.x, rowY);
    rowY += 24;
    this.profitValue = this.createSummaryLabel(content.x, rowY);

    // Mini-map: positioned bottom-right, above the confirm buttons
    const miniMapWidth = 160;
    const miniMapHeight = 120;
    const miniMapX = this.panelX + this.panelWidth - miniMapWidth - 16;
    const miniMapY = this.panelY + this.panelHeight - miniMapHeight - 58;
    this.miniMap = new MiniMap({
      scene,
      x: miniMapX,
      y: miniMapY,
      width: miniMapWidth,
      height: miniMapHeight,
      depth: DEPTH_MODAL,
    });
    for (const obj of this.miniMap.getGameObjects()) {
      layer.track(obj);
    }

    const confirmButton = new Button(scene, {
      x: this.panelX + content.x,
      y: this.panelY + this.panelHeight - 54,
      width: 180,
      label: options.confirmLabel ?? "Create Route",
      onClick: () => {
        this.confirm();
      },
    });
    confirmButton.setDepth(DEPTH_MODAL);
    layer.track(confirmButton);

    const cancelButton = new Button(scene, {
      x: this.panelX + this.panelWidth - content.x - 130,
      y: this.panelY + this.panelHeight - 54,
      width: 130,
      label: "Cancel",
      onClick: () => {
        this.cancel();
      },
    });
    cancelButton.setDepth(DEPTH_MODAL);
    layer.track(cancelButton);

    const closeButton = new Button(scene, {
      x: this.panelX + this.panelWidth - 58,
      y: this.panelY + 8,
      width: 42,
      height: 30,
      label: "×",
      onClick: () => {
        this.cancel();
      },
    });
    closeButton.setDepth(DEPTH_MODAL);
    layer.track(closeButton);

    this.keyHandler = (event: KeyboardEvent) => {
      this.handleKeyDown(event);
    };
    scene.input.keyboard?.on("keydown", this.keyHandler);
    layer.onDestroy(() => this.destroy());

    this.refreshUi();
  }

  private createSummaryLabel(x: number, y: number, color?: number): Label {
    const label = new Label(this.scene, {
      x: this.panelX + x,
      y: this.panelY + y,
      text: "",
      style: "caption",
      color,
      maxWidth: 560,
    });
    label.setDepth(DEPTH_MODAL);
    this.layer.track(label);
    return label;
  }

  private createFieldRow(
    field: FieldKey,
    labelText: string,
    rowY: number,
    editable: boolean,
  ): void {
    const theme = getTheme();
    const contentX = 16;
    const label = new Label(this.scene, {
      x: this.panelX + contentX,
      y: this.panelY + rowY + 4,
      text: labelText,
      style: "body",
      color: theme.colors.textDim,
    });
    label.setDepth(DEPTH_MODAL);
    this.layer.track(label);
    this.fieldLabels.set(field, label);

    const value = new Label(this.scene, {
      x: this.panelX + contentX + 120,
      y: this.panelY + rowY + 4,
      text: "",
      style: "value",
      maxWidth: 280,
    });
    value.setDepth(DEPTH_MODAL);
    this.layer.track(value);
    this.fieldValues.set(field, value);

    if (!editable) {
      return;
    }

    const leftButton = new Button(this.scene, {
      x: this.panelX + 430,
      y: this.panelY + rowY,
      width: 42,
      height: 32,
      label: "<",
      onClick: () => {
        this.changeField(field, -1);
      },
    });
    leftButton.setDepth(DEPTH_MODAL);
    this.layer.track(leftButton);
    const rightButton = new Button(this.scene, {
      x: this.panelX + 478,
      y: this.panelY + rowY,
      width: 42,
      height: 32,
      label: ">",
      onClick: () => {
        this.changeField(field, 1);
      },
    });
    rightButton.setDepth(DEPTH_MODAL);
    this.layer.track(rightButton);
  }

  private getInitialOriginIndex(): number {
    if (this.planets.length === 0) return 0;
    if (!this.options.initialOriginPlanetId) return 0;
    const index = this.planets.findIndex(
      (planet) => planet.id === this.options.initialOriginPlanetId,
    );
    return index >= 0 ? index : 0;
  }

  private getInitialDestinationIndex(): number {
    if (this.planets.length <= 1) return 0;

    if (this.options.initialDestinationPlanetId) {
      const initialIndex = this.planets.findIndex(
        (planet) => planet.id === this.options.initialDestinationPlanetId,
      );
      if (initialIndex >= 0 && initialIndex !== this.originIndex) {
        return initialIndex;
      }
    }

    return this.originIndex === 0 ? 1 : 0;
  }

  private getInitialCargoIndex(): number {
    if (!this.options.initialCargoType) return 0;
    const index = CARGO_VALUES.findIndex(
      (cargoType) => cargoType === this.options.initialCargoType,
    );
    return index >= 0 ? index : 0;
  }

  private getSelectedOrigin(): Planet | null {
    return this.planets[this.originIndex] ?? null;
  }

  private getSelectedDestination(): Planet | null {
    return this.planets[this.destinationIndex] ?? null;
  }

  private getSelectedCargo(): CargoTypeValue {
    return CARGO_VALUES[this.cargoIndex] ?? CargoType.Passengers;
  }

  private getAvailableShips(): Ship[] {
    return gameStore.getState().fleet.filter((ship) => !ship.assignedRouteId);
  }

  private getShipSelectionOptions(): Array<{
    id: string | null;
    label: string;
  }> {
    const options: Array<{ id: string | null; label: string }> = [
      { id: null, label: "Auto Select" },
    ];
    for (const ship of this.getAvailableShips()) {
      options.push({ id: ship.id, label: ship.name });
    }
    return options;
  }

  private getSelectedShipId(): string | null {
    const options = this.getShipSelectionOptions();
    if (this.shipOptionIndex >= options.length) {
      this.shipOptionIndex = 0;
    }
    return options[this.shipOptionIndex]?.id ?? null;
  }

  private changeField(field: FieldKey, delta: number): void {
    if (field === "origin") {
      this.originIndex = wrapIndex(
        this.originIndex + delta,
        this.planets.length,
      );
      if (this.destinationIndex === this.originIndex) {
        this.destinationIndex = wrapIndex(
          this.destinationIndex + delta,
          this.planets.length,
        );
        if (this.destinationIndex === this.originIndex) {
          this.destinationIndex = wrapIndex(
            this.destinationIndex + 1,
            this.planets.length,
          );
        }
      }
      if (this.destinationIndex === this.originIndex) {
        this.destinationIndex = wrapIndex(
          this.destinationIndex + 1,
          this.planets.length,
        );
      }
    } else if (field === "destination") {
      const nextIndex = this.findNextDestinationIndex(delta);
      this.destinationIndex = nextIndex;
    } else if (field === "cargo") {
      this.cargoIndex = wrapIndex(this.cargoIndex + delta, CARGO_VALUES.length);
    } else if (field === "ship") {
      const shipOptions = this.getShipSelectionOptions();
      this.shipOptionIndex = wrapIndex(
        this.shipOptionIndex + delta,
        shipOptions.length,
      );
    } else if (field === "autoBuy") {
      this.toggleAutoBuy();
      return;
    }

    this.refreshUi();
  }

  private findNextDestinationIndex(delta: number): number {
    if (this.planets.length <= 1) {
      return this.destinationIndex;
    }

    let nextIndex = this.destinationIndex;
    do {
      nextIndex = wrapIndex(nextIndex + delta, this.planets.length);
    } while (nextIndex === this.originIndex);

    return nextIndex;
  }

  private toggleAutoBuy(): void {
    this.autoBuy = !this.autoBuy;
    this.refreshUi();
  }

  private moveFocus(delta: number): void {
    this.focusedFieldIndex = wrapIndex(
      this.focusedFieldIndex + delta,
      this.fieldOrder.length,
    );
    this.refreshUi();
  }

  private refreshUi(): void {
    const theme = getTheme();
    const origin = this.getSelectedOrigin();
    const destination = this.getSelectedDestination();
    const cargo = this.getSelectedCargo();
    const shipOptions = this.getShipSelectionOptions();
    const shipLabel = shipOptions[this.shipOptionIndex]?.label ?? "Auto Select";

    this.originValue.setText(origin?.name ?? "—");
    this.destinationValue.setText(destination?.name ?? "—");
    this.cargoValue.setText(humanizeCargoType(cargo));
    this.shipValue.setText(shipLabel);
    this.autoBuyButton.setLabel(
      `Auto-buy if needed: ${this.autoBuy ? "ON" : "OFF"}`,
    );
    this.titleValue.setText(
      origin && destination
        ? `${origin.name} → ${destination.name}`
        : "Choose your route",
    );

    const preview = this.buildPreview();

    this.distanceValue.setText(`Distance: ${preview.distanceLabel}`);
    this.recommendationValue.setText(`Ship plan: ${preview.shipLabel}`);
    this.statusValue.setText(preview.statusLabel);
    this.revenueValue.setText(`Est. revenue: ${preview.revenueLabel}`);
    this.fuelValue.setText(`Est. fuel: ${preview.fuelLabel}`);
    this.profitValue.setText(`Est. profit: ${preview.profitLabel}`);
    this.profitValue.setLabelColor(
      preview.profitValue == null
        ? theme.colors.textDim
        : preview.profitValue >= 0
          ? theme.colors.profit
          : theme.colors.loss,
    );

    for (const [field, label] of this.fieldLabels) {
      const isActive = this.fieldOrder[this.focusedFieldIndex] === field;
      label.setLabelColor(
        isActive ? theme.colors.accent : theme.colors.textDim,
      );
      const value = this.fieldValues.get(field);
      value?.setLabelColor(isActive ? theme.colors.text : theme.colors.accent);
    }

    this.updateMiniMap();
  }

  private updateMiniMap(): void {
    if (!this.miniMap) return;

    const origin = this.getSelectedOrigin();
    const destination = this.getSelectedDestination();
    const state = gameStore.getState();

    if (!origin || !destination || origin.id === destination.id) {
      this.miniMap.drawEmpty();
      return;
    }

    const isInterSystem = origin.systemId !== destination.systemId;

    if (isInterSystem) {
      this.miniMap.drawGalaxyRoute(
        state.galaxy.systems,
        origin.systemId,
        destination.systemId,
        state.activeRoutes,
        state.galaxy.planets,
      );
    } else {
      const system = state.galaxy.systems.find((s) => s.id === origin.systemId);
      if (!system) {
        this.miniMap.drawEmpty();
        return;
      }
      const systemPlanets = state.galaxy.planets.filter(
        (p) => p.systemId === system.id,
      );
      this.miniMap.drawSystemRoute(
        system,
        systemPlanets,
        origin.id,
        destination.id,
      );
    }
  }

  private buildPreview(): {
    distanceLabel: string;
    shipLabel: string;
    statusLabel: string;
    revenueLabel: string;
    fuelLabel: string;
    profitLabel: string;
    profitValue: number | null;
  } {
    const origin = this.getSelectedOrigin();
    const destination = this.getSelectedDestination();
    const cargo = this.getSelectedCargo();
    const state = gameStore.getState();

    if (!origin || !destination || origin.id === destination.id) {
      return {
        distanceLabel: "Select two different planets",
        shipLabel: "Waiting for route",
        statusLabel: "Pick an origin and destination to see the route preview.",
        revenueLabel: "—",
        fuelLabel: "—",
        profitLabel: "—",
        profitValue: null,
      };
    }

    const distance = calculateDistance(
      origin,
      destination,
      state.galaxy.systems,
    );
    const previewShip = this.getPreviewShip(cargo);

    if (!previewShip) {
      return {
        distanceLabel: `${distance.toFixed(1)} units`,
        shipLabel: this.autoBuy
          ? "No affordable compatible ship available"
          : "No compatible ship selected",
        statusLabel: this.autoBuy
          ? "The route can still be created, but you will need to assign a ship later."
          : "Create the route now and assign a ship later in Routes.",
        revenueLabel: "—",
        fuelLabel: "—",
        profitLabel: "—",
        profitValue: null,
      };
    }

    const routePreview = createRoute(
      origin.id,
      destination.id,
      distance,
      cargo,
    );
    const revenue = estimateRouteRevenue(
      routePreview,
      previewShip as Ship,
      state.market,
    );
    const fuel = estimateRouteFuelCost(
      routePreview,
      previewShip as Ship,
      state.market.fuelPrice,
    );
    const profit = revenue - fuel;

    return {
      distanceLabel: `${distance.toFixed(1)} units`,
      shipLabel: previewShip.isPurchasedPreview
        ? `${previewShip.name} (auto-buy ${formatCash(previewShip.purchaseCost ?? 0)})`
        : previewShip.id == null
          ? previewShip.name
          : `${previewShip.name}`,
      statusLabel: previewShip.isPurchasedPreview
        ? "A compatible ship will be purchased automatically if you confirm."
        : previewShip.id == null
          ? "A compatible ship will be chosen automatically if one is free."
          : "This ship will be assigned as soon as the route is created.",
      revenueLabel: formatCash(revenue),
      fuelLabel: formatCash(fuel),
      profitLabel: formatCash(profit),
      profitValue: profit,
    };
  }

  private getPreviewShip(cargoType: CargoTypeValue): PreviewShip | null {
    const state = gameStore.getState();
    const selectedShipId = this.getSelectedShipId();

    if (selectedShipId) {
      const manualShip = state.fleet.find(
        (ship) => ship.id === selectedShipId && !ship.assignedRouteId,
      );
      if (manualShip) {
        return manualShip;
      }
    }

    const autoShip = pickBestAvailableShip(state.fleet, cargoType);
    if (autoShip) {
      return {
        ...autoShip,
        name: `${autoShip.name} (auto)`,
      };
    }

    if (!this.autoBuy) {
      return null;
    }

    const cheapestClass = getCheapestCompatibleShipClass(cargoType);
    if (!cheapestClass) {
      return null;
    }

    const template = SHIP_TEMPLATES[cheapestClass];
    if (state.cash < template.purchaseCost) {
      return null;
    }

    return templateToPreviewShip(template);
  }

  private confirm(): void {
    const latestState = gameStore.getState();
    const origin = latestState.galaxy.planets.find(
      (planet) => planet.id === this.getSelectedOrigin()?.id,
    );
    const destination = latestState.galaxy.planets.find(
      (planet) => planet.id === this.getSelectedDestination()?.id,
    );

    if (!origin || !destination || origin.id === destination.id) {
      return;
    }

    const cargo = this.getSelectedCargo();
    const distance = calculateDistance(
      origin,
      destination,
      latestState.galaxy.systems,
    );
    // Deduct route license fee
    const licenseFee = calculateLicenseFee(
      distance,
      latestState.activeRoutes.length,
    );
    if (latestState.cash < licenseFee) {
      return;
    }

    const route = createRoute(origin.id, destination.id, distance, cargo);

    let updatedFleet = [...latestState.fleet];
    let updatedRoutes = [...latestState.activeRoutes, route];
    let updatedCash = latestState.cash - licenseFee;
    let assignedShipId: string | null = null;
    let assignedShipName: string | null = null;
    let autoBoughtShipName: string | null = null;

    const selectedShipId = this.getSelectedShipId();
    if (
      selectedShipId &&
      updatedFleet.some(
        (ship) => ship.id === selectedShipId && !ship.assignedRouteId,
      )
    ) {
      assignedShipId = selectedShipId;
    } else {
      assignedShipId = pickBestAvailableShip(updatedFleet, cargo)?.id ?? null;
    }

    if (!assignedShipId && this.autoBuy) {
      const cheapestClass = getCheapestCompatibleShipClass(cargo);
      if (cheapestClass) {
        const template = SHIP_TEMPLATES[cheapestClass];
        if (updatedCash >= template.purchaseCost) {
          const { ship, cost } = buyShip(cheapestClass, updatedFleet);
          updatedFleet = [...updatedFleet, ship];
          updatedCash -= cost;
          assignedShipId = ship.id;
          autoBoughtShipName = ship.name;
        }
      }
    }

    if (assignedShipId) {
      const assignmentResult = assignShipToRoute(
        assignedShipId,
        route.id,
        updatedFleet,
        updatedRoutes,
      );
      updatedFleet = assignmentResult.fleet;
      updatedRoutes = assignmentResult.routes;
      assignedShipName =
        updatedFleet.find((ship) => ship.id === assignedShipId)?.name ?? null;
    }

    gameStore.update({
      fleet: updatedFleet,
      activeRoutes: updatedRoutes,
      cash: updatedCash,
    });

    this.options.onComplete?.({
      routeId: route.id,
      originPlanetId: origin.id,
      destinationPlanetId: destination.id,
      cargoType: cargo,
      assignedShipId,
      assignedShipName,
      autoBoughtShipName,
    });

    this.layer.destroy();
  }

  private cancel(): void {
    this.options.onCancel?.();
    this.layer.destroy();
  }

  private handleKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        this.moveFocus(-1);
        event.preventDefault();
        break;
      case "ArrowDown":
      case "KeyS":
        this.moveFocus(1);
        event.preventDefault();
        break;
      case "ArrowLeft":
      case "KeyA":
        this.changeField(this.fieldOrder[this.focusedFieldIndex], -1);
        event.preventDefault();
        break;
      case "ArrowRight":
      case "KeyD":
        this.changeField(this.fieldOrder[this.focusedFieldIndex], 1);
        event.preventDefault();
        break;
      case "Space":
        if (this.fieldOrder[this.focusedFieldIndex] === "autoBuy") {
          this.toggleAutoBuy();
          event.preventDefault();
        }
        break;
      case "Enter":
        this.confirm();
        event.preventDefault();
        break;
      case "Escape":
        this.cancel();
        event.preventDefault();
        break;
    }
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.keyHandler);
  }
}

function pickBestAvailableShip(
  fleet: Ship[],
  cargoType: CargoTypeValue,
): Ship | null {
  const availableShips = fleet.filter((ship) => !ship.assignedRouteId);
  if (availableShips.length === 0) {
    return null;
  }

  if (cargoType === CargoType.Passengers) {
    return (
      [...availableShips]
        .filter((ship) => ship.passengerCapacity > 0)
        .sort((a, b) => b.passengerCapacity - a.passengerCapacity)[0] ??
      availableShips[0]
    );
  }

  return (
    [...availableShips]
      .filter((ship) => ship.cargoCapacity > 0)
      .sort((a, b) => b.cargoCapacity - a.cargoCapacity)[0] ?? availableShips[0]
  );
}

function getCheapestCompatibleShipClass(
  cargoType: CargoTypeValue,
): ShipClass | null {
  const shipClasses = Object.keys(SHIP_TEMPLATES) as ShipClass[];
  const compatibleClasses = shipClasses.filter((shipClass) => {
    const template = SHIP_TEMPLATES[shipClass];
    return cargoType === CargoType.Passengers
      ? template.passengerCapacity > 0
      : template.cargoCapacity > 0;
  });

  compatibleClasses.sort(
    (left, right) =>
      SHIP_TEMPLATES[left].purchaseCost - SHIP_TEMPLATES[right].purchaseCost,
  );

  return compatibleClasses[0] ?? null;
}

function templateToPreviewShip(template: ShipTemplate): PreviewShip {
  return {
    id: null,
    name: template.name,
    cargoCapacity: template.cargoCapacity,
    passengerCapacity: template.passengerCapacity,
    speed: template.speed,
    fuelEfficiency: template.fuelEfficiency,
    purchaseCost: template.purchaseCost,
    isPurchasedPreview: true,
  };
}

function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

function formatCash(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}§${Math.abs(Math.round(value)).toLocaleString("en-US")}`;
}

function humanizeCargoType(cargoType: CargoTypeValue): string {
  switch (cargoType) {
    case CargoType.RawMaterials:
      return "Raw Materials";
    default:
      return cargoType.charAt(0).toUpperCase() + cargoType.slice(1);
  }
}

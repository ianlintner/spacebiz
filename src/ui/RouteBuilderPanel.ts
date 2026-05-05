import * as Phaser from "phaser";
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
  addCargoLock,
} from "../game/routes/RouteManager.ts";
import {
  validateRouteCreation,
  getEmpireForPlanet,
} from "../game/empire/EmpireAccessManager.ts";
import { findChartersForRoute } from "../game/charters/CharterManager.ts";
import { PLAYER_COMPANY_ID } from "../data/constants.ts";
import {
  getLayout,
  Button,
  Label,
  Modal,
  Panel,
  DEPTH_MODAL,
  getTheme,
} from "@spacebiz/ui";
import type { SceneUiDirector, SceneUiLayer } from "@spacebiz/ui";
import { RoutePickerMap } from "./RoutePickerMap.ts";
import { getCargoIconKey, getCargoColor } from "@rogue-universe/shared";
import {
  CARGO_VALUES,
  getCargoAtIndex,
  getInitialCargoIndex as computeInitialCargoIndex,
} from "./routeBuilderHelpers.ts";

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
    activationDelayMs: 700,
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
 *
 * Exported for unit testing of `setSize` reflow behaviour. Production code
 * should construct it via `openRouteBuilder()`.
 */
export class RouteBuilderPanel {
  private readonly scene: Phaser.Scene;
  private readonly layer: SceneUiLayer;
  private readonly options: RouteBuilderOptions;
  private readonly planets: Planet[];
  private readonly fieldOrder: FieldKey[];
  private readonly keyHandler: (event: KeyboardEvent) => void;
  private panelX: number;
  private panelY: number;
  private panelWidth: number;
  private panelHeight: number;
  private originIndex: number;
  private destinationIndex: number;
  private cargoIndex: number;
  private shipOptionIndex = 0;
  private focusedFieldIndex = 0;
  private autoBuy: boolean;
  private panel!: Panel;
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
  private cargoIcon!: Phaser.GameObjects.Image;
  private fieldLabels = new Map<FieldKey, Label>();
  private fieldValues = new Map<FieldKey, Label>();
  private fieldArrows = new Map<FieldKey, { left: Button; right: Button }>();
  private pickerColumnLeft: number = 0;
  private pickerHint!: Label;
  private confirmButton!: Button;
  private cancelButton!: Button;
  private closeButton!: Button;
  private pickerMap: RoutePickerMap | null = null;
  private nextClickSlot: "origin" | "destination" = "origin";
  private hoveredPlanetId: string | null = null;

  constructor(
    scene: Phaser.Scene,
    layer: SceneUiLayer,
    options: RouteBuilderOptions,
  ) {
    this.scene = scene;
    this.layer = layer;
    this.options = options;
    this.planets = [...gameStore.getState().galaxy.planets].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    this.autoBuy = options.allowAutoBuy ?? true;

    const L = getLayout();
    // Fit comfortably within the viewport with room for the HUD bars.
    // Width cap at 780 leaves visible context on both sides; height cap at 580
    // keeps the panel inside the content area on 720-tall canvases.
    this.panelWidth = Math.min(700, Math.max(400, L.gameWidth - 80));
    this.panelHeight = Math.min(500, Math.max(380, L.contentHeight - 48));
    this.panelX = Math.floor((L.gameWidth - this.panelWidth) / 2);
    this.panelY = Math.floor(
      L.contentTop + (L.contentHeight - this.panelHeight) / 2,
    );
    // Must be computed before createFieldRow so arrow buttons land inside it.
    this.pickerColumnLeft = Math.min(460, Math.floor(this.panelWidth * 0.6));

    this.originIndex = this.getInitialOriginIndex();
    this.destinationIndex = this.getInitialDestinationIndex();
    this.cargoIndex = this.getInitialCargoIndex();
    // Auto-select best cargo after we know origin+destination (deferred to
    // after panel construction so calculateDistance can run; overrides the
    // initial cargo index if a valid route is already pre-filled).
    const hasPrefill = !!(
      options.initialOriginPlanetId && options.initialDestinationPlanetId
    );

    this.fieldOrder = options.lockOrigin
      ? ["destination", "ship", "autoBuy"]
      : ["origin", "destination", "ship", "autoBuy"];

    this.panel = new Panel(scene, {
      x: this.panelX,
      y: this.panelY,
      width: this.panelWidth,
      height: this.panelHeight,
      title: options.title ?? "Route Builder",
    });
    this.panel.setDepth(DEPTH_MODAL);
    layer.track(this.panel);

    const content = this.panel.getContentArea();

    this.titleValue = new Label(scene, {
      x: this.panelX + content.x,
      y: this.panelY + content.y,
      text: "",
      style: "value",
    });
    this.titleValue.setDepth(DEPTH_MODAL);
    layer.track(this.titleValue);

    let rowY = content.y + 44;
    this.createFieldRow("origin", "Origin", rowY, !options.lockOrigin);
    rowY += 38;
    this.createFieldRow("destination", "Destination", rowY, true);
    rowY += 38;
    this.createFieldRow("cargo", "Cargo", rowY, false);
    rowY += 38;
    this.createFieldRow("ship", "Ship", rowY, true);
    rowY += 48;

    // Wire field value labels to named properties for refreshUi()
    this.originValue = this.fieldValues.get("origin")!;
    this.destinationValue = this.fieldValues.get("destination")!;
    this.cargoValue = this.fieldValues.get("cargo")!;
    this.shipValue = this.fieldValues.get("ship")!;

    // Cargo icon placed just before the cargo value text
    const cargoRow = this.cargoValue;
    const initialCargo = this.getSelectedCargo();
    this.cargoIcon = scene.add
      .image(cargoRow.x - 22, cargoRow.y + 8, getCargoIconKey(initialCargo))
      .setTint(getCargoColor(initialCargo))
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH_MODAL)
      .setScale(0.75);
    layer.track(this.cargoIcon);

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

    rowY += 38;

    this.distanceValue = this.createSummaryLabel(content.x, rowY);
    rowY += 20;
    this.recommendationValue = this.createSummaryLabel(content.x, rowY);
    rowY += 20;
    this.statusValue = this.createSummaryLabel(
      content.x,
      rowY,
      getTheme().colors.textDim,
    );
    rowY += 22;
    this.revenueValue = this.createSummaryLabel(content.x, rowY);
    rowY += 20;
    this.fuelValue = this.createSummaryLabel(content.x, rowY);
    rowY += 20;
    this.profitValue = this.createSummaryLabel(content.x, rowY);

    // Interactive picker map: right column. Left column (fields + stats) needs
    // ~420px; the right column gets whatever remains. On wider panels this
    // gives the map more room to breathe.
    const pickerMapPadding = 16;
    const pickerColumnLeft = Math.min(460, Math.floor(this.panelWidth * 0.6));
    const pickerMapWidth = Math.max(
      160,
      this.panelWidth - pickerColumnLeft - pickerMapPadding,
    );
    const pickerMapHeight = Math.min(240, this.panelHeight - 260);
    const pickerMapX = this.panelX + pickerColumnLeft;
    const pickerMapY = this.panelY + content.y + 70;
    this.pickerMap = new RoutePickerMap({
      scene,
      x: pickerMapX,
      y: pickerMapY,
      width: pickerMapWidth,
      height: pickerMapHeight,
      depth: DEPTH_MODAL,
      onPlanetClick: (planetId) => this.handlePlanetClick(planetId),
      onPlanetHover: (planetId) => {
        this.hoveredPlanetId = planetId;
        this.refreshPickerMap();
      },
    });
    for (const obj of this.pickerMap.getGameObjects()) {
      layer.track(obj);
    }
    this.pickerHint = new Label(scene, {
      x: pickerMapX,
      y: pickerMapY - 18,
      text: "Click a planet to set origin → click another for destination",
      style: "caption",
      color: getTheme().colors.textDim,
      maxWidth: pickerMapWidth,
    });
    this.pickerHint.setDepth(DEPTH_MODAL);
    layer.track(this.pickerHint);

    this.confirmButton = new Button(scene, {
      x: this.panelX + content.x,
      y: this.panelY + this.panelHeight - 54,
      width: 180,
      label: options.confirmLabel ?? "Create Route",
      onClick: () => {
        this.confirm();
      },
    });
    this.confirmButton.setDepth(DEPTH_MODAL);
    layer.track(this.confirmButton);

    this.cancelButton = new Button(scene, {
      x: this.panelX + this.panelWidth - content.x - 130,
      y: this.panelY + this.panelHeight - 54,
      width: 130,
      label: "Cancel",
      onClick: () => {
        this.cancel();
      },
    });
    this.cancelButton.setDepth(DEPTH_MODAL);
    layer.track(this.cancelButton);

    this.closeButton = new Button(scene, {
      x: this.panelX + this.panelWidth - 58,
      y: this.panelY + 8,
      width: 42,
      height: 30,
      label: "×",
      onClick: () => {
        this.cancel();
      },
    });
    this.closeButton.setDepth(DEPTH_MODAL);
    layer.track(this.closeButton);

    this.keyHandler = (event: KeyboardEvent) => {
      this.handleKeyDown(event);
    };
    scene.input.keyboard?.on("keydown", this.keyHandler);
    layer.onDestroy(() => this.destroy());

    if (hasPrefill) this.autoSelectBestCargo();
    this.refreshUi();
  }

  /**
   * Resize the route-builder panel and reflow all of its children. Delegates
   * the size update to the inner `Panel`, then repositions every tracked
   * label, button, and the picker map relative to the new bounds.
   *
   * The panel is normally a modal that re-instantiates per open, but having
   * `setSize` available keeps the widget consistent with `Panel`,
   * `AdviserPanel`, and `PortraitPanel` and lets callers track viewport
   * resizes while the modal is open.
   */
  public setSize(width: number, height: number): this {
    this.panelWidth = width;
    this.panelHeight = height;
    this.panel.setSize(width, height);
    this.redraw();
    return this;
  }

  /**
   * Reposition every tracked child to match the current panel bounds.
   * Called from `setSize()`. Mirrors the layout offsets used in the
   * constructor so changes here must stay in sync there.
   */
  private redraw(): void {
    const content = this.panel.getContentArea();
    const contentLeft = this.panelX + content.x;
    const contentTop = (rowY: number): number => this.panelY + rowY;
    const place = (
      child: { setPosition: (x: number, y: number) => unknown },
      rowY: number,
    ): void => {
      child.setPosition(contentLeft, contentTop(rowY));
    };

    place(this.titleValue, content.y);

    // Field rows (origin/destination/cargo/ship). The rowY sequence below
    // mirrors the constructor's `rowY` accumulator exactly.
    const rowOffsets: Array<{ field: FieldKey; rowY: number }> = [
      { field: "origin", rowY: content.y + 44 },
      { field: "destination", rowY: content.y + 44 + 38 },
      { field: "cargo", rowY: content.y + 44 + 38 * 2 },
      { field: "ship", rowY: content.y + 44 + 38 * 3 },
    ];
    const contentX = 16;
    for (const { field, rowY } of rowOffsets) {
      this.fieldLabels
        .get(field)
        ?.setPosition(this.panelX + contentX, contentTop(rowY + 4));
      this.fieldValues
        .get(field)
        ?.setPosition(this.panelX + contentX + 120, contentTop(rowY + 4));
      const arrows = this.fieldArrows.get(field);
      arrows?.left.setPosition(
        this.panelX + this.pickerColumnLeft - 92,
        contentTop(rowY),
      );
      arrows?.right.setPosition(
        this.panelX + this.pickerColumnLeft - 46,
        contentTop(rowY),
      );
    }

    // Cargo icon hugs the cargo value label.
    const cargoRow = this.fieldValues.get("cargo");
    if (cargoRow) {
      this.cargoIcon.setPosition(cargoRow.x - 22, cargoRow.y + 8);
    }

    // Auto-buy / preview column (left).
    let rowY = content.y + 44 + 38 * 3 + 48; // ship row + 48 spacer
    place(this.autoBuyButton, rowY);
    rowY += 38;
    place(this.distanceValue, rowY);
    rowY += 20;
    place(this.recommendationValue, rowY);
    rowY += 20;
    place(this.statusValue, rowY);
    rowY += 22;
    place(this.revenueValue, rowY);
    rowY += 20;
    place(this.fuelValue, rowY);
    rowY += 20;
    place(this.profitValue, rowY);

    // Picker hint anchored to the picker-map column. The picker map itself
    // currently has no `setBounds` API (it locks `x/y/width/height` at
    // construction), so its rendered geometry doesn't track `setSize`.
    // Modal lifecycle keeps the panel re-instantiated per open in practice.
    const pickerColumnLeft = 540;
    const pickerMapX = this.panelX + pickerColumnLeft;
    const pickerMapY = this.panelY + content.y + 70;
    this.pickerHint.setPosition(pickerMapX, pickerMapY - 18);

    // Action buttons along the bottom edge.
    this.confirmButton.setPosition(
      this.panelX + content.x,
      this.panelY + this.panelHeight - 54,
    );
    this.cancelButton.setPosition(
      this.panelX + this.panelWidth - content.x - 130,
      this.panelY + this.panelHeight - 54,
    );
    this.closeButton.setPosition(
      this.panelX + this.panelWidth - 58,
      this.panelY + 8,
    );

    this.refreshPickerMap();
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
      x: this.panelX + this.pickerColumnLeft - 92,
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
      x: this.panelX + this.pickerColumnLeft - 46,
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
    this.fieldArrows.set(field, { left: leftButton, right: rightButton });
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
    return computeInitialCargoIndex(this.options.initialCargoType);
  }

  private getSelectedOrigin(): Planet | null {
    return this.planets[this.originIndex] ?? null;
  }

  private getSelectedDestination(): Planet | null {
    return this.planets[this.destinationIndex] ?? null;
  }

  private getSelectedCargo(): CargoTypeValue {
    return getCargoAtIndex(this.cargoIndex);
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

  private autoSelectBestCargo(): void {
    const origin = this.getSelectedOrigin();
    const destination = this.getSelectedDestination();
    if (!origin || !destination || origin.id === destination.id) return;
    const state = gameStore.getState();
    const distance = calculateDistance(
      origin,
      destination,
      state.galaxy.systems,
      state.hyperlanes,
      state.borderPorts,
    );
    const refShip: PreviewShip = {
      id: null,
      name: "ref",
      cargoCapacity: 80,
      passengerCapacity: 40,
      speed: 1,
      fuelEfficiency: 1,
    };
    let bestCargo: CargoTypeValue | null = null;
    let bestProfit = -Infinity;
    for (const c of CARGO_VALUES) {
      try {
        const r = createRoute(origin.id, destination.id, distance, c);
        const rev = estimateRouteRevenue(
          r,
          refShip as Ship,
          state.market,
          state,
        );
        const fuel = estimateRouteFuelCost(
          r,
          refShip as Ship,
          state.market.fuelPrice,
        );
        const profit = rev - fuel;
        if (profit > bestProfit) {
          bestProfit = profit;
          bestCargo = c;
        }
      } catch {
        // skip invalid cargo types for this route
      }
    }
    if (bestCargo) {
      const idx = CARGO_VALUES.indexOf(bestCargo);
      if (idx >= 0) this.cargoIndex = idx;
    }
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
      this.autoSelectBestCargo();
    } else if (field === "destination") {
      const nextIndex = this.findNextDestinationIndex(delta);
      this.destinationIndex = nextIndex;
      this.autoSelectBestCargo();
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
    this.cargoIcon
      .setTexture(getCargoIconKey(cargo))
      .setTint(getCargoColor(cargo));
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

    const adviserHint = this.buildAdviserHint();
    this.distanceValue.setText(`Distance: ${preview.distanceLabel}`);
    this.recommendationValue.setText(adviserHint.text);
    this.recommendationValue.setLabelColor(
      adviserHint.text === ""
        ? theme.colors.textDim
        : adviserHint.isOnBest
          ? theme.colors.profit
          : theme.colors.accent,
    );
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

    this.refreshPickerMap();
  }

  private refreshPickerMap(): void {
    if (!this.pickerMap) return;
    const state = gameStore.getState();
    const origin = this.getSelectedOrigin();
    const destination = this.getSelectedDestination();
    this.pickerMap.draw({
      systems: state.galaxy.systems,
      planets: state.galaxy.planets,
      activeRoutes: state.activeRoutes,
      originPlanetId: origin?.id ?? null,
      destinationPlanetId: destination?.id ?? null,
      cargoType: this.getSelectedCargo(),
      hoveredPlanetId: this.hoveredPlanetId,
    });
  }

  private handlePlanetClick(planetId: string): void {
    const planetIndex = this.planets.findIndex((p) => p.id === planetId);
    if (planetIndex < 0) return;

    if (this.options.lockOrigin) {
      // Origin is locked — clicks only set destination
      if (planetIndex !== this.originIndex) {
        this.destinationIndex = planetIndex;
        this.autoSelectBestCargo();
      }
      this.refreshUi();
      return;
    }

    if (this.nextClickSlot === "origin") {
      this.originIndex = planetIndex;
      // Ensure destination is different
      if (this.destinationIndex === this.originIndex) {
        this.destinationIndex = wrapIndex(
          this.originIndex + 1,
          this.planets.length,
        );
      }
      this.nextClickSlot = "destination";
      this.autoSelectBestCargo();
    } else {
      if (planetIndex === this.originIndex) {
        // Clicking origin again resets — treat next click as origin
        this.nextClickSlot = "origin";
        return;
      }
      this.destinationIndex = planetIndex;
      this.nextClickSlot = "origin";
      this.autoSelectBestCargo();
    }
    this.refreshUi();
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
        distanceLabel: "Select origin and destination",
        shipLabel: "",
        statusLabel: "",
        revenueLabel: "—",
        fuelLabel: "—",
        profitLabel: "—",
        profitValue: null,
      };
    }

    // Check for empire access / trade policy issues
    const validationError = validateRouteCreation(
      origin.id,
      destination.id,
      cargo,
      state,
    );
    if (validationError) {
      const distance = calculateDistance(
        origin,
        destination,
        state.galaxy.systems,
        state.hyperlanes,
        state.borderPorts,
      );
      return {
        distanceLabel: `${distance.toFixed(1)} units`,
        shipLabel: "—",
        statusLabel: `\u26A0 ${validationError}`,
        revenueLabel: "—",
        fuelLabel: "—",
        profitLabel: "—",
        profitValue: null,
      };
    }

    // Show tariff info for inter-empire routes
    const originEmpireId = getEmpireForPlanet(
      origin.id,
      state.galaxy.systems,
      state.galaxy.planets,
    );
    const destEmpireId = getEmpireForPlanet(
      destination.id,
      state.galaxy.systems,
      state.galaxy.planets,
    );
    const isInterEmpire =
      originEmpireId && destEmpireId && originEmpireId !== destEmpireId;
    const destEmpire = isInterEmpire
      ? (state.galaxy.empires ?? []).find((e) => e.id === destEmpireId)
      : undefined;
    const tariffNote = destEmpire
      ? ` \u2022 Tariff ${Math.round(destEmpire.tariffRate * 100)}%`
      : "";

    const distance = calculateDistance(
      origin,
      destination,
      state.galaxy.systems,
      state.hyperlanes,
      state.borderPorts,
    );
    const previewShip = this.getPreviewShip(cargo);

    if (!previewShip) {
      return {
        distanceLabel: `${distance.toFixed(1)} units${tariffNote}`,
        shipLabel: "",
        statusLabel: this.autoBuy
          ? "No ship available — assign later"
          : "No ship — assign later",
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
      state,
    );
    const fuel = estimateRouteFuelCost(
      routePreview,
      previewShip as Ship,
      state.market.fuelPrice,
    );
    const profit = revenue - fuel;

    return {
      distanceLabel: `${distance.toFixed(1)} units${tariffNote}`,
      shipLabel: previewShip.isPurchasedPreview
        ? `${previewShip.name} (auto-buy ${formatCash(previewShip.purchaseCost ?? 0)})`
        : previewShip.id == null
          ? previewShip.name
          : `${previewShip.name}`,
      statusLabel: previewShip.isPurchasedPreview
        ? "Ship will be purchased on confirm"
        : previewShip.id == null
          ? "Ship auto-assigned when available"
          : "Ship assigned on create",
      revenueLabel: formatCash(revenue),
      fuelLabel: formatCash(fuel),
      profitLabel: formatCash(profit),
      profitValue: profit,
    };
  }

  private buildAdviserHint(): {
    text: string;
    isOnBest: boolean;
  } {
    const origin = this.getSelectedOrigin();
    const destination = this.getSelectedDestination();
    if (!origin || !destination || origin.id === destination.id) {
      return { text: "", isOnBest: false };
    }
    const state = gameStore.getState();
    const distance = calculateDistance(
      origin,
      destination,
      state.galaxy.systems,
      state.hyperlanes,
      state.borderPorts,
    );
    const refShip: PreviewShip = {
      id: null,
      name: "ref",
      cargoCapacity: 80,
      passengerCapacity: 40,
      speed: 1,
      fuelEfficiency: 1,
    };

    let bestCargo: CargoTypeValue | null = null;
    let bestProfit = -Infinity;
    for (const c of CARGO_VALUES) {
      try {
        const r = createRoute(origin.id, destination.id, distance, c);
        const rev = estimateRouteRevenue(
          r,
          refShip as Ship,
          state.market,
          state,
        );
        const fuel = estimateRouteFuelCost(
          r,
          refShip as Ship,
          state.market.fuelPrice,
        );
        const profit = rev - fuel;
        if (profit > bestProfit) {
          bestProfit = profit;
          bestCargo = c;
        }
      } catch {
        // Skip cargo types that fail validation
      }
    }

    if (!bestCargo) return { text: "", isOnBest: false };

    const selectedCargo = this.getSelectedCargo();
    const isOnBest = selectedCargo === bestCargo;
    const bestLabel = humanizeCargoType(bestCargo);
    const text = isOnBest
      ? `★ Adviser: ${bestLabel} selected — highest margin for this route`
      : `★ Adviser: ${bestLabel} has better margins for this route`;
    return { text, isOnBest };
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

    // Validate route creation (slots, empire access, trade policies, cargo locks)
    const validationError = validateRouteCreation(
      origin.id,
      destination.id,
      cargo,
      latestState,
    );
    if (validationError) {
      this.statusValue.setText(`\u26A0 ${validationError}`);
      this.statusValue.setLabelColor(getTheme().colors.loss);
      const errModal = new Modal(this.scene, {
        title: "Cannot Create Route",
        body: validationError,
        onOk: () => errModal.destroy(),
      });
      errModal.show();
      return;
    }

    // Charter check — every new route must be backed by a held charter
    // matching the route's empire and pool (domestic / foreign).
    const charterMatch = findChartersForRoute(
      latestState,
      PLAYER_COMPANY_ID,
      origin.id,
      destination.id,
    );
    if ("error" in charterMatch) {
      const destEmpireId = getEmpireForPlanet(
        destination.id,
        latestState.galaxy.systems,
        latestState.galaxy.planets,
      );
      const destEmpire = (latestState.galaxy.empires ?? []).find(
        (e) => e.id === destEmpireId,
      );
      const empireName = destEmpire?.name ?? "this empire";
      const message =
        charterMatch.error === "no-matching-charter"
          ? `You don't hold a charter in ${empireName}. Acquire one through a contract or auction before opening this route.`
          : "Route endpoints could not be classified into an empire pool.";
      this.statusValue.setText(`⚠ ${message}`);
      this.statusValue.setLabelColor(getTheme().colors.loss);
      const errModal2 = new Modal(this.scene, {
        title: "Charter Required",
        body: message,
        onOk: () => errModal2.destroy(),
      });
      errModal2.show();
      return;
    }

    const distance = calculateDistance(
      origin,
      destination,
      latestState.galaxy.systems,
      latestState.hyperlanes,
      latestState.borderPorts,
    );
    // Deduct route license fee
    const licenseFee = calculateLicenseFee(
      distance,
      latestState.activeRoutes.length,
    );
    if (latestState.cash < licenseFee) {
      this.statusValue.setText(
        `\u26A0 Insufficient funds — license fee: §${licenseFee.toLocaleString("en-US")}`,
      );
      this.statusValue.setLabelColor(getTheme().colors.loss);
      const fundsModal = new Modal(this.scene, {
        title: "Insufficient Funds",
        body: `License fee: §${licenseFee.toLocaleString("en-US")}. You only have §${Math.floor(latestState.cash).toLocaleString("en-US")}.`,
        onOk: () => fundsModal.destroy(),
      });
      fundsModal.show();
      return;
    }

    const route = createRoute(
      origin.id,
      destination.id,
      distance,
      cargo,
      charterMatch.charterId,
    );

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

    // Track inter-empire cargo lock
    const updatedLocks = addCargoLock(
      origin.id,
      destination.id,
      cargo,
      route.id,
      latestState.galaxy.systems,
      latestState.galaxy.planets,
      latestState.interEmpireCargoLocks,
    );

    gameStore.update({
      fleet: updatedFleet,
      activeRoutes: updatedRoutes,
      interEmpireCargoLocks: updatedLocks,
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

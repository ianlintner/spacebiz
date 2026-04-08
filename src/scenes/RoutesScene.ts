import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { CargoType } from "../data/types.ts";
import type { CargoType as CargoTypeValue } from "../data/types.ts";
import {
  getTheme,
  colorToString,
  Button,
  DataTable,
  MiniMap,
  Modal,
  ScrollableList,
  Panel,
  TabGroup,
  PortraitPanel,
  openRouteBuilder,
  SceneUiDirector,
  createStarfield,
  getLayout,
  getCargoIconKey,
  getCargoColor,
  getCargoLabel,
  getShipIconKey,
  getShipColor,
} from "../ui/index.ts";
import {
  assignShipToRoute,
  calculateDistance,
  calculateLicenseFee,
  createRoute,
  deleteRoute,
  estimateRouteRevenue,
  estimateRouteFuelCost,
  scanAllRouteOpportunities,
} from "../game/routes/RouteManager.ts";
import type { RouteOpportunity } from "../game/routes/RouteManager.ts";
import { buyShip } from "../game/fleet/FleetManager.ts";
import { SHIP_TEMPLATES } from "../data/constants.ts";
import type { ShipClass } from "../data/types.ts";

function formatCash(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return sign + "\u00A7" + abs.toLocaleString("en-US");
}

function formatCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}§${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}§${(abs / 1_000).toFixed(0)}K`;
  if (abs >= 1_000) return `${sign}§${(abs / 1_000).toFixed(1)}K`;
  return `${sign}§${Math.round(abs)}`;
}

function trendArrow(trend: "rising" | "stable" | "falling"): string {
  if (trend === "rising") return "\u25B2";
  if (trend === "falling") return "\u25BC";
  return "\u25C6";
}

function humanizeCargo(ct: CargoTypeValue): string {
  if (ct === "rawMaterials") return "Raw Mat.";
  return ct.charAt(0).toUpperCase() + ct.slice(1);
}

export class RoutesScene extends Phaser.Scene {
  // ── Active Routes tab state ──
  private selectedRouteId: string | null = null;
  private routeTable!: DataTable;
  private portrait!: PortraitPanel;
  private ui!: SceneUiDirector;
  private selectedRouteSummary!: Phaser.GameObjects.Text;
  private selectedRouteHint!: Phaser.GameObjects.Text;
  private deleteRouteButton!: Button;
  private assignShipButton!: Button;
  private setCargoButton!: Button;

  // ── Route Finder tab state ──
  private finderTable!: DataTable;
  private finderSummary!: Phaser.GameObjects.Text;
  private opportunities: RouteOpportunity[] = [];
  private finderCargoFilter: CargoTypeValue | null = null;
  private filterButtons: Button[] = [];

  // ── Sidebar mini-map ──
  private miniMap!: MiniMap;

  constructor() {
    super({ key: "RoutesScene" });
  }

  create(): void {
    this.selectedRouteId = null;
    this.ui = new SceneUiDirector(this);
    const L = getLayout();

    createStarfield(this);

    // Sidebar portrait — shortened to leave room for mini-map below
    const miniMapHeight = 150;
    const miniMapGap = 8;
    const portraitHeight = L.contentHeight - miniMapHeight - miniMapGap;

    this.portrait = new PortraitPanel(this, {
      x: L.sidebarLeft,
      y: L.contentTop,
      width: L.sidebarWidth,
      height: portraitHeight,
    });

    // Mini-map sits below the portrait panel in the sidebar
    this.miniMap = new MiniMap({
      scene: this,
      x: L.sidebarLeft,
      y: L.contentTop + portraitHeight + miniMapGap,
      width: L.sidebarWidth,
      height: miniMapHeight,
      depth: 0,
    });
    this.portrait.updatePortrait("planet", 0, "Route Command", [], {
      planetType: "terran",
    });

    // ── Build tab content containers ──
    const finderContent = this.add.container(0, 0);
    const activeContent = this.add.container(0, 0);

    // ── Main Panel with TabGroup ──
    const panelX = L.mainContentLeft;
    const panelY = L.contentTop;
    const panelW = L.mainContentWidth;
    const panelH = L.contentHeight;

    // Background panel
    new Panel(this, {
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
      title: "Route Command Center",
    });

    // Tab group sits at the top of the content area
    const tabY = panelY + 38;
    const tabContentY = 0; // relative to tab content container

    new TabGroup(this, {
      x: panelX,
      y: tabY,
      width: panelW,
      tabs: [
        { label: "\u2605 Route Finder", content: finderContent },
        { label: "\u2693 Active Routes", content: activeContent },
      ],
      defaultTab: 0,
    });

    const contentInnerX = 12;
    const contentInnerW = panelW - 24;
    const tabBarHeight = 40; // theme.button.height
    const summaryHeight = 50;
    const filterRowHeight = 32; // cargo filter buttons
    const buttonAreaHeight = 52; // 8px gap + 40px button + 4px pad
    const tableTop = tabContentY + summaryHeight + filterRowHeight;
    const tableHeight =
      panelH -
      38 -
      tabBarHeight -
      summaryHeight -
      filterRowHeight -
      buttonAreaHeight -
      8; // 8px bottom pad

    // ════════════════════════════════════════════════════════════════
    // TAB 0 — ROUTE FINDER
    // ════════════════════════════════════════════════════════════════

    this.finderSummary = this.add.text(
      contentInnerX,
      tabContentY + 8,
      "Scanning all possible routes... Select a route and press Enter to create it.",
      {
        fontSize: `${getTheme().fonts.caption.size}px`,
        fontFamily: getTheme().fonts.caption.family,
        color: colorToString(getTheme().colors.textDim),
        wordWrap: { width: contentInnerW },
      },
    );
    finderContent.add(this.finderSummary);

    // ── Cargo type filter buttons ──
    const filterY = tabContentY + summaryHeight - 4;
    const filterShortLabels: Record<string, string> = {
      passengers: "Pax",
      rawMaterials: "Raw",
      food: "Food",
      technology: "Tech",
      luxury: "Lux",
      hazmat: "Haz",
      medical: "Med",
    };
    const allCargoFilters: Array<{
      label: string;
      value: CargoTypeValue | null;
    }> = [
      { label: "All", value: null },
      ...Object.values(CargoType).map((ct) => ({
        label: filterShortLabels[ct] ?? humanizeCargo(ct as CargoTypeValue),
        value: ct as CargoTypeValue,
      })),
    ];
    const filterBtnPadX = 8;
    this.filterButtons = [];
    let filterX = contentInnerX;
    for (let i = 0; i < allCargoFilters.length; i++) {
      const f = allCargoFilters[i];
      const btn = new Button(this, {
        x: filterX,
        y: filterY,
        autoWidth: true,
        paddingX: filterBtnPadX,
        height: 26,
        label: f.label,
        fontSize: 11,
        onClick: () => {
          this.finderCargoFilter = f.value;
          this.updateFilterButtonStyles();
          this.refreshFinderTable();
        },
      });
      this.filterButtons.push(btn);
      finderContent.add(btn);
      filterX += btn.width + 4;
    }
    this.updateFilterButtonStyles();

    this.finderTable = new DataTable(this, {
      x: contentInnerX,
      y: tableTop,
      width: contentInnerW,
      height: tableHeight,
      columns: [
        { key: "origin", label: "From", width: 120, sortable: true },
        { key: "destination", label: "To", width: 120, sortable: true },
        {
          key: "cargo",
          label: "Cargo",
          width: 130,
          sortable: true,
          format: (v) => getCargoLabel(v as string),
          iconFn: (v) => getCargoIconKey(v as string),
          iconTintFn: (v) => getCargoColor(v as string),
        },
        {
          key: "price",
          label: "Price",
          width: 80,
          align: "right",
          sortable: true,
          format: (v) => `§${(v as number).toFixed(0)}`,
        },
        {
          key: "trend",
          label: "",
          width: 28,
          align: "center",
          colorFn: (v) => {
            const t = getTheme();
            if (v === "\u25B2") return t.colors.profit;
            if (v === "\u25BC") return t.colors.loss;
            return t.colors.textDim;
          },
        },
        {
          key: "dist",
          label: "Dist",
          width: 55,
          align: "right",
          sortable: true,
        },
        {
          key: "profit",
          label: "Profit/Turn",
          width: 110,
          align: "right",
          sortable: true,
          format: (v) => formatCompact(v as number),
          colorFn: (v) => {
            const t = getTheme();
            return (v as number) >= 0 ? t.colors.profit : t.colors.loss;
          },
        },
        {
          key: "ship",
          label: "Ship",
          width: 130,
          sortable: true,
          iconFn: (_v, row) => {
            const sc = row?.["shipClass"] as string | undefined;
            return sc ? getShipIconKey(sc) : null;
          },
          iconTintFn: (_v, row) => {
            const sc = row?.["shipClass"] as string | undefined;
            return sc ? getShipColor(sc) : null;
          },
        },
      ],
      keyboardNavigation: true,
      autoFocus: true,
      emptyStateText: "No route opportunities found",
      emptyStateHint: "Generate a galaxy first.",
      onRowSelect: (_rowIndex, rowData) => {
        const oppIdx = rowData["_index"] as number;
        this.updateFinderPortraitByIndex(oppIdx);
      },
      onRowActivate: (_rowIndex, rowData) => {
        const oppIdx = rowData["_index"] as number;
        this.createRouteFromOpportunityIndex(oppIdx);
      },
    });
    finderContent.add(this.finderTable);

    // Finder buttons
    const finderButtonY = tableTop + tableHeight + 8;
    const createSelectedBtn = new Button(this, {
      x: contentInnerX,
      y: finderButtonY,
      autoWidth: true,
      label: "Create Route [Enter]",
      onClick: () => {
        const idx = this.finderTable.getSelectedRowIndex();
        if (idx >= 0 && idx < this.opportunities.length) {
          this.createRouteFromOpportunityIndex(idx);
        }
      },
    });
    finderContent.add(createSelectedBtn);

    const customRouteBtn = new Button(this, {
      x: contentInnerX + createSelectedBtn.width + 12,
      y: finderButtonY,
      autoWidth: true,
      label: "Custom Route...",
      onClick: () => this.startCreateRoute(),
    });
    finderContent.add(customRouteBtn);

    // ════════════════════════════════════════════════════════════════
    // TAB 1 — ACTIVE ROUTES
    // ════════════════════════════════════════════════════════════════

    this.selectedRouteSummary = this.add.text(
      contentInnerX,
      tabContentY + 4,
      "Pick a route to manage it",
      {
        fontSize: `${getTheme().fonts.value.size}px`,
        fontFamily: getTheme().fonts.value.family,
        color: colorToString(getTheme().colors.accent),
        wordWrap: { width: contentInnerW },
      },
    );
    activeContent.add(this.selectedRouteSummary);

    this.selectedRouteHint = this.add.text(
      contentInnerX,
      tabContentY + 24,
      "Enter on a route opens next useful step. Routes need a ship before profit estimates appear.",
      {
        fontSize: `${getTheme().fonts.caption.size}px`,
        fontFamily: getTheme().fonts.caption.family,
        color: colorToString(getTheme().colors.textDim),
        wordWrap: { width: contentInnerW },
      },
    );
    activeContent.add(this.selectedRouteHint);

    this.routeTable = new DataTable(this, {
      x: contentInnerX,
      y: tableTop,
      width: contentInnerW,
      height: tableHeight,
      columns: [
        { key: "origin", label: "Origin", width: 110, sortable: true },
        {
          key: "destination",
          label: "Destination",
          width: 110,
          sortable: true,
        },
        {
          key: "distance",
          label: "Dist",
          width: 60,
          align: "right",
          sortable: true,
          format: (v) => (v as number).toFixed(1),
        },
        {
          key: "ships",
          label: "Ships",
          width: 70,
          align: "center",
          sortable: true,
          iconFn: (_v, row) => {
            const sc = row?.["shipClass"] as string | undefined;
            return sc ? getShipIconKey(sc) : null;
          },
          iconTintFn: (_v, row) => {
            const sc = row?.["shipClass"] as string | undefined;
            return sc ? getShipColor(sc) : null;
          },
        },
        {
          key: "cargoType",
          label: "Cargo",
          width: 90,
          sortable: true,
          format: (v) => getCargoLabel(v as string),
          iconFn: (v) => {
            const val = v as string;
            return val && val !== "None" ? getCargoIconKey(val) : null;
          },
          iconTintFn: (v) => {
            const val = v as string;
            return val && val !== "None" ? getCargoColor(val) : null;
          },
        },
        {
          key: "revenue",
          label: "Revenue",
          width: 90,
          align: "right",
          format: (v) =>
            (v as string | number) === "\u2014"
              ? "\u2014"
              : formatCash(v as number),
          colorFn: (v) => {
            const t = getTheme();
            return typeof v === "number" ? t.colors.profit : t.colors.textDim;
          },
        },
        {
          key: "fuelCost",
          label: "Fuel",
          width: 80,
          align: "right",
          format: (v) =>
            (v as string | number) === "\u2014"
              ? "\u2014"
              : formatCash(v as number),
          colorFn: (v) => {
            const t = getTheme();
            return typeof v === "number" ? t.colors.loss : t.colors.textDim;
          },
        },
        {
          key: "profit",
          label: "Profit",
          width: 90,
          align: "right",
          sortable: true,
          format: (v) =>
            (v as string | number) === "\u2014"
              ? "\u2014"
              : formatCash(v as number),
          colorFn: (v) => {
            const t = getTheme();
            if (typeof v !== "number") return t.colors.textDim;
            return v >= 0 ? t.colors.profit : t.colors.loss;
          },
        },
      ],
      keyboardNavigation: false,
      emptyStateText: "No trade routes yet",
      emptyStateHint: "Use Route Finder to discover profitable routes.",
      onRowActivate: () => {
        this.activateSelectedRoute();
      },
      onRowSelect: (_rowIndex, rowData) => {
        this.selectedRouteId = rowData["id"] as string;
        this.updateSelectedRouteUi();
      },
    });
    activeContent.add(this.routeTable);

    // Active routes buttons
    const activeButtonY = tableTop + tableHeight + 8;

    this.deleteRouteButton = new Button(this, {
      x: contentInnerX,
      y: activeButtonY,
      width: 120,
      label: "Delete Route",
      disabled: true,
      onClick: () => this.confirmDeleteRoute(),
    });
    activeContent.add(this.deleteRouteButton);

    this.assignShipButton = new Button(this, {
      x: contentInnerX + 140,
      y: activeButtonY,
      width: 120,
      label: "Assign Ship",
      disabled: true,
      onClick: () => this.showAssignShip(),
    });
    activeContent.add(this.assignShipButton);

    this.setCargoButton = new Button(this, {
      x: contentInnerX + 280,
      y: activeButtonY,
      width: 120,
      label: "Set Cargo",
      disabled: true,
      onClick: () => this.showSetCargo(),
    });
    activeContent.add(this.setCargoButton);

    const addRouteBtn = new Button(this, {
      x: contentInnerX + 420,
      y: activeButtonY,
      width: 140,
      label: "Create Route",
      onClick: () => this.startCreateRoute(),
    });
    activeContent.add(addRouteBtn);

    // ── Initial data load ──
    this.refreshFinderTable();
    this.refreshActiveTable();
    this.updateSelectedRouteUi();
  }

  // ════════════════════════════════════════════════════════════════
  // ROUTE FINDER methods
  // ════════════════════════════════════════════════════════════════

  private refreshFinderTable(): void {
    const state = gameStore.getState();
    this.opportunities = scanAllRouteOpportunities(
      state.galaxy.planets,
      state.galaxy.systems,
      state.fleet,
      state.market,
      state.activeRoutes,
      state.cash,
    );

    // Apply cargo type filter
    const filtered = this.finderCargoFilter
      ? this.opportunities.filter(
          (o) => o.bestCargoType === this.finderCargoFilter,
        )
      : this.opportunities;

    const availableShips = state.fleet.filter((s) => !s.assignedRouteId).length;
    const profitableCount = filtered.filter(
      (o) => o.estProfit > 0 && !o.alreadyActive,
    ).length;
    const filterLabel = this.finderCargoFilter
      ? humanizeCargo(this.finderCargoFilter)
      : "all cargo";
    this.finderSummary.setText(
      `${profitableCount} ${filterLabel} routes found \u2022 ${availableShips} idle ships \u2022 §${state.cash.toLocaleString("en-US")} cash \u2022 Enter to create`,
    );

    // Show top 50 for performance — full list still in this.opportunities
    const displayLimit = 50;
    const displayed = filtered.slice(0, displayLimit);

    const rows = displayed.map((opp) => {
      // Map back to the original opportunities index for portrait/create
      const origIdx = this.opportunities.indexOf(opp);
      return {
        _index: origIdx,
        origin: opp.originName,
        destination: opp.destinationName,
        cargo: opp.bestCargoType,
        price: opp.destPrice,
        trend: trendArrow(opp.destTrend),
        dist: opp.distance.toFixed(1),
        profit: opp.estProfit,
        shipClass: opp.shipClass,
        ship: opp.alreadyActive
          ? `\u2713 ${opp.shipName}`
          : opp.shipSource === "autoBuy"
            ? `Buy ${opp.shipName}`
            : opp.shipName,
      };
    });

    this.finderTable.setRows(rows);
  }

  private updateFilterButtonStyles(): void {
    const allCargoFilters: Array<CargoTypeValue | null> = [
      null,
      ...Object.values(CargoType).map((ct) => ct as CargoTypeValue),
    ];
    for (let i = 0; i < this.filterButtons.length; i++) {
      const btn = this.filterButtons[i];
      const isActive = allCargoFilters[i] === this.finderCargoFilter;
      btn.setAlpha(isActive ? 1.0 : 0.5);
    }
  }

  private updateFinderPortraitByIndex(idx: number): void {
    const opp = this.opportunities[idx];
    if (!opp) return;

    const state = gameStore.getState();
    const dest = state.galaxy.planets.find(
      (p) => p.id === opp.destinationPlanetId,
    );
    if (!dest) return;

    const origin = state.galaxy.planets.find(
      (p) => p.id === opp.originPlanetId,
    );

    // Update mini-map for this opportunity
    if (origin && dest) {
      this.updateMiniMapForRoute(
        origin.systemId,
        dest.systemId,
        origin.id,
        dest.id,
      );
    }

    const destIndex = state.galaxy.planets.indexOf(dest);
    const shipInfo =
      opp.shipSource === "autoBuy"
        ? `Buy ${opp.shipName} (${formatCash(opp.shipCost)})`
        : opp.shipSource === "owned"
          ? opp.shipName
          : "No ship available";

    this.portrait.updatePortrait(
      "planet",
      destIndex,
      `${opp.originName} → ${dest.name}`,
      [
        { label: "Type", value: dest.type },
        { label: "Cargo", value: humanizeCargo(opp.bestCargoType) },
        {
          label: "Price",
          value: `§${opp.destPrice.toFixed(0)} ${trendArrow(opp.destTrend)}`,
        },
        { label: "Dist", value: opp.distance.toFixed(1) },
        { label: "Trips", value: opp.tripsPerTurn.toString() },
        { label: "Revenue", value: formatCompact(opp.estRevenue) },
        { label: "Fuel", value: formatCompact(opp.estFuelCost) },
        { label: "Profit", value: formatCompact(opp.estProfit) },
        { label: "Ship", value: shipInfo },
      ],
      { planetType: dest.type },
    );
  }

  private createRouteFromOpportunityIndex(idx: number): void {
    const opp = this.opportunities[idx];
    if (!opp) return;

    if (opp.alreadyActive) {
      const m = new Modal(this, {
        title: "Route Already Active",
        body: `You already have an active route from ${opp.originName} to ${opp.destinationName}.`,
        onOk: () => m.destroy(),
      });
      m.show();
      return;
    }

    // Create with auto-ship assignment
    const state = gameStore.getState();
    const origin = state.galaxy.planets.find(
      (p) => p.id === opp.originPlanetId,
    );
    const dest = state.galaxy.planets.find(
      (p) => p.id === opp.destinationPlanetId,
    );
    if (!origin || !dest) return;

    const distance = calculateDistance(origin, dest, state.galaxy.systems);

    // Deduct route license fee
    const licenseFee = calculateLicenseFee(distance, state.activeRoutes.length);
    if (state.cash < licenseFee) {
      const m2 = new Modal(this, {
        title: "Insufficient Funds",
        body: `License fee: $${licenseFee.toLocaleString()}. You only have $${Math.floor(state.cash).toLocaleString()}.`,
        onOk: () => m2.destroy(),
      });
      m2.show();
      return;
    }

    const route = createRoute(origin.id, dest.id, distance, opp.bestCargoType);

    let updatedFleet = [...state.fleet];
    let updatedRoutes = [...state.activeRoutes, route];
    let updatedCash = state.cash - licenseFee;

    // Find best available ship for this cargo
    const isPassenger = opp.bestCargoType === "passengers";
    const availableShip = updatedFleet
      .filter((s) => !s.assignedRouteId)
      .filter((s) =>
        isPassenger ? s.passengerCapacity > 0 : s.cargoCapacity > 0,
      )
      .sort((a, b) =>
        isPassenger
          ? b.passengerCapacity - a.passengerCapacity
          : b.cargoCapacity - a.cargoCapacity,
      )[0];

    let shipId: string | null = availableShip?.id ?? null;
    let boughtShipName: string | null = null;

    // Auto-buy if no owned ship available
    if (!shipId && opp.shipSource === "autoBuy") {
      const shipClasses = Object.keys(SHIP_TEMPLATES) as ShipClass[];
      const compatible = shipClasses
        .map((sc) => ({ class: sc, template: SHIP_TEMPLATES[sc] }))
        .filter((e) =>
          isPassenger
            ? e.template.passengerCapacity > 0
            : e.template.cargoCapacity > 0,
        )
        .filter((e) => e.template.purchaseCost <= updatedCash)
        .sort((a, b) => a.template.purchaseCost - b.template.purchaseCost);

      if (compatible.length > 0) {
        const { ship, cost } = buyShip(compatible[0].class, updatedFleet);
        updatedFleet = [...updatedFleet, ship];
        updatedCash -= cost;
        shipId = ship.id;
        boughtShipName = ship.name;
      }
    }

    if (shipId) {
      const result = assignShipToRoute(
        shipId,
        route.id,
        updatedFleet,
        updatedRoutes,
      );
      updatedFleet = result.fleet;
      updatedRoutes = result.routes;
    }

    gameStore.update({
      fleet: updatedFleet,
      activeRoutes: updatedRoutes,
      cash: updatedCash,
    });

    const assignedName =
      updatedFleet.find((s) => s.id === shipId)?.name ?? null;
    const msg = boughtShipName
      ? `Route created! Bought ${boughtShipName} and assigned to ${opp.originName} → ${opp.destinationName}.`
      : assignedName
        ? `Route created! ${assignedName} assigned to ${opp.originName} → ${opp.destinationName}.`
        : `Route created: ${opp.originName} → ${opp.destinationName}. Assign a ship on the Active Routes tab.`;

    const m = new Modal(this, {
      title: "Route Created",
      body: msg,
      onOk: () => m.destroy(),
    });
    m.show();

    this.refreshFinderTable();
    this.refreshActiveTable();
  }

  // ════════════════════════════════════════════════════════════════
  // ACTIVE ROUTES methods (preserved from original)
  // ════════════════════════════════════════════════════════════════

  private refreshActiveTable(): void {
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
        shipClass: firstShip?.class ?? null,
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
        "Create a route from Route Finder, or use Create Route. Enter on a selected route opens the next useful step.",
      );
      this.portrait?.updatePortrait("planet", 0, "Route Command", [], {
        planetType: "terran",
      });
      this.miniMap?.drawEmpty();
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

    // Update mini-map for active route
    if (origin && destination) {
      this.updateMiniMapForRoute(
        origin.systemId,
        destination.systemId,
        origin.id,
        destination.id,
      );
    }

    const routeTitle = `${origin?.name ?? "Origin"} \u2192 ${destination?.name ?? "Destination"}`;
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
          ? "\u2014"
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

  private updateMiniMapForRoute(
    originSystemId: string,
    destSystemId: string,
    originPlanetId: string,
    destPlanetId: string,
  ): void {
    const state = gameStore.getState();
    const isInterSystem = originSystemId !== destSystemId;

    if (isInterSystem) {
      this.miniMap.drawGalaxyRoute(
        state.galaxy.systems,
        originSystemId,
        destSystemId,
        state.activeRoutes,
        state.galaxy.planets,
      );
    } else {
      const system = state.galaxy.systems.find((s) => s.id === originSystemId);
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
        originPlanetId,
        destPlanetId,
      );
    }
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
        this.refreshFinderTable();
        this.refreshActiveTable();
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
        this.refreshFinderTable();
        this.refreshActiveTable();
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

    const L = getLayout();
    const panelW = 450;
    const panelH = 400;
    const panelX = (L.gameWidth - panelW) / 2;
    const panelY = (L.gameHeight - panelH) / 2;

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
          this.refreshFinderTable();
          this.refreshActiveTable();
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

    const L = getLayout();
    const panelW = 350;
    const panelH = 400;
    const panelX = (L.gameWidth - panelW) / 2;
    const panelY = (L.gameHeight - panelH) / 2;

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
          this.refreshFinderTable();
          this.refreshActiveTable();
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

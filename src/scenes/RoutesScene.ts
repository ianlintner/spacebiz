import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { isInDistanceBand, matchesScopeBand } from "./routesFinderFilters.ts";
import type { DistanceBand, RouteScopeBand } from "./routesFinderFilters.ts";
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
  getCargoShortLabel,
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
  addCargoLock,
  removeCargoLocks,
  setRoutePaused,
  getAvailableRouteSlots,
  getUsedRouteSlots,
  getAvailableLocalRouteSlots,
  getUsedLocalRouteSlots,
  getAvailableGalacticRouteSlots,
  getUsedGalacticRouteSlots,
} from "../game/routes/RouteManager.ts";
import type { RouteOpportunity } from "../game/routes/RouteManager.ts";
import {
  findPath,
  countBorderCrossings,
} from "../game/routes/HyperlaneRouter.ts";
import { buyShip } from "../game/fleet/FleetManager.ts";
import { SHIP_TEMPLATES } from "../data/constants.ts";
import type { ShipClass } from "../data/types.ts";
import {
  validateRouteCreation,
  getEmpireForPlanet,
  checkTradePolicyViolation,
} from "../game/empire/EmpireAccessManager.ts";

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
  private pauseRouteButton!: Button;

  // ── Route Finder tab state ──
  private finderTable!: DataTable;
  private finderSummary!: Phaser.GameObjects.Text;
  private opportunities: RouteOpportunity[] = [];
  private finderCargoFilter: CargoTypeValue | null = null;
  private finderDistanceBand: DistanceBand = null;
  private finderScopeBand: RouteScopeBand = null;
  private filterButtons: Button[] = [];
  private distanceBandButtons: Button[] = [];
  private scopeBandButtons: Button[] = [];

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
    const buttonAreaHeight = 52; // 8px gap + 40px button + 4px pad

    // Two layout slots are computed below from the actual flowed bottom of the
    // filter rows (which can wrap to extra lines at narrow widths). Initialize
    // here as `let` so the assignments inside the filter-rows block below feed
    // back into table sizing.
    let tableTop = tabContentY + summaryHeight; // updated after rows flow
    let tableHeight = panelH - 38 - tabBarHeight - buttonAreaHeight - 8;

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

    // ── Filter rows (cargo / distance / scope) ──
    // Each row is laid out via flowButtonRow so a long label or narrow panel
    // wraps gracefully instead of running off the right edge.
    const filterY = tabContentY + summaryHeight - 4;
    const filterMaxX = contentInnerX + contentInnerW;
    const filterBtnPadX = 8;

    const allCargoFilters: Array<{
      label: string;
      value: CargoTypeValue | null;
    }> = [
      { label: "All", value: null },
      ...Object.values(CargoType).map((ct) => ({
        label: getCargoShortLabel(ct),
        value: ct as CargoTypeValue,
      })),
    ];
    this.filterButtons = allCargoFilters.map(
      (f) =>
        new Button(this, {
          x: 0,
          y: 0,
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
        }),
    );
    const cargoRowBottom = this.flowButtonRow(
      finderContent,
      contentInnerX,
      filterY,
      filterMaxX,
      this.filterButtons,
    );
    this.updateFilterButtonStyles();

    const distanceBands: Array<{ label: string; value: DistanceBand }> = [
      { label: "Any dist.", value: null },
      { label: "Short (<50)", value: "short" },
      { label: "Med (50-150)", value: "medium" },
      { label: "Long (>150)", value: "long" },
    ];
    this.distanceBandButtons = distanceBands.map(
      (band) =>
        new Button(this, {
          x: 0,
          y: 0,
          autoWidth: true,
          paddingX: filterBtnPadX,
          height: 26,
          label: band.label,
          fontSize: 11,
          onClick: () => {
            this.finderDistanceBand = band.value;
            this.updateDistanceBandButtonStyles();
            this.refreshFinderTable();
          },
        }),
    );
    const distanceRowBottom = this.flowButtonRow(
      finderContent,
      contentInnerX,
      cargoRowBottom + 4,
      filterMaxX,
      this.distanceBandButtons,
    );
    this.updateDistanceBandButtonStyles();

    const scopeBands: Array<{
      label: string;
      value: RouteScopeBand;
      testId: string;
    }> = [
      { label: "Any scope", value: null, testId: "btn-finder-scope-any" },
      { label: "System", value: "system", testId: "btn-finder-scope-system" },
      {
        label: "Empire",
        value: "empire",
        testId: "btn-finder-scope-empire",
      },
      {
        label: "Galactic",
        value: "galactic",
        testId: "btn-finder-scope-galactic",
      },
    ];
    this.scopeBandButtons = scopeBands.map(
      (scope) =>
        new Button(this, {
          x: 0,
          y: 0,
          autoWidth: true,
          paddingX: filterBtnPadX,
          height: 26,
          label: scope.label,
          fontSize: 11,
          testId: scope.testId,
          onClick: () => {
            this.finderScopeBand = scope.value;
            this.updateScopeBandButtonStyles();
            this.refreshFinderTable();
          },
        }),
    );
    const scopeRowBottom = this.flowButtonRow(
      finderContent,
      contentInnerX,
      distanceRowBottom + 4,
      filterMaxX,
      this.scopeBandButtons,
    );
    this.updateScopeBandButtonStyles();

    // Lock the table position from the actual flowed bottom of the filter
    // rows so the table never overlaps a wrapped row.
    tableTop = scopeRowBottom + 8;
    tableHeight =
      panelH -
      38 -
      tabBarHeight -
      (tableTop - tabContentY) -
      buttonAreaHeight -
      8;

    this.finderTable = new DataTable(this, {
      x: contentInnerX,
      y: tableTop,
      width: contentInnerW,
      height: tableHeight,
      columns: [
        // Column widths sum to 632 — fits inside contentInnerW at the
        // non-compact boundary (game width 1100 → contentInnerW ≈ 644).
        // Trimmed from a 695-px set that clipped at narrow widths.
        { key: "origin", label: "From", width: 84, sortable: true },
        { key: "destination", label: "To", width: 84, sortable: true },
        {
          key: "empire",
          label: "Empire",
          width: 60,
          sortable: true,
        },
        {
          key: "cargo",
          label: "Cargo",
          width: 74,
          sortable: true,
          format: (v) => getCargoShortLabel(v as string),
          iconFn: (v) => getCargoIconKey(v as string),
          iconTintFn: (v) => getCargoColor(v as string),
        },
        {
          key: "restricted",
          label: "",
          width: 22,
          align: "center",
          colorFn: () => getTheme().colors.loss,
        },
        {
          key: "tariff",
          label: "Tariff",
          width: 50,
          align: "right",
          sortable: true,
          format: (v) =>
            typeof v === "number" ? `${Math.round(v * 100)}%` : "\u2014",
          colorFn: (v) => {
            if (typeof v !== "number") return getTheme().colors.textDim;
            if (v >= 0.15) return getTheme().colors.loss;
            return getTheme().colors.textDim;
          },
        },
        {
          key: "price",
          label: "Price",
          width: 65,
          align: "right",
          sortable: true,
          format: (v) => `§${(v as number).toFixed(0)}`,
        },
        {
          key: "trend",
          label: "",
          width: 24,
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
          width: 36,
          align: "right",
          sortable: true,
        },
        {
          key: "profit",
          label: "Profit/turn",
          width: 75,
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
          width: 72,
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

    // Finder action buttons (laid out via flowButtonRow so they wrap if the
    // panel ever shrinks below the combined button width)
    const finderButtonY = tableTop + tableHeight + 8;
    const createSelectedBtn = new Button(this, {
      x: 0,
      y: 0,
      autoWidth: true,
      label: "Create Route [Enter]",
      onClick: () => {
        const idx = this.finderTable.getSelectedRowIndex();
        if (idx >= 0 && idx < this.opportunities.length) {
          this.createRouteFromOpportunityIndex(idx);
        }
      },
    });
    const customRouteBtn = new Button(this, {
      x: 0,
      y: 0,
      autoWidth: true,
      label: "Custom Route...",
      onClick: () => this.startCreateRoute(),
    });
    this.flowButtonRow(
      finderContent,
      contentInnerX,
      finderButtonY,
      contentInnerX + contentInnerW,
      [createSelectedBtn, customRouteBtn],
      12,
      6,
    );

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
          format: (v) => getCargoShortLabel(v as string),
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

    this.pauseRouteButton = new Button(this, {
      x: contentInnerX + 420,
      y: activeButtonY,
      width: 120,
      label: "Pause",
      disabled: true,
      onClick: () => this.toggleRoutePause(),
    });
    activeContent.add(this.pauseRouteButton);

    const addRouteBtn = new Button(this, {
      x: contentInnerX + 560,
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
      state,
    );

    // Pre-build planet → systemId / empireId lookup maps once per refresh.
    // Without these, the row mapper below calls getEmpireForPlanet 4× per row
    // (each doing a linear find over systems and planets), and the new scope
    // filter would do the same lookups again.
    const planetSystemMap = new Map<string, string>();
    const planetEmpireMap = new Map<string, string | null>();
    for (const planet of state.galaxy.planets) {
      planetSystemMap.set(planet.id, planet.systemId);
      planetEmpireMap.set(
        planet.id,
        getEmpireForPlanet(
          planet.id,
          state.galaxy.systems,
          state.galaxy.planets,
        ),
      );
    }

    // Apply cargo type + distance band + scope filters
    const filtered = this.opportunities.filter((o) => {
      if (this.finderCargoFilter && o.bestCargoType !== this.finderCargoFilter)
        return false;
      if (!isInDistanceBand(o.distance, this.finderDistanceBand)) return false;
      const oSys = planetSystemMap.get(o.originPlanetId) ?? "";
      const dSys = planetSystemMap.get(o.destinationPlanetId) ?? "";
      const oEmp = planetEmpireMap.get(o.originPlanetId) ?? null;
      const dEmp = planetEmpireMap.get(o.destinationPlanetId) ?? null;
      if (!matchesScopeBand(oSys, dSys, oEmp, dEmp, this.finderScopeBand))
        return false;
      return true;
    });

    const availableShips = state.fleet.filter((s) => !s.assignedRouteId).length;
    const profitableCount = filtered.filter(
      (o) => o.estProfit > 0 && !o.alreadyActive,
    ).length;
    const filterLabel = this.finderCargoFilter
      ? getCargoLabel(this.finderCargoFilter)
      : "all cargo";
    const sysUsed = getUsedLocalRouteSlots(state);
    const sysTot = getAvailableLocalRouteSlots(state);
    const empUsed = getUsedRouteSlots(state);
    const empTot = getAvailableRouteSlots(state);
    const galUsed = getUsedGalacticRouteSlots(state);
    const galTot = getAvailableGalacticRouteSlots(state);
    this.finderSummary.setText(
      `${profitableCount} ${filterLabel} routes found \u2022 Sys ${sysUsed}/${sysTot} \u00B7 Emp ${empUsed}/${empTot} \u00B7 Gal ${galUsed}/${galTot} \u2022 ${availableShips} idle ships \u2022 §${state.cash.toLocaleString("en-US")} cash \u2022 Enter to create`,
    );

    // When the user has narrowed the set with any filter, raise the cap so
    // the long tail of (e.g.) interstellar routes actually surfaces. The
    // default 50 is plenty when sorted purely by profit DESC across all
    // routes; once filtered, 50 can hide most of what they asked for.
    const hasActiveFilter =
      this.finderCargoFilter !== null ||
      this.finderDistanceBand !== null ||
      this.finderScopeBand !== null;
    const displayLimit = hasActiveFilter ? 200 : 50;
    const displayed = filtered.slice(0, displayLimit);

    const rows = displayed.map((opp) => {
      // Map back to the original opportunities index for portrait/create
      const origIdx = this.opportunities.indexOf(opp);

      // Empire & tariff info (use prebuilt map to avoid linear scans)
      const originEmpireId = planetEmpireMap.get(opp.originPlanetId) ?? null;
      const destEmpireId = planetEmpireMap.get(opp.destinationPlanetId) ?? null;
      const originEmpire = (state.galaxy.empires ?? []).find(
        (e) => e.id === originEmpireId,
      );
      const destEmpire = (state.galaxy.empires ?? []).find(
        (e) => e.id === destEmpireId,
      );
      const isInterEmpire =
        originEmpire && destEmpire && originEmpire.id !== destEmpire.id;
      const empireLabel = isInterEmpire
        ? `${originEmpire.name.slice(0, 3)}\u2192${destEmpire.name.slice(0, 3)}`
        : originEmpire
          ? originEmpire.name.slice(0, 7)
          : "\u2014";
      const empireColor = isInterEmpire
        ? destEmpire.color
        : originEmpire
          ? originEmpire.color
          : undefined;

      // Tariff rate for inter-empire routes
      const tariff = isInterEmpire ? destEmpire.tariffRate : undefined;
      // Tariff surcharge from trade policy
      const destPolicy = destEmpireId
        ? (state.empireTradePolicies ?? ({} as Record<string, never>))[
            destEmpireId
          ]
        : undefined;
      const tariffTotal =
        typeof tariff === "number" && destPolicy?.tariffSurcharge
          ? tariff + destPolicy.tariffSurcharge
          : tariff;

      // Check import/export ban restrictions
      let restricted: string | undefined;
      if (originEmpireId && destEmpireId) {
        const policyViolation = checkTradePolicyViolation(
          originEmpireId,
          destEmpireId,
          opp.bestCargoType,
          state.empireTradePolicies ?? {},
        );
        restricted = policyViolation ? "\u26D4" : undefined;
      }

      return {
        _index: origIdx,
        origin: opp.originName,
        destination: opp.destinationName,
        empire: empireLabel,
        empireColor,
        cargo: opp.bestCargoType,
        restricted,
        tariff: tariffTotal,
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

    // Context-aware empty-state hint. The default ("Generate a galaxy first")
    // is misleading once a galaxy exists — the real reason for an empty
    // table is almost always a too-narrow filter or no compatible ship.
    if (rows.length === 0) {
      const noGalaxy = state.galaxy.planets.length === 0;
      const hasFilter = hasActiveFilter;
      let emptyText = "No route opportunities found";
      let emptyHint: string;
      if (noGalaxy) {
        emptyHint = "Generate a galaxy first.";
      } else if (hasFilter) {
        const scopeLabel =
          this.finderScopeBand === "system"
            ? "system"
            : this.finderScopeBand === "empire"
              ? "empire"
              : this.finderScopeBand === "galactic"
                ? "galactic"
                : "";
        const subject = scopeLabel
          ? `${scopeLabel} ${filterLabel}`.trim()
          : filterLabel;
        emptyText = `No ${subject} routes match your filter`;
        emptyHint =
          "Widen the cargo, distance, or scope filter — or try Any/All.";
      } else if (availableShips === 0 && state.fleet.length === 0) {
        emptyHint = "Buy a ship from the Fleet screen to unlock routes.";
      } else {
        emptyHint = "Tech and luxury cargo unlocks more options later.";
      }
      this.finderTable.setEmptyState(emptyText, emptyHint);
    }

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

  private updateDistanceBandButtonStyles(): void {
    const bands: Array<DistanceBand> = [null, "short", "medium", "long"];
    for (let i = 0; i < this.distanceBandButtons.length; i++) {
      const btn = this.distanceBandButtons[i];
      const isActive = bands[i] === this.finderDistanceBand;
      btn.setAlpha(isActive ? 1.0 : 0.5);
    }
  }

  private updateScopeBandButtonStyles(): void {
    const scopes: Array<RouteScopeBand> = [
      null,
      "system",
      "empire",
      "galactic",
    ];
    for (let i = 0; i < this.scopeBandButtons.length; i++) {
      const btn = this.scopeBandButtons[i];
      const isActive = scopes[i] === this.finderScopeBand;
      btn.setAlpha(isActive ? 1.0 : 0.5);
    }
  }

  /**
   * Lay out a row of buttons left-to-right, wrapping to a new line when the
   * next button would exceed `maxX`. Adds each button to `container` and
   * returns the y-coordinate of the bottom of the last placed button — so
   * callers can stack rows without hardcoding heights.
   */
  private flowButtonRow(
    container: Phaser.GameObjects.Container,
    startX: number,
    startY: number,
    maxX: number,
    buttons: Button[],
    gap = 4,
    rowGap = 4,
  ): number {
    let x = startX;
    let y = startY;
    let rowHeight = 0;
    for (const btn of buttons) {
      if (x !== startX && x + btn.width > maxX) {
        // wrap
        y += rowHeight + rowGap;
        x = startX;
        rowHeight = 0;
      }
      btn.setPosition(x, y);
      container.add(btn);
      x += btn.width + gap;
      if (btn.height > rowHeight) rowHeight = btn.height;
    }
    return y + rowHeight;
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
        { label: "Cargo", value: getCargoLabel(opp.bestCargoType) },
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

    // Validate route creation (slots, empire access, trade policies, cargo locks)
    const validationError = validateRouteCreation(
      opp.originPlanetId,
      opp.destinationPlanetId,
      opp.bestCargoType,
      state,
    );
    if (validationError) {
      const m = new Modal(this, {
        title: "Cannot Create Route",
        body: validationError,
        onOk: () => m.destroy(),
      });
      m.show();
      return;
    }

    const origin = state.galaxy.planets.find(
      (p) => p.id === opp.originPlanetId,
    );
    const dest = state.galaxy.planets.find(
      (p) => p.id === opp.destinationPlanetId,
    );
    if (!origin || !dest) return;

    const distance = calculateDistance(
      origin,
      dest,
      state.galaxy.systems,
      state.hyperlanes,
      state.borderPorts,
    );

    // Deduct route license fee
    const licenseFee = calculateLicenseFee(distance, state.activeRoutes.length);
    if (state.cash < licenseFee) {
      const m2 = new Modal(this, {
        title: "Insufficient Funds",
        body: `License fee: §${licenseFee.toLocaleString("en-US")}. You only have §${Math.floor(state.cash).toLocaleString("en-US")}.`,
        onOk: () => m2.destroy(),
      });
      m2.show();
      return;
    }

    const route = createRoute(origin.id, dest.id, distance, opp.bestCargoType);

    let updatedFleet = [...state.fleet];
    let updatedRoutes = [...state.activeRoutes, route];
    let updatedCash = state.cash - licenseFee;

    // Track inter-empire cargo lock
    let updatedLocks = addCargoLock(
      origin.id,
      dest.id,
      opp.bestCargoType,
      route.id,
      state.galaxy.systems,
      state.galaxy.planets,
      state.interEmpireCargoLocks,
    );

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
      interEmpireCargoLocks: updatedLocks,
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

      if (route.paused) {
        revenue = "\u23f8 paused";
        fuelCost = 0;
        profit = 0;
      } else if (firstShip && route.cargoType) {
        const rev = estimateRouteRevenue(route, firstShip, state.market, state);
        const fuel = estimateRouteFuelCost(
          route,
          firstShip,
          state.market.fuelPrice,
        );
        revenue = rev;
        fuelCost = fuel;
        profit = rev - fuel;
      }

      const originName =
        planetMap.get(route.originPlanetId) ?? route.originPlanetId;
      const destinationName =
        planetMap.get(route.destinationPlanetId) ?? route.destinationPlanetId;

      return {
        id: route.id,
        origin: route.paused ? `\u23f8 ${originName}` : originName,
        destination: destinationName,
        distance: route.distance,
        ships: route.assignedShipIds.length,
        shipClass: firstShip?.class ?? null,
        cargoType: route.cargoType ?? "None",
        revenue,
        fuelCost,
        profit,
        paused: route.paused ?? false,
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
    this.pauseRouteButton?.setDisabled(!hasSelection);
    this.pauseRouteButton?.setLabel(route?.paused ? "Resume" : "Pause");

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
      const path = origin
        ? findPath(
            origin.systemId,
            destination.systemId,
            state.hyperlanes ?? [],
            state.borderPorts ?? [],
          )
        : null;
      const hops = path ? path.systems.length - 1 : 0;
      const crossings =
        path && origin ? countBorderCrossings(path, state.galaxy.systems) : 0;
      this.portrait.updatePortrait(
        "planet",
        destinationIndex,
        destination.name,
        [
          { label: "Type", value: destination.type },
          { label: "Distance", value: route.distance.toFixed(1) },
          { label: "Hops", value: hops.toString() },
          { label: "Crossings", value: crossings.toString() },
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
        ? estimateRouteRevenue(route, firstShip, state.market, state)
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
    // Map the table's selected display row back to the unfiltered opportunities
    // array via the row's `_index` field. The DataTable position alone is wrong
    // when a cargo filter is active — position 0 in the filtered view is rarely
    // index 0 in the unfiltered list.
    const selectedRow = this.finderTable?.getSelectedRow?.();
    const oppIndex =
      typeof selectedRow?.["_index"] === "number"
        ? (selectedRow["_index"] as number)
        : -1;
    const selectedOpp =
      oppIndex >= 0 && oppIndex < this.opportunities.length
        ? this.opportunities[oppIndex]
        : null;

    const initialCargoType =
      selectedOpp?.bestCargoType ?? this.finderCargoFilter ?? undefined;

    openRouteBuilder(this, {
      ui: this.ui,
      title: "Create Trade Route",
      confirmLabel: "Create Route",
      allowAutoBuy: true,
      initialOriginPlanetId: selectedOpp?.originPlanetId,
      initialDestinationPlanetId: selectedOpp?.destinationPlanetId,
      initialCargoType,
      onComplete: () => {
        this.refreshFinderTable();
        this.refreshActiveTable();
      },
    });
  }

  private toggleRoutePause(): void {
    if (!this.selectedRouteId) return;
    const state = gameStore.getState();
    const route = state.activeRoutes.find((r) => r.id === this.selectedRouteId);
    if (!route) return;
    const updated = setRoutePaused(
      this.selectedRouteId,
      !route.paused,
      state.activeRoutes,
    );
    gameStore.update({ activeRoutes: updated });
    this.refreshActiveTable();
    this.refreshFinderTable();
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
        const updatedLocks = removeCargoLocks(
          this.selectedRouteId!,
          freshState.interEmpireCargoLocks,
        );
        gameStore.update({
          fleet,
          activeRoutes: routes,
          interEmpireCargoLocks: updatedLocks,
        });
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
    shipPanel.setDepth(1000);

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
    shipList.setDepth(1000);

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

    layer
      .track(
        new Button(this, {
          x: panelX + panelW - content.x - 100,
          y: panelY + panelH - 50,
          width: 100,
          label: "Close",
          onClick: () => {
            layer.destroy();
          },
        }),
      )
      .setDepth(1000);
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
    cargoPanel.setDepth(1000);

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
    cargoList.setDepth(1000);

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

    layer
      .track(
        new Button(this, {
          x: panelX + panelW - content.x - 100,
          y: panelY + panelH - 50,
          width: 100,
          label: "Close",
          onClick: () => {
            layer.destroy();
          },
        }),
      )
      .setDepth(1000);
  }
}

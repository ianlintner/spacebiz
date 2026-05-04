import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import type { AICompany } from "../data/types.ts";
import {
  getTheme,
  DataTable,
  ScrollFrame,
  Panel,
  PortraitPanel,
  TabGroup,
  StandingsGraph,
  createStarfield,
  getLayout,
  attachReflowHandler,
  GROUP_TAB_STRIP_HEIGHT,
} from "../ui/index.ts";
import {
  getIntelTier,
  buildRivalView,
  getNextIntelUnlockDescription,
} from "../game/intel/IntelLevel.ts";
import type { IntelTier } from "../game/intel/IntelLevel.ts";
import {
  buildStandingsData,
  type StandingsMetric,
} from "../game/standingsHistory.ts";

function formatCash(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return sign + "§" + abs.toLocaleString("en-US");
}

function personalityLabel(p: string): string {
  switch (p) {
    case "aggressiveExpander":
      return "Aggressive";
    case "steadyHauler":
      return "Steady";
    case "cherryPicker":
      return "Cherry Picker";
    default:
      return p;
  }
}

export class CompetitionScene extends Phaser.Scene {
  private portrait!: PortraitPanel;
  private contentPanel!: Panel;
  private tabGroup!: TabGroup;
  private table!: DataTable;
  private intelTier: IntelTier = 0;
  private tableFrame: ScrollFrame | null = null;
  private standingsGraph: StandingsGraph | null = null;
  private hasAnimatedStandings = false;
  private standingsArea: { x: number; y: number; w: number; h: number } | null =
    null;

  constructor() {
    super({ key: "CompetitionScene" });
  }

  create(): void {
    const theme = getTheme();
    const L = getLayout();

    createStarfield(this);

    const state = gameStore.getState();
    const companies = state.aiCompanies;
    const empires = state.galaxy.empires;
    const empireMap = new Map(empires.map((e) => [e.id, e]));

    // Determine player's intel tier (gates what rival data is visible)
    this.intelTier = getIntelTier(state);

    // Sidebar portrait
    this.portrait = new PortraitPanel(this, {
      x: L.sidebarLeft,
      y: L.contentTop,
      width: L.sidebarWidth,
      height: L.contentHeight,
    });

    const activeCount = companies.filter((c) => !c.bankrupt).length;

    // Show intel unlock hint if not at max tier
    const intelHint = getNextIntelUnlockDescription(this.intelTier);
    const sidebarStats: { label: string; value: string }[] = [
      { label: "Active", value: String(activeCount) },
      { label: "Bankrupt", value: String(companies.length - activeCount) },
      {
        label: "Intel Tier",
        value: `${this.intelTier}/4`,
      },
    ];
    if (intelHint) {
      sidebarStats.push({ label: "Next Intel", value: intelHint.slice(0, 30) });
    }

    this.portrait.updatePortrait("company", 0, "Competition", sidebarStats);

    // Content panel
    this.contentPanel = new Panel(this, {
      x: L.mainContentLeft,
      y: L.contentTop,
      width: L.mainContentWidth,
      height: L.contentHeight,
      title: "AI Companies",
    });
    const content = this.contentPanel.getContentArea();
    const absX = L.mainContentLeft + content.x;
    const absY = L.contentTop + content.y;

    // Build table rows — use intel-gated views
    const rows = companies.map((company, index) => {
      const empire = empireMap.get(company.empireId);
      const view = buildRivalView(company, this.intelTier, index + 1, 0);

      // Cash: only visible at Intel T4
      const cashDisplay =
        view.cash !== undefined ? formatCash(view.cash) : "???";

      // Routes: only visible at Intel T3
      const routesDisplay =
        view.routeCount !== undefined ? view.routeCount : "???";

      // Fleet: only visible at Intel T3
      const fleetDisplay =
        view.fleetSize !== undefined ? view.fleetSize : "???";

      return {
        companyId: company.id,
        name: company.name,
        empire: empire?.name ?? "Unknown",
        personality: personalityLabel(company.personality),
        cash: cashDisplay,
        routes: routesDisplay,
        fleet: fleetDisplay,
        status: company.bankrupt ? "Bankrupt" : "Active",
      };
    });

    const statusColorFn = (value: unknown): number | null => {
      return value === "Bankrupt" ? theme.colors.loss : theme.colors.profit;
    };

    // Tab strip — Companies | Standings — sits above the table/graph view.
    const tabHeight = theme.button.height;
    this.tabGroup = new TabGroup(this, {
      x: absX,
      y: absY,
      width: Math.min(360, content.width),
      tabHeight,
      tabs: [
        { label: "Companies", content: this.add.container(0, 0) },
        { label: "Standings", content: this.add.container(0, 0) },
      ],
    });

    const viewTop = absY + tabHeight + 8;
    const viewHeight = content.height - tabHeight - 28;
    this.standingsArea = {
      x: absX,
      y: viewTop,
      w: content.width,
      h: viewHeight,
    };

    const tableFrame = new ScrollFrame(this, {
      x: absX,
      y: viewTop,
      width: content.width,
      height: viewHeight,
    });
    this.tableFrame = tableFrame;
    this.table = new DataTable(this, {
      x: 0,
      y: 0,
      width: content.width,
      height: viewHeight,
      contentSized: true,
      columns: [
        { key: "name", label: "Company", width: 120 },
        { key: "empire", label: "Empire", width: 100 },
        // "Cherry Picker" is 13 chars — needs ~120px to avoid truncating to
        // "Cherry" (which reads as a typo). Widen Style column accordingly.
        { key: "personality", label: "Style", width: 120 },
        {
          key: "cash",
          label: this.intelTier >= 4 ? "Cash" : "Cash (T4)",
          width: 100,
          align: "right",
        },
        {
          key: "routes",
          label: this.intelTier >= 3 ? "Routes" : "Routes (T3)",
          width: 100,
          align: "right",
        },
        {
          key: "fleet",
          label: this.intelTier >= 3 ? "Ships" : "Ships (T3)",
          width: 90,
          align: "right",
        },
        { key: "status", label: "Status", width: 90, colorFn: statusColorFn },
      ],
      onRowSelect: (_rowIdx: number, rowData: Record<string, unknown>) => {
        this.updatePortraitForCompany(
          rowData["companyId"] as string,
          companies,
        );
      },
    });
    tableFrame.setContent(this.table);
    this.table.setRows(rows);

    // Hook tab switches → toggle ScrollFrame vs StandingsGraph.
    const originalSetActiveTab = this.tabGroup.setActiveTab.bind(this.tabGroup);
    this.tabGroup.setActiveTab = (index: number) => {
      originalSetActiveTab(index);
      if (index === 1) this.openStandingsTab();
      else this.openCompaniesTab();
    };

    // Apply layout positions/sizes and register for future resizes.
    this.relayout();
    attachReflowHandler(this, () => this.relayout());
  }

  private relayout(): void {
    const theme = getTheme();
    const L = getLayout();
    const contentTop = L.contentTop + GROUP_TAB_STRIP_HEIGHT;
    const contentHeight = L.contentHeight - GROUP_TAB_STRIP_HEIGHT;

    // PortraitPanel: setPosition triggers mask refresh, then setSize.
    this.portrait.setPosition(L.sidebarLeft, contentTop);
    this.portrait.setSize(L.sidebarWidth, contentHeight);

    // Content panel.
    this.contentPanel.setPosition(L.mainContentLeft, contentTop);
    this.contentPanel.setSize(L.mainContentWidth, contentHeight);

    // Re-read content area after panel resize to get fresh inset coords.
    const content = this.contentPanel.getContentArea();
    const absX = L.mainContentLeft + content.x;
    const absY = contentTop + content.y;

    // Tab strip.
    this.tabGroup.setPosition(absX, absY);
    this.tabGroup.setSize(Math.min(360, content.width), this.tabGroup.height);

    const tabHeight = theme.button.height;
    const viewTop = absY + tabHeight + 8;
    const viewHeight = content.height - tabHeight - 28;

    this.standingsArea = {
      x: absX,
      y: viewTop,
      w: content.width,
      h: viewHeight,
    };

    // ScrollFrame + DataTable.
    if (this.tableFrame) {
      this.tableFrame.setPosition(absX, viewTop);
      this.tableFrame.setSize(content.width, viewHeight);
    }
    this.table.setSize(content.width, viewHeight);

    // StandingsGraph: no setSize support. If visible during resize, destroy it
    // so openStandingsTab() rebuilds at the new size. Force back to Companies
    // tab so the user isn't left staring at an empty area.
    if (this.standingsGraph?.visible) {
      this.standingsGraph.destroy();
      this.standingsGraph = null;
      this.hasAnimatedStandings = false;
      this.tableFrame?.setVisible(true);
    }
  }

  private openCompaniesTab(): void {
    this.tableFrame?.setVisible(true);
    this.standingsGraph?.setVisible(false);
  }

  private openStandingsTab(): void {
    this.tableFrame?.setVisible(false);
    if (!this.standingsGraph && this.standingsArea) {
      const area = this.standingsArea;
      this.standingsGraph = new StandingsGraph(this, {
        x: area.x,
        y: area.y,
        width: area.w,
        height: area.h,
        onMetricChange: (metric: StandingsMetric) => {
          if (!this.standingsGraph) return;
          const data = buildStandingsData(gameStore.getState(), metric);
          this.standingsGraph.setStandingsData(data);
        },
      });
    }
    if (this.standingsGraph) {
      const data = buildStandingsData(gameStore.getState(), "cash");
      this.standingsGraph.setMetric("cash");
      this.standingsGraph.setStandingsData(data);
      this.standingsGraph.setVisible(true);
      if (!this.hasAnimatedStandings) {
        this.standingsGraph.playDrawIn();
        this.hasAnimatedStandings = true;
      }
    }
  }

  private updatePortraitForCompany(
    companyId: string,
    companies: AICompany[],
  ): void {
    const company = companies.find((c) => c.id === companyId);
    if (!company) return;

    const state = gameStore.getState();
    const empire = state.galaxy.empires.find((e) => e.id === company.empireId);
    const view = buildRivalView(company, this.intelTier, 0, 0);

    const assignedShips = company.activeRoutes.reduce(
      (sum: number, r) => sum + r.assignedShipIds.length,
      0,
    );

    const details: { label: string; value: string }[] = [
      { label: "Company", value: company.name },
      { label: "Empire", value: empire?.name ?? "Unknown" },
      { label: "Style", value: personalityLabel(company.personality) },
    ];

    // Tier 1: tech info
    if (view.techBranch !== undefined) {
      details.push({ label: "Tech Branch", value: view.techBranch });
      details.push({
        label: "Tech Tier",
        value: `T${view.techTier ?? 0}`,
      });
    } else {
      details.push({ label: "Tech Branch", value: "???" });
    }

    // Tier 2: hub + contracts
    if (view.hubTier !== undefined) {
      details.push({ label: "Hub Tier", value: String(view.hubTier) });
      details.push({
        label: "Contracts",
        value: String(view.contractsCompleted ?? 0),
      });
    } else {
      details.push({ label: "Hub Tier", value: "???" });
    }

    // Tier 3: routes + fleet
    if (view.routeCount !== undefined) {
      details.push({ label: "Routes", value: String(view.routeCount) });
      details.push({ label: "Ships", value: String(view.fleetSize) });
      details.push({ label: "Assigned", value: String(assignedShips) });
    } else {
      details.push({ label: "Routes", value: "???" });
      details.push({ label: "Ships", value: "???" });
    }

    // Tier 4: cash
    if (view.cash !== undefined) {
      details.push({ label: "Cash", value: formatCash(view.cash) });
    } else {
      details.push({ label: "Cash", value: "???" });
    }

    details.push({
      label: "Status",
      value: company.bankrupt ? "BANKRUPT" : "Active",
    });

    this.portrait.showCEO(company, details);
  }
}

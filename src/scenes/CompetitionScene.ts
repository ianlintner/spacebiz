import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import type { AICompany } from "../data/types.ts";
import {
  getTheme,
  DataTable,
  Panel,
  PortraitPanel,
  createStarfield,
  getLayout,
} from "../ui/index.ts";
import {
  getIntelTier,
  buildRivalView,
  getNextIntelUnlockDescription,
} from "../game/intel/IntelLevel.ts";
import type { IntelTier } from "../game/intel/IntelLevel.ts";

function formatCash(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return sign + "\u00A7" + abs.toLocaleString("en-US");
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
  private table!: DataTable;
  private intelTier: IntelTier = 0;

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
    const contentPanel = new Panel(this, {
      x: L.mainContentLeft,
      y: L.contentTop,
      width: L.mainContentWidth,
      height: L.contentHeight,
      title: "AI Companies",
    });
    const content = contentPanel.getContentArea();
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

    this.table = new DataTable(this, {
      x: absX,
      y: absY,
      width: content.width,
      height: content.height - 20,
      columns: [
        { key: "name", label: "Company", width: 120 },
        { key: "empire", label: "Empire", width: 100 },
        { key: "personality", label: "Style", width: 100 },
        {
          key: "cash",
          label: this.intelTier >= 4 ? "Cash" : "Cash (T4)",
          width: 90,
        },
        {
          key: "routes",
          label: this.intelTier >= 3 ? "Routes" : "Routes (T3)",
          width: 60,
          align: "right",
        },
        {
          key: "fleet",
          label: this.intelTier >= 3 ? "Ships" : "Ships (T3)",
          width: 60,
          align: "right",
        },
        { key: "status", label: "Status", width: 80, colorFn: statusColorFn },
      ],
      onRowSelect: (_rowIdx: number, rowData: Record<string, unknown>) => {
        this.updatePortraitForCompany(
          rowData["companyId"] as string,
          companies,
        );
      },
    });
    this.table.setRows(rows);
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

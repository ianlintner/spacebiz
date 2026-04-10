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

    // Sidebar portrait
    this.portrait = new PortraitPanel(this, {
      x: L.sidebarLeft,
      y: L.contentTop,
      width: L.sidebarWidth,
      height: L.contentHeight,
    });

    const activeCount = companies.filter((c) => !c.bankrupt).length;
    this.portrait.updatePortrait("company", 0, "Competition", [
      { label: "Active", value: String(activeCount) },
      { label: "Bankrupt", value: String(companies.length - activeCount) },
    ]);

    // Content panel
    const contentPanel = new Panel(this, {
      x: L.mainContentLeft,
      y: L.contentTop,
      width: L.mainContentWidth,
      height: L.contentHeight,
      title: "AI Companies",
    });
    const content = contentPanel.getContentArea();

    // Build table rows
    const rows = companies.map((company) => {
      const empire = empireMap.get(company.empireId);
      return {
        companyId: company.id,
        name: company.name,
        empire: empire?.name ?? "Unknown",
        personality: personalityLabel(company.personality),
        cash: formatCash(company.cash),
        routes: company.activeRoutes.length,
        fleet: company.fleet.length,
        status: company.bankrupt ? "Bankrupt" : "Active",
      };
    });

    const statusColorFn = (value: unknown): number | null => {
      return value === "Bankrupt" ? theme.colors.loss : theme.colors.profit;
    };

    this.table = new DataTable(this, {
      x: content.x,
      y: content.y,
      width: content.width,
      height: content.height - 20,
      columns: [
        { key: "name", label: "Company", width: 120 },
        { key: "empire", label: "Empire", width: 100 },
        { key: "personality", label: "Style", width: 100 },
        { key: "cash", label: "Cash", width: 90 },
        { key: "routes", label: "Routes", width: 60, align: "right" },
        { key: "fleet", label: "Ships", width: 60, align: "right" },
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

    const assignedShips = company.activeRoutes.reduce(
      (sum: number, r) => sum + r.assignedShipIds.length,
      0,
    );

    this.portrait.updatePortrait("company", 0, company.name, [
      { label: "Empire", value: empire?.name ?? "Unknown" },
      { label: "Style", value: personalityLabel(company.personality) },
      { label: "Cash", value: formatCash(company.cash) },
      { label: "Routes", value: String(company.activeRoutes.length) },
      { label: "Ships", value: String(company.fleet.length) },
      { label: "Assigned", value: String(assignedShips) },
      { label: "Status", value: company.bankrupt ? "BANKRUPT" : "Active" },
    ]);
  }
}

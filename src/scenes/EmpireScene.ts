import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import type { DiplomaticRelation, Empire } from "../data/types.ts";
import {
  getTheme,
  Button,
  DataTable,
  ScrollFrame,
  Label,
  Panel,
  PortraitPanel,
  createStarfield,
  getLayout,
  attachReflowHandler,
} from "../ui/index.ts";
import { TARIFF_DIPLOMATIC_MULTIPLIER } from "../data/constants.ts";

function statusLabel(status: string): string {
  switch (status) {
    case "war":
      return "⚔ War";
    case "coldWar":
      return "❄ Cold War";
    case "peace":
      return "☮ Peace";
    case "tradePact":
      return "🤝 Trade Pact";
    case "alliance":
      return "★ Alliance";
    default:
      return status;
  }
}

function statusColor(value: unknown): number | null {
  const theme = getTheme();
  const s = String(value);
  if (s.includes("War") && !s.includes("Cold")) return theme.colors.loss;
  if (s.includes("Cold")) return theme.colors.warning;
  if (s.includes("Pact")) return theme.colors.profit;
  if (s.includes("Alliance")) return theme.colors.accent;
  return null;
}

export class EmpireScene extends Phaser.Scene {
  private portrait!: PortraitPanel;
  private contentPanel!: Panel;
  private tableFrame!: ScrollFrame;
  private table!: DataTable;
  private filterToPlayer = true;
  private cachedRows: Array<Record<string, unknown>> = [];
  private filterToggleBtn!: Button;
  private filterSummaryLabel!: Label;

  constructor() {
    super({ key: "EmpireScene" });
  }

  create(): void {
    const L = getLayout();

    createStarfield(this);

    const state = gameStore.getState();
    const empires = state.galaxy.empires;
    const systems = state.galaxy.systems;
    const relations = state.diplomaticRelations ?? [];
    const hyperlanes = state.hyperlanes ?? [];
    const borderPorts = state.borderPorts ?? [];

    // Sidebar portrait
    this.portrait = new PortraitPanel(this, {
      x: L.sidebarLeft,
      y: L.contentTop,
      width: L.sidebarWidth,
      height: L.contentHeight,
    });
    this.portrait.updatePortrait("empire", 0, "Empires & Diplomacy", [
      { label: "Empires", value: String(empires.length) },
      { label: "Hyperlanes", value: String(hyperlanes.length) },
      { label: "Border Ports", value: String(borderPorts.length) },
    ]);

    // Content panel
    this.contentPanel = new Panel(this, {
      x: L.mainContentLeft,
      y: L.contentTop,
      width: L.mainContentWidth,
      height: L.contentHeight,
      title: "Diplomatic Relations",
    });
    const content = this.contentPanel.getContentArea();
    const absX = L.mainContentLeft + content.x;
    const absY = L.contentTop + content.y;

    // ── Filter toolbar ────────────────────────────────
    // With 8 empires the relation list is n*(n-1)/2 = 28 rows (56 for two-way
    // tables); most players only care about relations involving their own
    // empire. Default the filter on; players can toggle it off to see the
    // full galactic picture.
    const toolbarH = 32;
    this.filterToggleBtn = new Button(this, {
      x: absX,
      y: absY,
      height: toolbarH - 4,
      label: "Involves my empire",
      autoWidth: true,
      fontSize: 11,
      onClick: () => {
        this.filterToPlayer = !this.filterToPlayer;
        this.filterToggleBtn.setActive(this.filterToPlayer);
        this.applyRowFilter();
      },
    });
    this.filterToggleBtn.setActive(this.filterToPlayer);

    this.filterSummaryLabel = new Label(this, {
      x: absX + 8,
      y: absY + toolbarH / 2,
      text: "",
      style: "caption",
    });
    // Align label vertically with button
    this.filterSummaryLabel.setOrigin(0, 0.5);

    this.tableFrame = new ScrollFrame(this, {
      x: absX,
      y: absY + toolbarH + 4,
      width: content.width,
      height: content.height - 20 - toolbarH - 4,
    });
    this.table = new DataTable(this, {
      x: 0,
      y: 0,
      width: content.width,
      height: content.height - 20 - toolbarH - 4,
      contentSized: true,
      columns: [
        { key: "empireA", label: "Empire A", width: 120 },
        { key: "empireB", label: "Empire B", width: 120 },
        { key: "status", label: "Status", width: 110, colorFn: statusColor },
        { key: "turns", label: "Turns", width: 60, align: "right" },
        { key: "tariff", label: "Tariff", width: 80, align: "right" },
        { key: "ports", label: "Ports", width: 80, align: "center" },
      ],
      onRowSelect: (_rowIdx: number, rowData: Record<string, unknown>) => {
        this.updatePortraitForEmpire(rowData["empireAId"] as string, empires);
      },
    });
    this.tableFrame.setContent(this.table);

    // Build all rows once; the filter just hides/shows.
    this.cachedRows = this.buildRelationRows(empires, relations, systems);
    this.applyRowFilter();

    this.relayout();
    attachReflowHandler(this, () => this.relayout());
  }

  private relayout(): void {
    const L = getLayout();

    // PortraitPanel: setPosition before setSize.
    this.portrait.setPosition(L.sidebarLeft, L.contentTop);
    this.portrait.setSize(L.sidebarWidth, L.contentHeight);

    // Content panel.
    this.contentPanel.setPosition(L.mainContentLeft, L.contentTop);
    this.contentPanel.setSize(L.mainContentWidth, L.contentHeight);

    // Re-read content area after panel resize.
    const content = this.contentPanel.getContentArea();
    const absX = L.mainContentLeft + content.x;
    const absY = L.contentTop + content.y;

    const toolbarH = 32;

    // Filter toolbar: toggle button + summary label.
    // TODO(setSize): Button (autoWidth — reposition only)
    this.filterToggleBtn.setPosition(absX, absY);

    // Summary label sits to the right of the autoWidth button — query its
    // width after the button has been laid out for this frame.
    // TODO(setSize): Label
    this.filterSummaryLabel.setPosition(
      this.filterToggleBtn.x + this.filterToggleBtn.width + 8,
      absY + toolbarH / 2,
    );

    // ScrollFrame + DataTable.
    this.tableFrame.setPosition(absX, absY + toolbarH + 4);
    this.tableFrame.setSize(content.width, content.height - 20 - toolbarH - 4);
    this.table.setSize(content.width, content.height - 20 - toolbarH - 4);
  }

  private applyRowFilter(): void {
    const playerId = gameStore.getState().playerEmpireId;
    const visible =
      this.filterToPlayer && playerId
        ? this.cachedRows.filter(
            (r) => r["empireAId"] === playerId || r["empireBId"] === playerId,
          )
        : this.cachedRows;
    this.table.setRows(visible);
    const total = this.cachedRows.length;
    const shown = visible.length;
    this.filterSummaryLabel.setText(
      this.filterToPlayer
        ? `${shown} of ${total} relations`
        : `${total} relations`,
    );
  }

  private buildRelationRows(
    empires: Empire[],
    relations: DiplomaticRelation[],
    systems: Array<{ id: string; empireId: string }>,
  ): Array<Record<string, unknown>> {
    const state = gameStore.getState();
    const empireMap = new Map(empires.map((e) => [e.id, e]));
    const hyperlanes = state.hyperlanes ?? [];
    const borderPorts = state.borderPorts ?? [];

    return relations.map((rel) => {
      const eA = empireMap.get(rel.empireA);
      const eB = empireMap.get(rel.empireB);

      // Count open ports between these empires
      const pairPorts = borderPorts.filter(
        (bp) =>
          (bp.empireId === rel.empireA || bp.empireId === rel.empireB) &&
          hyperlanes.some((hl) => {
            if (hl.id !== bp.hyperlaneId) return false;
            const sA = systems.find((s) => s.id === hl.systemA);
            const sB = systems.find((s) => s.id === hl.systemB);
            if (!sA || !sB) return false;
            return (
              (sA.empireId === rel.empireA && sB.empireId === rel.empireB) ||
              (sA.empireId === rel.empireB && sB.empireId === rel.empireA)
            );
          }),
      );
      const openPorts = pairPorts.filter((p) => p.status === "open").length;

      const tariffMult = TARIFF_DIPLOMATIC_MULTIPLIER[rel.status] ?? 1;

      return {
        empireAId: rel.empireA,
        empireBId: rel.empireB,
        empireA: eA?.name ?? rel.empireA,
        empireB: eB?.name ?? rel.empireB,
        status: statusLabel(rel.status),
        turns: rel.turnsInCurrentStatus,
        tariff: `×${tariffMult}`,
        ports: `${openPorts}/${pairPorts.length}`,
      };
    });
  }

  private updatePortraitForEmpire(empireId: string, empires: Empire[]): void {
    const empire = empires.find((e) => e.id === empireId);
    if (!empire) return;

    const state = gameStore.getState();
    const empireSystems = state.galaxy.systems.filter(
      (s) => s.empireId === empireId,
    );
    const empirePlanets = state.galaxy.planets.filter((p) =>
      empireSystems.some((s) => s.id === p.systemId),
    );

    // Charter standing in this empire — visible at-a-glance so the player
    // sees both their footprint here and how much room is left to grow.
    const playerCharters = (state.charters ?? []).filter(
      (c) => c.empireId === empireId,
    );
    const playerDom = playerCharters.filter(
      (c) => c.pool === "domestic",
    ).length;
    const playerFgn = playerCharters.filter((c) => c.pool === "foreign").length;
    const pool = empire.routeSlotPool;
    const repInThisEmpire = state.empireReputation?.[empireId] ?? 50;

    this.portrait.showEmpireLeader(empire, [
      { label: "Empire", value: empire.name },
      { label: "Systems", value: String(empireSystems.length) },
      { label: "Planets", value: String(empirePlanets.length) },
      { label: "Tariff", value: `${(empire.tariffRate * 100).toFixed(0)}%` },
      { label: "Disposition", value: empire.disposition },
      { label: "Your rep", value: String(Math.round(repInThisEmpire)) },
      { label: "Your charters", value: `${playerDom}D / ${playerFgn}F` },
      {
        label: "Open slots",
        value: pool ? `${pool.domesticOpen}D / ${pool.foreignOpen}F` : "—",
      },
    ]);
  }
}

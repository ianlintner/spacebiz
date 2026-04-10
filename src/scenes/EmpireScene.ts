import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import type { DiplomaticRelation, Empire } from "../data/types.ts";
import {
  getTheme,
  DataTable,
  Panel,
  PortraitPanel,
  createStarfield,
  getLayout,
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
  private table!: DataTable;

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
    const contentPanel = new Panel(this, {
      x: L.mainContentLeft,
      y: L.contentTop,
      width: L.mainContentWidth,
      height: L.contentHeight,
      title: "Diplomatic Relations",
    });
    const content = contentPanel.getContentArea();

    this.table = new DataTable(this, {
      x: content.x,
      y: content.y,
      width: content.width,
      height: content.height - 20,
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

    // Build and set row data
    const rows = this.buildRelationRows(empires, relations, systems);
    this.table.setRows(rows);
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

    this.portrait.updatePortrait("empire", 0, empire.name, [
      { label: "Systems", value: String(empireSystems.length) },
      { label: "Planets", value: String(empirePlanets.length) },
      { label: "Tariff", value: `${(empire.tariffRate * 100).toFixed(0)}%` },
    ]);
  }
}

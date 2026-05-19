import * as Phaser from "phaser";
import {
  DataTable,
  ScrollFrame,
  colorToString,
  getBranchColor,
  getTheme,
} from "@spacebiz/ui";
import { TECH_GRAPH } from "../../data/constants.ts";
import type { TechState } from "../../data/types.ts";

export interface TechResearchedTableConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  onSelect: (techId: string) => void;
}

interface ResearchedRow extends Record<string, unknown> {
  techId: string;
  tech: string;
  branch: string;
  tier: number;
  owned: number;
  effect: string;
}

export class TechResearchedTable extends Phaser.GameObjects.Container {
  private cfg: TechResearchedTableConfig;
  private frame: ScrollFrame;
  private table: DataTable;
  private emptyText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, config: TechResearchedTableConfig) {
    super(scene, config.x, config.y);
    this.cfg = config;
    scene.add.existing(this);

    const theme = getTheme();
    this.frame = new ScrollFrame(scene, {
      x: 0,
      y: 0,
      width: config.width,
      height: config.height,
    });
    this.add(this.frame);

    this.table = new DataTable(scene, {
      x: 0,
      y: 0,
      width: config.width,
      height: config.height,
      contentSized: true,
      columns: [
        {
          key: "tech",
          label: "Tech",
          width: 160,
          flex: 2,
          sortable: true,
        },
        {
          key: "branch",
          label: "Branch",
          width: 90,
          sortable: true,
          colorFn: (value) =>
            typeof value === "string" ? getBranchColor(value) : null,
          format: (v) =>
            typeof v === "string"
              ? v.charAt(0).toUpperCase() + v.slice(1)
              : String(v),
        },
        {
          key: "tier",
          label: "Tier",
          width: 50,
          align: "center",
          sortable: true,
        },
        {
          key: "owned",
          label: "Owned",
          width: 60,
          align: "center",
          sortable: true,
          format: (v) => (typeof v === "number" ? `${v}×` : String(v)),
        },
        {
          key: "effect",
          label: "Effect",
          width: 200,
          flex: 3,
          sortable: false,
        },
      ],
      onRowSelect: (_idx, row) => {
        const techId = (row as ResearchedRow).techId;
        config.onSelect(techId);
      },
      emptyStateText: "No techs researched yet",
      emptyStateHint: "Unlock a tech on the Tree tab to populate this list",
    });
    this.frame.setContent(this.table);

    this.emptyText = scene.add
      .text(config.width / 2, config.height / 2, "", {
        fontSize: "11px",
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.textDim),
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);
    this.add(this.emptyText);
  }

  setTableState(tech: TechState): this {
    const rows: ResearchedRow[] = [];
    for (const [techId, count] of Object.entries(tech.purchaseCount)) {
      if (count <= 0) continue;
      const node = TECH_GRAPH.find((n) => n.id === techId);
      if (!node) continue;
      rows.push({
        techId,
        tech: `${node.icon} ${node.name}`,
        branch: node.branch,
        tier: node.tier,
        owned: count,
        effect: node.description,
      });
    }
    this.table.setRows(rows);
    return this;
  }

  resize(width: number, height: number): this {
    this.cfg.width = width;
    this.cfg.height = height;
    this.frame.setSize(width, height);
    this.table.setSize(width, height);
    this.emptyText.setPosition(width / 2, height / 2);
    return this;
  }
}

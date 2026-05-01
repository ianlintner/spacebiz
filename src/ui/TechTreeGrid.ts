import * as Phaser from "phaser";
import { getTheme, colorToString } from "@spacebiz/ui";
import type {
  Technology,
  TechBranch as TechBranchValue,
} from "../data/types.ts";
import { TechBranch } from "../data/types.ts";
import { TECH_TREE } from "../data/constants.ts";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type TechNodeState =
  | "locked"
  | "available"
  | "researching"
  | "completed";

export interface TechTreeGridState {
  completedTechIds: string[];
  currentResearchId: string | null;
  researchProgress: number;
  /** Pre-computed availability lookup for `available` nodes. */
  isAvailable: (techId: string) => boolean;
}

export interface TechTreeGridConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Initial tech state. May be supplied later via `setState`. */
  state?: TechTreeGridState;
  /** Fired when a node is clicked. */
  onSelect?: (techId: string) => void;
}

// ---------------------------------------------------------------------------
// Private rendering types
// ---------------------------------------------------------------------------

const BRANCH_ORDER: TechBranchValue[] = [
  TechBranch.Logistics,
  TechBranch.Diplomacy,
  TechBranch.Engineering,
  TechBranch.Intelligence,
  TechBranch.Crisis,
];

export const BRANCH_LABELS: Record<TechBranchValue, string> = {
  [TechBranch.Logistics]: "Logistics",
  [TechBranch.Diplomacy]: "Diplomacy",
  [TechBranch.Engineering]: "Engineering",
  [TechBranch.Intelligence]: "Intelligence",
  [TechBranch.Crisis]: "Crisis Mgmt",
};

const BRANCH_COLORS: Record<TechBranchValue, number> = {
  [TechBranch.Logistics]: 0x4fc3f7,
  [TechBranch.Diplomacy]: 0xffd54f,
  [TechBranch.Engineering]: 0xff8a65,
  [TechBranch.Intelligence]: 0xce93d8,
  [TechBranch.Crisis]: 0xef5350,
};

interface NodeView {
  tech: Technology;
  state: TechNodeState;
  branchColor: number;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  costLabel: Phaser.GameObjects.Text;
  hitArea: Phaser.GameObjects.Rectangle;
  glow: Phaser.GameObjects.Rectangle;
  glowTween: Phaser.Tweens.Tween | null;
  checkmark: Phaser.GameObjects.Text;
}

interface BranchRow {
  branch: TechBranchValue;
  label: Phaser.GameObjects.Text;
  /** Tier-ordered nodes for this branch. */
  nodes: NodeView[];
  /** Connectors between consecutive nodes (line[i] connects nodes[i] -> nodes[i+1]). */
  connectors: Phaser.GameObjects.Line[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Self-contained tech-tree grid. Owns its node sprites, edge lines, hit
 * areas and the researching-glow tween. Reflows in place via `setSize`,
 * mutating existing children rather than destroying and rebuilding.
 *
 * Construction order:
 *   1. `new TechTreeGrid(scene, { x, y, width, height })`
 *   2. (optional) `setState(...)` to apply initial gameplay state.
 *
 * Subsequent calls to `setSize` and `setState` are idempotent and
 * preserve children.
 */
export class TechTreeGrid extends Phaser.GameObjects.Container {
  private gridWidth: number;
  private gridHeight: number;

  private rows: BranchRow[] = [];
  private nodeIndex = new Map<string, NodeView>();

  private currentState: TechTreeGridState | null = null;
  private readonly onSelect: ((techId: string) => void) | undefined;

  constructor(scene: Phaser.Scene, config: TechTreeGridConfig) {
    super(scene, config.x, config.y);
    this.gridWidth = config.width;
    this.gridHeight = config.height;
    this.onSelect = config.onSelect;

    this.buildSkeleton();

    if (config.state) {
      this.setGridState(config.state);
    } else {
      this.layout();
    }

    scene.add.existing(this);
  }

  // ── Public API ─────────────────────────────────────────────

  public setSize(width: number, height: number): this {
    super.setSize(width, height);
    this.gridWidth = width;
    this.gridHeight = height;
    this.layout();
    return this;
  }

  /**
   * Update visual state of every node based on the current research
   * progress. Mutates existing children — does not allocate new ones.
   */
  public setGridState(state: TechTreeGridState): this {
    this.currentState = state;
    for (const node of this.nodeIndex.values()) {
      const nodeState = this.computeNodeState(node.tech, state);
      this.applyNodeState(node, nodeState);
    }
    // Connector colors depend on node state
    this.refreshConnectorColors();
    return this;
  }

  // ── Skeleton construction (one-time, in constructor) ──────

  private buildSkeleton(): void {
    const theme = getTheme();

    for (const branch of BRANCH_ORDER) {
      const branchColor = BRANCH_COLORS[branch];

      const branchLabel = this.scene.add
        .text(0, 0, BRANCH_LABELS[branch], {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(branchColor),
        })
        .setOrigin(0, 0.5);
      this.add(branchLabel);

      const branchTechs = TECH_TREE.filter((t) => t.branch === branch).sort(
        (a, b) => a.tier - b.tier,
      );

      const nodes: NodeView[] = [];
      const connectors: Phaser.GameObjects.Line[] = [];

      for (let i = 0; i < branchTechs.length; i++) {
        const tech = branchTechs[i];

        const glow = this.scene.add
          .rectangle(0, 0, 1, 1, branchColor, 0.15)
          .setVisible(false);
        this.add(glow);

        const bg = this.scene.add.rectangle(0, 0, 1, 1, 0x1a1a2e, 0.6);
        this.add(bg);

        const label = this.scene.add.text(0, 0, tech.name, {
          fontSize: "10px",
          fontFamily: theme.fonts.caption.family,
          color: colorToString(0x555555),
          wordWrap: { width: 1 },
        });
        this.add(label);

        const costLabel = this.scene.add
          .text(0, 0, `${tech.rpCost} RP`, {
            fontSize: "9px",
            fontFamily: theme.fonts.caption.family,
            color: colorToString(0x444444),
          })
          .setOrigin(1, 1);
        this.add(costLabel);

        const checkmark = this.scene.add
          .text(0, 0, "✓", {
            fontSize: "14px",
            color: colorToString(theme.colors.profit),
          })
          .setOrigin(1, 0)
          .setVisible(false);
        this.add(checkmark);

        const hitArea = this.scene.add
          .rectangle(0, 0, 1, 1, 0x000000, 0)
          .setInteractive({ useHandCursor: false });
        this.add(hitArea);

        const node: NodeView = {
          tech,
          state: "locked",
          branchColor,
          bg,
          label,
          costLabel,
          hitArea,
          glow,
          glowTween: null,
          checkmark,
        };

        hitArea.on("pointerup", () => {
          if (this.onSelect) this.onSelect(tech.id);
        });
        hitArea.on("pointerover", () => {
          if (node.state !== "locked") {
            bg.setStrokeStyle(2, 0xffffff, 0.8);
          }
        });
        hitArea.on("pointerout", () => {
          this.applyNodeStrokeStyle(node);
        });

        nodes.push(node);
        this.nodeIndex.set(tech.id, node);

        if (i > 0) {
          const line = this.scene.add
            .line(0, 0, 0, 0, 0, 0, 0x333333, 0.5)
            .setOrigin(0, 0);
          this.add(line);
          connectors.push(line);
        }
      }

      this.rows.push({ branch, label: branchLabel, nodes, connectors });
    }
  }

  // ── Layout / reflow ───────────────────────────────────────

  private layout(): void {
    const branchCount = BRANCH_ORDER.length;
    const tiersCount = 4;
    const rowHeight = Math.min(68, this.gridHeight / branchCount);
    const labelColumnWidth = 90;
    const nodeAreaWidth = this.gridWidth - labelColumnWidth;
    const nodeGapX = 8;
    const nodeWidth = Math.max(
      60,
      (nodeAreaWidth - nodeGapX * (tiersCount - 1)) / tiersCount,
    );
    const nodeHeight = rowHeight - 12;

    for (let bIdx = 0; bIdx < this.rows.length; bIdx++) {
      const row = this.rows[bIdx];
      const branchY = bIdx * rowHeight;

      row.label.setPosition(0, branchY + nodeHeight / 2);

      for (let tIdx = 0; tIdx < row.nodes.length; tIdx++) {
        const node = row.nodes[tIdx];
        const nodeX = labelColumnWidth + tIdx * (nodeWidth + nodeGapX);
        const nodeY = branchY;

        const cx = nodeX + nodeWidth / 2;
        const cy = nodeY + nodeHeight / 2;

        node.bg.setPosition(cx, cy);
        node.bg.setSize(nodeWidth, nodeHeight);

        node.glow.setPosition(cx, cy);
        node.glow.setSize(nodeWidth + 4, nodeHeight + 4);

        node.label.setPosition(nodeX + 4, nodeY + 3);
        node.label.setWordWrapWidth(nodeWidth - 8);

        node.costLabel.setPosition(
          nodeX + nodeWidth - 4,
          nodeY + nodeHeight - 4,
        );

        node.checkmark.setPosition(nodeX + nodeWidth - 8, nodeY + 2);

        node.hitArea.setPosition(cx, cy);
        node.hitArea.setSize(nodeWidth, nodeHeight);

        if (tIdx > 0) {
          const connector = row.connectors[tIdx - 1];
          const prevX =
            labelColumnWidth + (tIdx - 1) * (nodeWidth + nodeGapX) + nodeWidth;
          const lineY = branchY + nodeHeight / 2;
          connector.setTo(prevX + 2, lineY, nodeX - 2, lineY);
        }
      }
    }
  }

  // ── Node state styling ────────────────────────────────────

  private computeNodeState(
    tech: Technology,
    state: TechTreeGridState,
  ): TechNodeState {
    if (state.completedTechIds.includes(tech.id)) return "completed";
    if (state.currentResearchId === tech.id) return "researching";
    if (state.isAvailable(tech.id)) return "available";
    return "locked";
  }

  private applyNodeState(node: NodeView, nextState: TechNodeState): void {
    node.state = nextState;
    const theme = getTheme();
    const branchColor = node.branchColor;

    // Background + border
    let bgColor = 0x1a1a2e;
    let bgAlpha = 0.6;
    if (nextState === "completed") {
      bgColor = branchColor;
      bgAlpha = 0.2;
    } else if (nextState === "researching") {
      bgColor = branchColor;
      bgAlpha = 0.15;
    } else if (nextState === "available") {
      bgAlpha = 0.4;
    }
    node.bg.setFillStyle(bgColor, bgAlpha);
    this.applyNodeStrokeStyle(node);

    // Label color
    const nameColor =
      nextState === "locked"
        ? colorToString(0x555555)
        : nextState === "completed"
          ? colorToString(branchColor)
          : colorToString(theme.colors.text);
    node.label.setColor(nameColor);

    // Cost label
    const costText =
      nextState === "completed"
        ? "✓"
        : nextState === "researching"
          ? `${this.currentState?.researchProgress ?? 0}/${node.tech.rpCost}`
          : `${node.tech.rpCost} RP`;
    const costColor =
      nextState === "completed"
        ? colorToString(theme.colors.profit)
        : nextState === "locked"
          ? colorToString(0x444444)
          : colorToString(theme.colors.accent);
    node.costLabel.setText(costText);
    node.costLabel.setColor(costColor);

    // Hit-area cursor
    if (node.hitArea.input) {
      node.hitArea.input.cursor =
        nextState === "locked" ? "default" : "pointer";
    }

    // Glow / checkmark visibility
    node.checkmark.setVisible(nextState === "completed");
    if (nextState === "researching") {
      node.glow.setVisible(true);
      if (!node.glowTween) {
        node.glowTween = this.scene.tweens.add({
          targets: node.glow,
          alpha: { from: 0.08, to: 0.25 },
          duration: 1200,
          yoyo: true,
          repeat: -1,
        });
      }
    } else {
      node.glow.setVisible(false);
      if (node.glowTween) {
        node.glowTween.stop();
        node.glowTween = null;
      }
    }
  }

  private applyNodeStrokeStyle(node: NodeView): void {
    const locked = node.state === "locked";
    const borderColor = locked ? 0x333333 : node.branchColor;
    node.bg.setStrokeStyle(locked ? 1 : 2, borderColor, locked ? 0.3 : 0.8);
  }

  private refreshConnectorColors(): void {
    for (const row of this.rows) {
      for (let i = 0; i < row.connectors.length; i++) {
        const targetNode = row.nodes[i + 1];
        const color =
          targetNode.state === "locked" ? 0x333333 : row.nodes[0].branchColor;
        row.connectors[i].setStrokeStyle(1, color, 0.5);
      }
    }
  }

  override destroy(fromScene?: boolean): void {
    for (const node of this.nodeIndex.values()) {
      if (node.glowTween) {
        node.glowTween.stop();
        node.glowTween = null;
      }
    }
    super.destroy(fromScene);
  }
}

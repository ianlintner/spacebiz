import Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { TechBranch } from "../data/types.ts";
import type {
  Technology,
  TechBranch as TechBranchValue,
} from "../data/types.ts";
import { TECH_TREE } from "../data/constants.ts";
import {
  getTheme,
  colorToString,
  Button,
  Panel,
  PortraitPanel,
  SceneUiDirector,
  createStarfield,
  getLayout,
  ProgressBar,
  Modal,
} from "../ui/index.ts";
import {
  isTechAvailable,
  setResearchTarget,
  getCurrentResearch,
  getResearchProgress,
  calculateRPPerTurn,
} from "../game/tech/TechTree.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRANCH_ORDER: TechBranchValue[] = [
  TechBranch.Logistics,
  TechBranch.Diplomacy,
  TechBranch.Engineering,
  TechBranch.Intelligence,
  TechBranch.Crisis,
];

const BRANCH_LABELS: Record<TechBranchValue, string> = {
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

type NodeState = "locked" | "available" | "researching" | "completed";

interface TechNode {
  tech: Technology;
  state: NodeState;
  x: number;
  y: number;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  costLabel: Phaser.GameObjects.Text;
  hitArea: Phaser.GameObjects.Rectangle;
  glow?: Phaser.GameObjects.Rectangle;
  checkmark?: Phaser.GameObjects.Text;
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export class TechTreeScene extends Phaser.Scene {
  private portrait!: PortraitPanel;
  private nodes: TechNode[] = [];
  private selectedTechId: string | null = null;
  private researchButton!: Button;
  private progressBar!: ProgressBar;

  constructor() {
    super({ key: "TechTreeScene" });
  }

  create(): void {
    this.selectedTechId = null;
    this.nodes = [];
    new SceneUiDirector(this);
    const L = getLayout();
    const theme = getTheme();

    createStarfield(this);

    // Sidebar portrait
    this.portrait = new PortraitPanel(this, {
      x: L.sidebarLeft,
      y: L.contentTop,
      width: L.sidebarWidth,
      height: L.contentHeight,
    });
    this.portrait.updatePortrait("event", 0, "Research Lab", [
      { label: "Info", value: "Select a technology to view details." },
      { label: "", value: "Research provides route slots," },
      { label: "", value: "cost reductions, and special abilities." },
    ]);

    // Main panel
    const panelX = L.mainContentLeft;
    const panelY = L.contentTop;
    const panelW = L.mainContentWidth;
    const panelH = L.contentHeight;

    new Panel(this, {
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
      title: "Research & Technology",
    });

    // RP status display
    const state = gameStore.getState();
    const rpPerTurn = calculateRPPerTurn(state);
    const currentResearch = getCurrentResearch(state.tech);

    this.add.text(
      panelX + 16,
      panelY + 44,
      `Total RP: ${state.tech.researchPoints} \u2022 +${rpPerTurn} RP/turn \u2022 Techs: ${state.tech.completedTechIds.length}/20`,
      {
        fontSize: `${theme.fonts.caption.size}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(theme.colors.textDim),
      },
    );

    // Current research display
    const researchY = panelY + 64;
    this.add.text(
      panelX + 16,
      researchY,
      currentResearch
        ? `\u2699 Researching: ${currentResearch.name}`
        : "\u2699 No research in progress",
      {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(
          currentResearch ? theme.colors.accent : theme.colors.textDim,
        ),
      },
    );

    // Progress bar for current research
    const progress = getResearchProgress(state.tech);
    this.progressBar = new ProgressBar(this, {
      x: panelX + 16,
      y: researchY + 22,
      width: panelW - 32,
      height: 10,
    });
    this.progressBar.setValue(progress);

    // Progress label
    if (currentResearch) {
      this.add
        .text(
          panelX + panelW - 16,
          researchY + 22,
          `${state.tech.researchProgress}/${currentResearch.rpCost} RP`,
          {
            fontSize: `${theme.fonts.caption.size}px`,
            fontFamily: theme.fonts.caption.family,
            color: colorToString(theme.colors.textDim),
          },
        )
        .setOrigin(1, 0);
    }

    // ── Tech tree grid ──
    const treeTop = researchY + 46;
    const treeLeft = panelX + 16;
    const treeWidth = panelW - 32;
    const branchCount = BRANCH_ORDER.length;
    const tiersCount = 4;
    const rowHeight = Math.min(
      68,
      (panelH - (treeTop - panelY) - 60) / branchCount,
    );
    const nodeWidth = Math.min(140, (treeWidth - 120) / tiersCount - 12);
    const nodeHeight = rowHeight - 12;
    const labelColumnWidth = 110;
    const nodeGapX =
      (treeWidth - labelColumnWidth - nodeWidth * tiersCount) /
      (tiersCount - 1 + 2);

    for (let bIdx = 0; bIdx < branchCount; bIdx++) {
      const branch = BRANCH_ORDER[bIdx];
      const branchY = treeTop + bIdx * rowHeight;
      const branchColor = BRANCH_COLORS[branch];

      // Branch label
      this.add
        .text(treeLeft, branchY + nodeHeight / 2, BRANCH_LABELS[branch], {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(branchColor),
        })
        .setOrigin(0, 0.5);

      const branchTechs = TECH_TREE.filter((t) => t.branch === branch).sort(
        (a, b) => a.tier - b.tier,
      );

      for (let tIdx = 0; tIdx < branchTechs.length; tIdx++) {
        const tech = branchTechs[tIdx];
        const nodeX =
          treeLeft + labelColumnWidth + tIdx * (nodeWidth + nodeGapX);
        const nodeY = branchY;

        // Determine state
        let nodeState: NodeState = "locked";
        if (state.tech.completedTechIds.includes(tech.id)) {
          nodeState = "completed";
        } else if (state.tech.currentResearchId === tech.id) {
          nodeState = "researching";
        } else if (isTechAvailable(tech.id, state.tech)) {
          nodeState = "available";
        }

        const node = this.createNode(
          tech,
          nodeState,
          nodeX,
          nodeY,
          nodeWidth,
          nodeHeight,
          branchColor,
        );
        this.nodes.push(node);

        // Connection line to previous tier
        if (tIdx > 0) {
          const prevX =
            treeLeft +
            labelColumnWidth +
            (tIdx - 1) * (nodeWidth + nodeGapX) +
            nodeWidth;
          const lineY = branchY + nodeHeight / 2;
          const lineColor = nodeState === "locked" ? 0x333333 : branchColor;
          this.add
            .line(0, 0, prevX + 2, lineY, nodeX - 2, lineY, lineColor, 0.5)
            .setOrigin(0, 0);
        }
      }
    }

    // ── Research button ──
    const buttonY = panelY + panelH - 52;
    this.researchButton = new Button(this, {
      x: panelX + 16,
      y: buttonY,
      autoWidth: true,
      label: "Research Selected",
      disabled: true,
      onClick: () => this.confirmResearch(),
    });
  }

  // ════════════════════════════════════════════════════════════════
  // Node rendering
  // ════════════════════════════════════════════════════════════════

  private createNode(
    tech: Technology,
    nodeState: NodeState,
    x: number,
    y: number,
    w: number,
    h: number,
    branchColor: number,
  ): TechNode {
    const theme = getTheme();

    // Background
    let bgColor = 0x1a1a2e;
    let bgAlpha = 0.6;
    let borderColor = 0x333333;

    if (nodeState === "completed") {
      bgColor = branchColor;
      bgAlpha = 0.2;
      borderColor = branchColor;
    } else if (nodeState === "researching") {
      bgColor = branchColor;
      bgAlpha = 0.15;
      borderColor = branchColor;
    } else if (nodeState === "available") {
      borderColor = branchColor;
      bgAlpha = 0.4;
    }

    const bg = this.add.rectangle(x + w / 2, y + h / 2, w, h, bgColor, bgAlpha);
    bg.setStrokeStyle(
      nodeState === "locked" ? 1 : 2,
      borderColor,
      nodeState === "locked" ? 0.3 : 0.8,
    );

    // Tech name
    const nameColor =
      nodeState === "locked"
        ? colorToString(0x555555)
        : nodeState === "completed"
          ? colorToString(branchColor)
          : colorToString(theme.colors.text);

    const label = this.add.text(x + 4, y + 3, tech.name, {
      fontSize: "10px",
      fontFamily: theme.fonts.caption.family,
      color: nameColor,
      wordWrap: { width: w - 8 },
    });

    // Cost label
    const costText =
      nodeState === "completed"
        ? "\u2713"
        : nodeState === "researching"
          ? `${gameStore.getState().tech.researchProgress}/${tech.rpCost}`
          : `${tech.rpCost} RP`;
    const costColor =
      nodeState === "completed"
        ? colorToString(theme.colors.profit)
        : nodeState === "locked"
          ? colorToString(0x444444)
          : colorToString(theme.colors.accent);

    const costLabel = this.add.text(x + w - 4, y + h - 4, costText, {
      fontSize: "9px",
      fontFamily: theme.fonts.caption.family,
      color: costColor,
    });
    costLabel.setOrigin(1, 1);

    // Hit area for interaction
    const hitArea = this.add
      .rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0)
      .setInteractive({ useHandCursor: nodeState !== "locked" });

    hitArea.on("pointerup", () => {
      this.selectedTechId = tech.id;
      this.updateSelectedPortrait();
      this.updateResearchButton();
    });

    hitArea.on("pointerover", () => {
      if (nodeState !== "locked") {
        bg.setStrokeStyle(2, 0xffffff, 0.8);
      }
    });

    hitArea.on("pointerout", () => {
      bg.setStrokeStyle(
        nodeState === "locked" ? 1 : 2,
        borderColor,
        nodeState === "locked" ? 0.3 : 0.8,
      );
    });

    // Animated glow for researching node
    let glow: Phaser.GameObjects.Rectangle | undefined;
    if (nodeState === "researching") {
      glow = this.add.rectangle(
        x + w / 2,
        y + h / 2,
        w + 4,
        h + 4,
        branchColor,
        0.15,
      );
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.08, to: 0.25 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
      });
    }

    // Checkmark for completed
    let checkmark: Phaser.GameObjects.Text | undefined;
    if (nodeState === "completed") {
      checkmark = this.add.text(x + w - 8, y + 2, "\u2713", {
        fontSize: "14px",
        color: colorToString(theme.colors.profit),
      });
      checkmark.setOrigin(1, 0);
    }

    return {
      tech,
      state: nodeState,
      x,
      y,
      bg,
      label,
      costLabel,
      hitArea,
      glow,
      checkmark,
    };
  }

  // ════════════════════════════════════════════════════════════════
  // Portrait & Button
  // ════════════════════════════════════════════════════════════════

  private updateSelectedPortrait(): void {
    if (!this.selectedTechId) return;
    const tech = TECH_TREE.find((t) => t.id === this.selectedTechId);
    if (!tech) return;

    const state = gameStore.getState();
    const isCompleted = state.tech.completedTechIds.includes(tech.id);
    const isResearching = state.tech.currentResearchId === tech.id;
    const available = isTechAvailable(tech.id, state.tech);

    let statusLine: string;
    if (isCompleted) {
      statusLine = "\u2713 Completed";
    } else if (isResearching) {
      statusLine = `\u2699 Researching (${state.tech.researchProgress}/${tech.rpCost} RP)`;
    } else if (available) {
      statusLine = "\u2605 Available";
    } else {
      statusLine = "\uD83D\uDD12 Locked (complete prior tier)";
    }

    const details: string[] = [
      `Branch: ${BRANCH_LABELS[tech.branch]}`,
      `Tier: ${tech.tier}`,
      `Cost: ${tech.rpCost} RP`,
      "",
      statusLine,
      "",
      "Effect:",
      tech.description,
    ];

    this.portrait.updatePortrait("event", 0, tech.name, details, {});
  }

  private updateResearchButton(): void {
    if (!this.selectedTechId) {
      this.researchButton.setDisabled(true);
      return;
    }
    const state = gameStore.getState();
    const canResearch = isTechAvailable(this.selectedTechId, state.tech);
    this.researchButton.setDisabled(!canResearch);
  }

  private confirmResearch(): void {
    if (!this.selectedTechId) return;
    const state = gameStore.getState();
    const tech = TECH_TREE.find((t) => t.id === this.selectedTechId);
    if (!tech) return;

    if (!isTechAvailable(tech.id, state.tech)) return;

    const currentResearch = getCurrentResearch(state.tech);
    if (currentResearch && currentResearch.id !== tech.id) {
      // Confirm switching research
      new Modal(this, {
        title: "Switch Research?",
        body: [
          `Currently researching: ${currentResearch.name}`,
          `Progress: ${state.tech.researchProgress}/${currentResearch.rpCost} RP`,
          "",
          `Switch to: ${tech.name} (${tech.rpCost} RP)`,
          "",
          "Progress will carry over to the new technology.",
        ].join("\n"),
        confirmLabel: "Switch",
        onConfirm: () => this.applyResearch(tech.id),
      });
    } else {
      this.applyResearch(tech.id);
    }
  }

  private applyResearch(techId: string): void {
    const state = gameStore.getState();
    const newTech = setResearchTarget(techId, state.tech);
    if (newTech) {
      gameStore.setState({ ...state, tech: newTech });
      // Refresh scene
      this.scene.restart();
    }
  }
}

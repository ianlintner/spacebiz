import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { TECH_GRAPH } from "../data/constants.ts";
import {
  getTheme,
  colorToString,
  Button,
  Panel,
  PortraitPanel,
  SceneUiDirector,
  createStarfield,
  getLayout,
  attachReflowHandler,
  GROUP_TAB_STRIP_HEIGHT,
} from "../ui/index.ts";
import { TechGraphCanvas, BRANCH_LABELS } from "../ui/TechGraphCanvas.ts";
import { TechQueueRow } from "../ui/TechQueueRow.ts";
import {
  isTechAvailable,
  instantUnlockOrQueue,
  reorderQueue,
  removeFromQueue,
  getCurrentResearch,
  calculateRPPerTurn,
  effectiveCost,
} from "../game/tech/TechTree.ts";

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

const QUEUE_ROW_HEIGHT = 72;

export class TechTreeScene extends Phaser.Scene {
  private portrait!: PortraitPanel;
  private mainPanel!: Panel;
  private graph!: TechGraphCanvas;
  private queueRow!: TechQueueRow;
  private rpStatusText!: Phaser.GameObjects.Text;
  private currentResearchText!: Phaser.GameObjects.Text;
  private unlockButton!: Button;
  private selectedTechId: string | null = null;

  constructor() {
    super({ key: "TechTreeScene" });
  }

  create(): void {
    this.selectedTechId = null;
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
    this.portrait.updatePortrait(
      "event",
      0,
      "Research Lab",
      [
        { label: "Info", value: "Select a technology to view details." },
        { label: "", value: "Research provides route slots," },
        { label: "", value: "cost reductions, and special abilities." },
      ],
      { eventCategory: "opportunity" },
    );

    // Main panel
    this.mainPanel = new Panel(this, {
      x: L.mainContentLeft,
      y: L.contentTop,
      width: L.mainContentWidth,
      height: L.contentHeight,
      title: "Research & Technology",
    });

    // RP status display
    const state = gameStore.getState();
    const rpPerTurn = calculateRPPerTurn(state);
    const currentResearch = getCurrentResearch(state.tech);

    this.rpStatusText = this.add.text(
      0,
      0,
      `Total RP: ${state.tech.researchPoints} • +${rpPerTurn} RP/turn • Techs: ${state.tech.completedTechIds.length}`,
      {
        fontSize: `${theme.fonts.caption.size}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(theme.colors.textDim),
      },
    );

    // Current research display
    this.currentResearchText = this.add.text(
      0,
      0,
      currentResearch
        ? `⚙ Researching: ${currentResearch.name}`
        : "⚙ No research queued",
      {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(
          currentResearch ? theme.colors.accent : theme.colors.textDim,
        ),
      },
    );

    // Tech graph canvas (sized in relayout)
    this.graph = new TechGraphCanvas(this, {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      onSelect: (techId) => {
        this.selectedTechId = techId;
        this.updateSelectedPortrait();
        this.updateUnlockButton();
      },
    });
    this.graph.setGraphState(this.buildGraphState());

    // Queue row (sized in relayout)
    this.queueRow = new TechQueueRow(this, {
      x: 0,
      y: 0,
      width: 100,
      height: QUEUE_ROW_HEIGHT,
      onRemove: (index) => this.handleQueueRemove(index),
      onReorder: (fromIdx, toIdx) => this.handleQueueReorder(fromIdx, toIdx),
    });
    this.queueRow.setQueueState(this.buildQueueState());

    // Unlock button
    this.unlockButton = new Button(this, {
      x: 0,
      y: 0,
      autoWidth: true,
      label: "Select a technology",
      disabled: true,
      onClick: () => this.handleUnlock(),
    });

    this.relayout();
    attachReflowHandler(this, () => this.relayout());
  }

  private relayout(): void {
    const L = getLayout();
    const contentTop = L.contentTop + GROUP_TAB_STRIP_HEIGHT;
    const contentHeight = L.contentHeight - GROUP_TAB_STRIP_HEIGHT;

    this.portrait.setPosition(L.sidebarLeft, contentTop);
    this.portrait.setSize(L.sidebarWidth, contentHeight);

    this.mainPanel.setPosition(L.mainContentLeft, contentTop);
    this.mainPanel.setSize(L.mainContentWidth, contentHeight);

    const panelX = L.mainContentLeft;
    const panelY = contentTop;
    const panelW = L.mainContentWidth;
    const panelH = contentHeight;

    this.rpStatusText.setPosition(panelX + 16, panelY + 44);
    const researchY = panelY + 64;
    this.currentResearchText.setPosition(panelX + 16, researchY);

    // Graph canvas: fills most of the panel, leaving room for queue row at bottom
    const graphLeft = panelX + 16;
    const graphTop = researchY + 22;
    const graphWidth = panelW - 32;
    const graphHeight = panelH - (graphTop - panelY) - QUEUE_ROW_HEIGHT - 16;
    this.graph.setPosition(graphLeft, graphTop);
    this.graph.setSize(graphWidth, graphHeight);

    // Queue row: sits just below the graph
    const queueY = panelY + panelH - QUEUE_ROW_HEIGHT - 8;
    this.queueRow.setPosition(panelX + 16, queueY);
    this.queueRow.setQueueState({
      ...this.buildQueueState(),
    });

    // Unlock button: bottom of sidebar portrait
    const buttonY = contentTop + contentHeight - 52;
    this.unlockButton.setPosition(L.sidebarLeft + 8, buttonY);

    this.updateUnlockButton();
  }

  private buildGraphState() {
    const state = gameStore.getState();
    return {
      completedTechIds: state.tech.completedTechIds,
      purchaseCount: state.tech.purchaseCount,
      queue: state.tech.queue,
      researchPoints: state.tech.researchPoints,
      isAvailable: (techId: string) => isTechAvailable(techId, state.tech),
    };
  }

  private buildQueueState() {
    const state = gameStore.getState();
    return {
      queue: state.tech.queue,
      researchPoints: state.tech.researchPoints,
      purchaseCount: state.tech.purchaseCount,
    };
  }

  // ════════════════════════════════════════════════════════════════
  // Portrait & Button
  // ════════════════════════════════════════════════════════════════

  private updateSelectedPortrait(): void {
    if (!this.selectedTechId) return;
    const tech = TECH_GRAPH.find((t) => t.id === this.selectedTechId);
    if (!tech) return;

    const state = gameStore.getState();
    const isCompleted = state.tech.completedTechIds.includes(tech.id);
    const isQueued = state.tech.queue.includes(tech.id);
    const isResearching = state.tech.queue[0] === tech.id;
    const available = isTechAvailable(tech.id, state.tech);
    const cost = effectiveCost(tech.id, state.tech);

    let statusLine: string;
    if (isCompleted && !tech.repeatable) {
      statusLine = "✓ Completed";
    } else if (isResearching) {
      statusLine = `⚙ Researching (${cost} RP)`;
    } else if (isQueued) {
      statusLine = `📋 Queued (${cost} RP)`;
    } else if (available) {
      statusLine = `★ Available (${cost} RP)`;
    } else {
      statusLine = "🔒 Locked";
    }

    const details: Array<{ label: string; value: string }> = [
      { label: "Branch", value: BRANCH_LABELS[tech.branch] ?? tech.branch },
      { label: "Tier", value: `${tech.tier}` },
      { label: "Cost", value: `${cost} RP` },
      { label: "Status", value: statusLine },
      { label: "Effect", value: tech.description },
    ];

    if (tech.repeatable) {
      const count = state.tech.purchaseCount[tech.id] ?? 0;
      details.push({ label: "Owned", value: `${count}×` });
    }

    this.portrait.updatePortrait("event", 0, tech.name, details, {
      eventCategory: "opportunity",
    });
  }

  private updateUnlockButton(): void {
    if (!this.selectedTechId) {
      this.unlockButton.setDisabled(true);
      return;
    }
    const state = gameStore.getState();
    const canUnlock = isTechAvailable(this.selectedTechId, state.tech);
    if (!canUnlock) {
      this.unlockButton.setDisabled(true);
      return;
    }
    const cost = effectiveCost(this.selectedTechId, state.tech);
    const canAfford = state.tech.researchPoints >= cost;
    const label = canAfford ? `Unlock — ${cost} RP` : `Queue — ${cost} RP`;
    this.unlockButton.setLabel(label);
    this.unlockButton.setDisabled(false);
  }

  private handleUnlock(): void {
    if (!this.selectedTechId) return;
    const state = gameStore.getState();
    const newTech = instantUnlockOrQueue(this.selectedTechId, state.tech);
    if (newTech) {
      gameStore.setState({ ...state, tech: newTech });
      this.refreshUi();
    }
  }

  private handleQueueRemove(index: number): void {
    const state = gameStore.getState();
    const newTech = removeFromQueue(state.tech, index);
    gameStore.setState({ ...state, tech: newTech });
    this.refreshUi();
  }

  private handleQueueReorder(fromIdx: number, toIdx: number): void {
    const state = gameStore.getState();
    const newTech = reorderQueue(state.tech, fromIdx, toIdx);
    gameStore.setState({ ...state, tech: newTech });
    this.refreshUi();
  }

  private refreshUi(): void {
    const theme = getTheme();
    const state = gameStore.getState();
    const rpPerTurn = calculateRPPerTurn(state);
    const currentResearch = getCurrentResearch(state.tech);

    this.rpStatusText.setText(
      `Total RP: ${state.tech.researchPoints} • +${rpPerTurn} RP/turn • Techs: ${state.tech.completedTechIds.length}`,
    );

    this.currentResearchText.setText(
      currentResearch
        ? `⚙ Researching: ${currentResearch.name}`
        : "⚙ No research queued",
    );
    this.currentResearchText.setColor(
      colorToString(
        currentResearch ? theme.colors.accent : theme.colors.textDim,
      ),
    );

    this.graph.setGraphState(this.buildGraphState());
    this.queueRow.setQueueState(this.buildQueueState());

    this.relayout();
    this.updateSelectedPortrait();
    this.updateUnlockButton();
  }
}

import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import {
  GlassPanel,
  TabGroup,
  attachReflowHandler,
  colorToString,
  createStarfield,
  getLayout,
  getTheme,
  GROUP_TAB_STRIP_HEIGHT,
  SceneUiDirector,
} from "../ui/index.ts";
import { TechGraphCanvas } from "../ui/TechGraphCanvas.ts";
import { TechCurrentResearchCard } from "../ui/tech/TechCurrentResearchCard.ts";
import { TechDetailCard } from "../ui/tech/TechDetailCard.ts";
import { TechQueuePanel } from "../ui/tech/TechQueuePanel.ts";
import { TechResearchedTable } from "../ui/tech/TechResearchedTable.ts";
import { TechBonusesPanel } from "../ui/tech/TechBonusesPanel.ts";
import {
  instantUnlockOrQueue,
  isTechAvailable,
  removeFromQueue,
  reorderQueue,
} from "../game/tech/TechTree.ts";

const RAIL_WIDTH = 280;
const RAIL_GAP = 12;
const TAB_STRIP_HEIGHT = 32;

export class TechTreeScene extends Phaser.Scene {
  private mainPanel!: GlassPanel;
  private railPanel!: GlassPanel;

  private treeContent!: Phaser.GameObjects.Container;
  private researchedContent!: Phaser.GameObjects.Container;
  private bonusesContent!: Phaser.GameObjects.Container;

  private tabs!: TabGroup;
  private graph!: TechGraphCanvas;
  private researchedTable!: TechResearchedTable;
  private bonusesPanel!: TechBonusesPanel;

  private currentCard!: TechCurrentResearchCard;
  private detailCard!: TechDetailCard;
  private queuePanel!: TechQueuePanel;
  private rpStatusText!: Phaser.GameObjects.Text;

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

    const contentTop = L.contentTop + GROUP_TAB_STRIP_HEIGHT;
    const contentHeight = L.contentHeight - GROUP_TAB_STRIP_HEIGHT;
    const mainWidth = L.mainContentWidth - RAIL_WIDTH - RAIL_GAP;

    this.mainPanel = new GlassPanel(this, {
      x: L.mainContentLeft,
      y: contentTop,
      width: mainWidth,
      height: contentHeight,
      title: "Research & Technology",
    });

    this.railPanel = new GlassPanel(this, {
      x: L.mainContentLeft + mainWidth + RAIL_GAP,
      y: contentTop,
      width: RAIL_WIDTH,
      height: contentHeight,
      title: "Current Research",
    });

    this.treeContent = this.add.container(0, 0);
    this.researchedContent = this.add.container(0, 0);
    this.bonusesContent = this.add.container(0, 0);

    this.graph = new TechGraphCanvas(this, {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      onSelect: (techId) => this.handleSelect(techId),
    });
    this.treeContent.add(this.graph);

    this.researchedTable = new TechResearchedTable(this, {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      onSelect: (techId) => {
        this.tabs.setActiveTab(0);
        this.handleSelect(techId);
      },
    });
    this.researchedContent.add(this.researchedTable);

    this.bonusesPanel = new TechBonusesPanel(this, {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });
    this.bonusesContent.add(this.bonusesPanel);

    // TabGroup positions tab buttons during construction based on width and
    // does not reposition them in setSize. Pass the correct initial width so
    // the tab buttons land in the right place. (Window resize after this
    // point will leave the buttons at their initial positions — acceptable
    // tradeoff for now; would require a TabGroup library change to fix.)
    this.tabs = new TabGroup(this, {
      x: 0,
      y: 0,
      width: mainWidth - 24,
      tabHeight: TAB_STRIP_HEIGHT,
      tabs: [
        { label: "Tree", content: this.treeContent },
        { label: "Researched", content: this.researchedContent },
        { label: "Bonuses", content: this.bonusesContent },
      ],
      defaultTab: 0,
    });

    // ── Right rail ──────────────────────────────────────────────
    this.currentCard = new TechCurrentResearchCard(this, {
      x: 0,
      y: 0,
      width: RAIL_WIDTH - 24,
    });
    this.detailCard = new TechDetailCard(this, {
      x: 0,
      y: 0,
      width: RAIL_WIDTH - 24,
      onAction: (techId) => this.handleUnlockOrQueue(techId),
    });
    this.queuePanel = new TechQueuePanel(this, {
      x: 0,
      y: 0,
      width: RAIL_WIDTH - 24,
      visibleSlots: 4,
      onRemove: (idx) => this.handleQueueRemove(idx),
      onReorder: (from, to) => this.handleQueueReorder(from, to),
    });

    this.rpStatusText = this.add.text(0, 0, "", {
      fontSize: `${theme.fonts.caption.size}px`,
      fontFamily: theme.fonts.caption.family,
      color: colorToString(theme.colors.textDim),
    });

    this.relayout();
    this.refresh();

    attachReflowHandler(this, () => this.relayout());
  }

  private relayout(): void {
    const L = getLayout();
    const contentTop = L.contentTop + GROUP_TAB_STRIP_HEIGHT;
    const contentHeight = L.contentHeight - GROUP_TAB_STRIP_HEIGHT;
    const mainWidth = L.mainContentWidth - RAIL_WIDTH - RAIL_GAP;

    this.mainPanel.setPosition(L.mainContentLeft, contentTop);
    this.mainPanel.setSize(mainWidth, contentHeight);

    this.railPanel.setPosition(
      L.mainContentLeft + mainWidth + RAIL_GAP,
      contentTop,
    );
    this.railPanel.setSize(RAIL_WIDTH, contentHeight);

    const tabX = L.mainContentLeft + 12;
    const tabY = contentTop + 36;
    this.tabs.setPosition(tabX, tabY);
    this.tabs.setSize(mainWidth - 24, TAB_STRIP_HEIGHT);

    const contentInnerY = tabY + TAB_STRIP_HEIGHT + 8;
    const contentInnerW = mainWidth - 24;
    const contentInnerH = contentHeight - (contentInnerY - contentTop) - 12;

    // Content containers are children of TabGroup, positioned in LOCAL coords.
    // TabGroup already places them at (0, tabHeight); add 8px gap below the strip.
    this.treeContent.setPosition(0, TAB_STRIP_HEIGHT + 8);
    this.researchedContent.setPosition(0, TAB_STRIP_HEIGHT + 8);
    this.bonusesContent.setPosition(0, TAB_STRIP_HEIGHT + 8);

    this.graph.setPosition(0, 0);
    this.graph.setSize(contentInnerW, contentInnerH);

    this.researchedTable.resize(contentInnerW, contentInnerH);
    this.bonusesPanel.resize(contentInnerW, contentInnerH);

    const railInnerX = L.mainContentLeft + mainWidth + RAIL_GAP + 12;
    const railInnerY = contentTop + 36;
    const railInnerW = RAIL_WIDTH - 24;

    this.rpStatusText.setPosition(railInnerX, railInnerY);

    let y = railInnerY + 18;
    this.currentCard.setPosition(railInnerX, y);
    this.currentCard.resize(railInnerW);
    y += this.currentCard.getCardHeight() + 8;

    this.detailCard.setPosition(railInnerX, y);
    this.detailCard.resize(railInnerW);
    y += this.detailCard.getCardHeight() + 12;

    this.queuePanel.setPosition(railInnerX, y);
    this.queuePanel.resize(railInnerW);
  }

  private handleSelect(techId: string): void {
    this.selectedTechId = techId;
    const state = gameStore.getState();
    this.detailCard.setSelection(techId, state.tech);
  }

  private handleUnlockOrQueue(techId: string): void {
    const state = gameStore.getState();
    if (!isTechAvailable(techId, state.tech)) return;
    const newTech = instantUnlockOrQueue(techId, state.tech);
    if (!newTech) return;
    gameStore.setState({ ...state, tech: newTech });
    this.refresh();
  }

  private handleQueueRemove(index: number): void {
    const state = gameStore.getState();
    const newTech = removeFromQueue(state.tech, index);
    gameStore.setState({ ...state, tech: newTech });
    this.refresh();
  }

  private handleQueueReorder(fromIdx: number, toIdx: number): void {
    const state = gameStore.getState();
    const newTech = reorderQueue(state.tech, fromIdx, toIdx);
    gameStore.setState({ ...state, tech: newTech });
    this.refresh();
  }

  private refresh(): void {
    const state = gameStore.getState();
    const tech = state.tech;

    this.rpStatusText.setText(
      `${tech.researchPoints} RP available · ${tech.completedTechIds.length} techs unlocked`,
    );

    this.graph.setGraphState({
      completedTechIds: tech.completedTechIds,
      purchaseCount: tech.purchaseCount,
      queue: tech.queue,
      researchPoints: tech.researchPoints,
      isAvailable: (id) => isTechAvailable(id, tech),
    });

    this.currentCard.setCardState(state);
    this.detailCard.setSelection(this.selectedTechId, tech);
    this.queuePanel.setQueueState({
      queue: tech.queue,
      researchPoints: tech.researchPoints,
      purchaseCount: tech.purchaseCount,
    });
    this.researchedTable.setTableState(tech);
    this.bonusesPanel.setBonusesState(tech);
  }
}

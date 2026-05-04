import * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
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
  attachReflowHandler,
  GROUP_TAB_STRIP_HEIGHT,
} from "../ui/index.ts";
import { TechTreeGrid, BRANCH_LABELS } from "../ui/TechTreeGrid.ts";
import {
  isTechAvailable,
  setResearchTarget,
  getCurrentResearch,
  getResearchProgress,
  calculateRPPerTurn,
} from "../game/tech/TechTree.ts";

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export class TechTreeScene extends Phaser.Scene {
  private portrait!: PortraitPanel;
  private mainPanel!: Panel;
  private grid!: TechTreeGrid;
  private rpStatusText!: Phaser.GameObjects.Text;
  private currentResearchText!: Phaser.GameObjects.Text;
  private progressBar!: ProgressBar;
  private progressLabel: Phaser.GameObjects.Text | null = null;
  private researchButton!: Button;
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
      `Total RP: ${state.tech.researchPoints} • +${rpPerTurn} RP/turn • Techs: ${state.tech.completedTechIds.length}/20`,
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
        : "⚙ No research in progress",
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
      x: 0,
      y: 0,
      width: L.mainContentWidth - 32,
      height: 10,
    });
    this.progressBar.setValue(progress);

    // Progress label
    if (currentResearch) {
      this.progressLabel = this.add
        .text(
          0,
          0,
          `${state.tech.researchProgress}/${currentResearch.rpCost} RP`,
          {
            fontSize: `${theme.fonts.caption.size}px`,
            fontFamily: theme.fonts.caption.family,
            color: colorToString(theme.colors.textDim),
          },
        )
        .setOrigin(1, 0);
    }

    // Tech tree grid (sized in relayout)
    this.grid = new TechTreeGrid(this, {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      onSelect: (techId) => {
        this.selectedTechId = techId;
        this.updateSelectedPortrait();
        this.updateResearchButton();
      },
    });
    this.grid.setGridState(this.buildGridState());

    // ── Research button ──
    this.researchButton = new Button(this, {
      x: 0,
      y: 0,
      autoWidth: true,
      label: "Research Selected",
      disabled: true,
      onClick: () => this.confirmResearch(),
    });

    // Apply layout positions/sizes and register for future resizes.
    this.relayout();
    attachReflowHandler(this, () => this.relayout());
  }

  private relayout(): void {
    const L = getLayout();
    const contentTop = L.contentTop + GROUP_TAB_STRIP_HEIGHT;
    const contentHeight = L.contentHeight - GROUP_TAB_STRIP_HEIGHT;

    // PortraitPanel: setPosition before setSize.
    this.portrait.setPosition(L.sidebarLeft, contentTop);
    this.portrait.setSize(L.sidebarWidth, contentHeight);

    // Main panel.
    this.mainPanel.setPosition(L.mainContentLeft, contentTop);
    this.mainPanel.setSize(L.mainContentWidth, contentHeight);

    const panelX = L.mainContentLeft;
    const panelY = contentTop;
    const panelW = L.mainContentWidth;
    const panelH = contentHeight;

    // Status / current-research text — reposition only.
    this.rpStatusText.setPosition(panelX + 16, panelY + 44);
    const researchY = panelY + 64;
    this.currentResearchText.setPosition(panelX + 16, researchY);

    // Progress bar tracks the panel content width.
    this.progressBar.setPosition(panelX + 16, researchY + 22);
    this.progressBar.setSize(panelW - 32, 10);

    // Progress label (right-aligned to panel edge).
    if (this.progressLabel) {
      this.progressLabel.setPosition(panelX + panelW - 16, researchY + 22);
    }

    // Tech-tree grid: reflow in place via setSize/setPosition (no rebuild).
    const gridLeft = panelX + 16;
    const gridTop = researchY + 46;
    const gridWidth = panelW - 32;
    const gridHeight = panelH - (gridTop - panelY) - 60;
    this.grid.setPosition(gridLeft, gridTop);
    this.grid.setSize(gridWidth, gridHeight);

    // Research button (bottom-left of panel).
    const buttonY = panelY + panelH - 52;
    this.researchButton.setPosition(panelX + 16, buttonY);

    this.updateResearchButton();
  }

  private buildGridState(): {
    completedTechIds: string[];
    currentResearchId: string | null;
    researchProgress: number;
    isAvailable: (techId: string) => boolean;
  } {
    const state = gameStore.getState();
    return {
      completedTechIds: state.tech.completedTechIds,
      currentResearchId: state.tech.currentResearchId,
      researchProgress: state.tech.researchProgress,
      isAvailable: (techId) => isTechAvailable(techId, state.tech),
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
      statusLine = "✓ Completed";
    } else if (isResearching) {
      statusLine = `⚙ Researching (${state.tech.researchProgress}/${tech.rpCost} RP)`;
    } else if (available) {
      statusLine = "★ Available";
    } else {
      statusLine = "🔒 Locked (complete prior tier)";
    }

    const details: Array<{ label: string; value: string }> = [
      { label: "Branch", value: BRANCH_LABELS[tech.branch] },
      { label: "Tier", value: `${tech.tier}` },
      { label: "Cost", value: `${tech.rpCost} RP` },
      { label: "Status", value: statusLine },
      { label: "Effect", value: tech.description },
    ];

    this.portrait.updatePortrait("event", 0, tech.name, details, {
      eventCategory: "opportunity",
    });
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
        okText: "Switch",
        onOk: () => this.applyResearch(tech.id),
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
      this.refreshUi();
    }
  }

  private refreshUi(): void {
    const theme = getTheme();
    const state = gameStore.getState();
    const rpPerTurn = calculateRPPerTurn(state);
    const currentResearch = getCurrentResearch(state.tech);

    // RP totals + tech-count summary.
    this.rpStatusText.setText(
      `Total RP: ${state.tech.researchPoints} • +${rpPerTurn} RP/turn • Techs: ${state.tech.completedTechIds.length}/20`,
    );

    // Current-research line.
    this.currentResearchText.setText(
      currentResearch
        ? `⚙ Researching: ${currentResearch.name}`
        : "⚙ No research in progress",
    );
    this.currentResearchText.setColor(
      colorToString(
        currentResearch ? theme.colors.accent : theme.colors.textDim,
      ),
    );

    // Progress bar.
    this.progressBar.setValue(getResearchProgress(state.tech));

    // Progress label — created lazily on first active research.
    if (currentResearch) {
      const progressText = `${state.tech.researchProgress}/${currentResearch.rpCost} RP`;
      if (this.progressLabel) {
        this.progressLabel.setText(progressText).setVisible(true);
      } else {
        this.progressLabel = this.add
          .text(0, 0, progressText, {
            fontSize: `${theme.fonts.caption.size}px`,
            fontFamily: theme.fonts.caption.family,
            color: colorToString(theme.colors.textDim),
          })
          .setOrigin(1, 0);
      }
    } else if (this.progressLabel) {
      this.progressLabel.setVisible(false);
    }

    this.grid.setGridState(this.buildGridState());

    // relayout() repositions any lazily created label and refreshes button enablement.
    this.relayout();
    this.updateSelectedPortrait();
  }
}

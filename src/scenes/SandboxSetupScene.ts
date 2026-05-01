import * as Phaser from "phaser";
import {
  createStarfield,
  Panel,
  Button,
  Label,
  getTheme,
  getLayout,
  ScrollableList,
  Slider,
} from "@spacebiz/ui";
import { attachReflowHandler } from "../ui/index.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import {
  listSandboxSaves,
  loadSandbox,
  deleteSandboxSave,
  hasResumableSandbox,
  getActiveSandboxData,
  clearActiveSandbox,
} from "../game/simulation/SandboxSaveManager.ts";
import type { SaveSlotMeta } from "../game/simulation/SandboxSaveManager.ts";

type SizeValue = "quick" | "standard" | "epic";
type ShapeValue = "spiral" | "elliptical" | "ring" | "irregular";
type SpeedValue = "normal" | "fast" | "instant";
type LogValue = "summary" | "standard" | "verbose";

const PADDING = 24;
const SECTION_GAP = 28;
const BTN_GAP = 12;
const PANEL_H = 520;
const ACTION_BTN_W = 220;
const ACTION_BTN_H = 52;
const ACTION_BTN_GAP = 18;

export class SandboxSetupScene extends Phaser.Scene {
  private seed = 0;
  private selectedSize: SizeValue = "standard";
  private selectedShape: ShapeValue = "spiral";
  private selectedCompanyCount = 6;
  private selectedSpeed: SpeedValue = "normal";
  private selectedLogLevel: LogValue = "standard";

  // Header.
  private titleLabel!: Label;
  private subtitleLabel!: Label;

  // Config panel.
  private configPanel!: Panel;

  // Seed row.
  private seedTitleLabel!: Label;
  private seedLabel!: Label;
  private randomizeButton!: Button;

  // Galaxy size.
  private sizeSectionLabel!: Label;
  private sizeButtons: Button[] = [];

  // Galaxy shape.
  private shapeSectionLabel!: Label;
  private shapeButtons: Button[] = [];

  // AI companies slider.
  private companySlider!: Slider;

  // Playback speed.
  private speedSectionLabel!: Label;
  private speedButtons: Button[] = [];

  // Log detail.
  private logSectionLabel!: Label;
  private logButtons: Button[] = [];

  // Action buttons.
  private launchButton!: Button;
  private resumeButton: Button | null = null;
  private backButton!: Button;
  private hasResume = false;

  // Saved-games panel.
  private hasSaves = false;
  private savePanel: Panel | null = null;
  private savePanelTitle: Label | null = null;
  private saveList: ScrollableList | null = null;

  constructor() {
    super({ key: "SandboxSetupScene" });
  }

  create(): void {
    const theme = getTheme();
    this.cameras.main.setBackgroundColor(theme.colors.background);
    getAudioDirector().setMusicState("setup");

    this.seed = Math.floor(Math.random() * 1000000);
    this.selectedSize = "standard";
    this.selectedShape = "spiral";
    this.selectedCompanyCount = 6;
    this.selectedSpeed = "normal";
    this.selectedLogLevel = "standard";
    this.sizeButtons = [];
    this.shapeButtons = [];
    this.speedButtons = [];
    this.logButtons = [];

    createStarfield(this);

    // ── Title ──
    this.titleLabel = new Label(this, {
      x: 0,
      y: 40,
      text: "AI SANDBOX",
      style: "heading",
      color: theme.colors.accent,
      glow: true,
    });
    this.titleLabel.setOrigin(0.5);
    this.titleLabel.setFontSize(32);

    this.subtitleLabel = new Label(this, {
      x: 0,
      y: 82,
      text: "Configure AI-vs-AI Simulation",
      style: "caption",
      color: theme.colors.textDim,
    });
    this.subtitleLabel.setOrigin(0.5);

    // ── Config panel ──
    this.configPanel = new Panel(this, {
      x: 0,
      y: 116,
      width: 100,
      height: PANEL_H,
    });

    // ── Seed row ──
    this.seedTitleLabel = new Label(this, {
      x: 0,
      y: 0,
      text: "Seed:",
      style: "caption",
      color: theme.colors.accent,
    });

    this.seedLabel = new Label(this, {
      x: 0,
      y: 0,
      text: String(this.seed),
      style: "value",
      color: theme.colors.text,
    });

    this.randomizeButton = new Button(this, {
      x: 0,
      y: 0,
      width: 120,
      height: 38,
      label: "Randomize",
      onClick: () => {
        this.seed = Math.floor(Math.random() * 1000000);
        this.seedLabel.setText(String(this.seed));
      },
    });

    // ── Galaxy Size ──
    this.sizeSectionLabel = new Label(this, {
      x: 0,
      y: 0,
      text: "Galaxy Size",
      style: "caption",
      color: theme.colors.accent,
    });

    const sizes: { label: string; value: SizeValue }[] = [
      { label: "Quick", value: "quick" },
      { label: "Standard", value: "standard" },
      { label: "Epic", value: "epic" },
    ];
    for (const opt of sizes) {
      const btn = new Button(this, {
        x: 0,
        y: 0,
        width: 120,
        height: 38,
        label: opt.label,
        onClick: () => {
          this.selectedSize = opt.value;
          for (const b of this.sizeButtons) b.setActive(false);
          btn.setActive(true);
        },
      });
      if (opt.value === this.selectedSize) btn.setActive(true);
      this.sizeButtons.push(btn);
    }

    // ── Galaxy Shape ──
    this.shapeSectionLabel = new Label(this, {
      x: 0,
      y: 0,
      text: "Galaxy Shape",
      style: "caption",
      color: theme.colors.accent,
    });

    const shapes: { label: string; value: ShapeValue }[] = [
      { label: "Spiral", value: "spiral" },
      { label: "Elliptical", value: "elliptical" },
      { label: "Ring", value: "ring" },
      { label: "Irregular", value: "irregular" },
    ];
    for (const opt of shapes) {
      const btn = new Button(this, {
        x: 0,
        y: 0,
        width: 112,
        height: 38,
        label: opt.label,
        onClick: () => {
          this.selectedShape = opt.value;
          for (const b of this.shapeButtons) b.setActive(false);
          btn.setActive(true);
        },
      });
      if (opt.value === this.selectedShape) btn.setActive(true);
      this.shapeButtons.push(btn);
    }

    // ── AI Companies ──
    this.companySlider = new Slider(this, {
      x: 0,
      y: 0,
      width: 200,
      min: 4,
      max: 10,
      step: 1,
      value: this.selectedCompanyCount,
      label: "AI Companies",
      showValue: true,
      formatValue: (v: number) => `${v} companies`,
      onChange: (value: number) => {
        this.selectedCompanyCount = value;
      },
    });

    // ── Playback Speed ──
    this.speedSectionLabel = new Label(this, {
      x: 0,
      y: 0,
      text: "Playback Speed",
      style: "caption",
      color: theme.colors.accent,
    });

    const speeds: { label: string; value: SpeedValue }[] = [
      { label: "Normal", value: "normal" },
      { label: "Fast", value: "fast" },
      { label: "Instant", value: "instant" },
    ];
    for (const opt of speeds) {
      const btn = new Button(this, {
        x: 0,
        y: 0,
        width: 110,
        height: 38,
        label: opt.label,
        onClick: () => {
          this.selectedSpeed = opt.value;
          for (const b of this.speedButtons) b.setActive(false);
          btn.setActive(true);
        },
      });
      if (opt.value === this.selectedSpeed) btn.setActive(true);
      this.speedButtons.push(btn);
    }

    // ── Log Detail ──
    this.logSectionLabel = new Label(this, {
      x: 0,
      y: 0,
      text: "Log Detail",
      style: "caption",
      color: theme.colors.accent,
    });

    const logLevels: { label: string; value: LogValue }[] = [
      { label: "Summary", value: "summary" },
      { label: "Standard", value: "standard" },
      { label: "Verbose", value: "verbose" },
    ];
    for (const opt of logLevels) {
      const btn = new Button(this, {
        x: 0,
        y: 0,
        width: 110,
        height: 38,
        label: opt.label,
        onClick: () => {
          this.selectedLogLevel = opt.value;
          for (const b of this.logButtons) b.setActive(false);
          btn.setActive(true);
        },
      });
      if (opt.value === this.selectedLogLevel) btn.setActive(true);
      this.logButtons.push(btn);
    }

    // ── Action buttons ──
    this.hasResume = hasResumableSandbox();
    const saves = listSandboxSaves();
    this.hasSaves = saves.length > 0;

    this.launchButton = new Button(this, {
      x: 0,
      y: 0,
      width: ACTION_BTN_W,
      height: ACTION_BTN_H,
      label: "Launch Simulation",
      onClick: () => {
        clearActiveSandbox();
        this.scene.start("AISandboxScene", {
          seed: this.seed,
          gameSize: this.selectedSize,
          galaxyShape: this.selectedShape,
          companyCount: this.selectedCompanyCount,
          speed: this.selectedSpeed,
          logLevel: this.selectedLogLevel,
        });
      },
    });

    if (this.hasResume) {
      this.resumeButton = new Button(this, {
        x: 0,
        y: 0,
        width: ACTION_BTN_W,
        height: ACTION_BTN_H,
        label: "Resume Sandbox",
        onClick: () => {
          const data = getActiveSandboxData();
          if (!data) return;
          this.scene.start("AISandboxScene", {
            seed: data.config.seed,
            gameSize: data.config.gameSize,
            galaxyShape: data.config.galaxyShape,
            companyCount: data.config.companyCount,
            speed: data.speed,
            logLevel: data.config.logLevel,
            resumeFrom: data,
          });
        },
      });
    }

    this.backButton = new Button(this, {
      x: 0,
      y: 0,
      width: ACTION_BTN_W,
      height: ACTION_BTN_H,
      label: "Back to Menu",
      onClick: () => {
        this.scene.start("MainMenuScene");
      },
    });

    // ── Saved Games Panel ──
    if (this.hasSaves) {
      this.savePanel = new Panel(this, {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      this.savePanelTitle = new Label(this, {
        x: 0,
        y: 0,
        text: "Saved Sandboxes",
        style: "caption",
        color: theme.colors.accent,
      });

      this.saveList = new ScrollableList(this, {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        itemHeight: 36,
      });

      // Use a placeholder row width for now; relayout() uses scene.restart() when
      // dimensions actually change saved-row layout, so initial geometry is fine.
      const initialRowWidth = getLayout().maxContentWidth - PADDING * 2;
      for (const slot of saves) {
        const itemContainer = this.add.container(0, 0);
        this.buildSaveSlotRow(itemContainer, slot, initialRowWidth);
        this.saveList.addItem(itemContainer);
      }
    }

    this.relayout();
    attachReflowHandler(this, () => this.relayout());
  }

  private relayout(): void {
    const L = getLayout();
    const cx = L.gameWidth / 2;

    // Header.
    this.titleLabel.setPosition(cx, 40);
    this.subtitleLabel.setPosition(cx, 82);

    // Config panel — setPosition + setSize.
    const panelW = L.maxContentWidth;
    const panelX = Math.floor((L.gameWidth - panelW) / 2);
    const panelY = 116;
    this.configPanel.setPosition(panelX, panelY);
    this.configPanel.setSize(panelW, PANEL_H);

    const innerX = panelX + PADDING;
    const innerCx = panelX + panelW / 2;
    let rowY = panelY + PADDING;

    // Seed row.
    this.seedTitleLabel.setPosition(innerX, rowY);
    this.seedLabel.setPosition(innerX + 80, rowY);
    this.randomizeButton.setPosition(innerX + 200, rowY - 4);
    rowY += SECTION_GAP + 16;

    // Galaxy size.
    this.sizeSectionLabel.setPosition(innerX, rowY);
    rowY += 24;
    this.layoutHorizontalButtonRow(this.sizeButtons, innerCx, rowY, 120);
    rowY += 38 + SECTION_GAP;

    // Galaxy shape.
    this.shapeSectionLabel.setPosition(innerX, rowY);
    rowY += 24;
    this.layoutHorizontalButtonRow(this.shapeButtons, innerCx, rowY, 112);
    rowY += 38 + SECTION_GAP;

    // AI companies slider — flex track width to the panel inner area.
    this.companySlider.setPosition(innerX, rowY);
    this.companySlider.setSize(panelW - PADDING * 2, 32);
    rowY += 60 + SECTION_GAP;

    // Playback speed.
    this.speedSectionLabel.setPosition(innerX, rowY);
    rowY += 24;
    this.layoutHorizontalButtonRow(this.speedButtons, innerCx, rowY, 110);
    rowY += 38 + SECTION_GAP;

    // Log detail.
    this.logSectionLabel.setPosition(innerX, rowY);
    rowY += 24;
    this.layoutHorizontalButtonRow(this.logButtons, innerCx, rowY, 110);

    // Action buttons.
    const actionY = panelY + PANEL_H + 28;
    const totalBtns = this.hasResume ? 3 : 2;
    const totalBtnW =
      ACTION_BTN_W * totalBtns + ACTION_BTN_GAP * (totalBtns - 1);
    let actionX = cx - totalBtnW / 2;

    this.launchButton.setPosition(actionX, actionY);
    actionX += ACTION_BTN_W + ACTION_BTN_GAP;

    if (this.resumeButton) {
      this.resumeButton.setPosition(actionX, actionY);
      actionX += ACTION_BTN_W + ACTION_BTN_GAP;
    }

    this.backButton.setPosition(actionX, actionY);

    // Saved-games panel.
    if (
      this.hasSaves &&
      this.savePanel &&
      this.savePanelTitle &&
      this.saveList
    ) {
      const savePanelY = actionY + ACTION_BTN_H + 24;
      const savePanelH = Math.min(220, L.gameHeight - savePanelY - 16);
      this.savePanel.setPosition(panelX, savePanelY);
      this.savePanel.setSize(panelW, savePanelH);

      this.savePanelTitle.setPosition(panelX + PADDING, savePanelY + 8);

      // ScrollableList width/height are baked at construction; reposition
      // only. Lifting it into a setSize-aware widget is future work, out
      // of scope for the sub-widget pass.
      this.saveList.setPosition(panelX + PADDING, savePanelY + 32);
    }
  }

  private layoutHorizontalButtonRow(
    buttons: Button[],
    centerX: number,
    y: number,
    btnWidth: number,
  ): void {
    if (buttons.length === 0) return;
    const totalW = buttons.length * btnWidth + (buttons.length - 1) * BTN_GAP;
    let x = centerX - totalW / 2;
    for (const btn of buttons) {
      btn.setPosition(x, y);
      x += btnWidth + BTN_GAP;
    }
  }

  private buildSaveSlotRow(
    container: Phaser.GameObjects.Container,
    slot: SaveSlotMeta,
    rowWidth: number,
  ): void {
    const theme = getTheme();
    const dateStr = new Date(slot.timestamp).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const statusColor =
      slot.status === "complete"
        ? theme.colors.profit
        : slot.status === "paused"
          ? theme.colors.warning
          : theme.colors.text;

    const info = new Label(this, {
      x: 4,
      y: 4,
      text: `${slot.configSummary}  T${slot.turn}/${slot.maxTurns}  ${dateStr}`,
      style: "caption",
      color: statusColor,
    });
    info.setFontSize(12);
    container.add(info);

    const loadBtn = new Button(this, {
      x: rowWidth - 140,
      y: 0,
      width: 64,
      height: 28,
      label: "Load",
      onClick: () => {
        const data = loadSandbox(slot.id);
        if (!data) return;
        this.scene.start("AISandboxScene", {
          seed: data.config.seed,
          gameSize: data.config.gameSize,
          galaxyShape: data.config.galaxyShape,
          companyCount: data.config.companyCount,
          speed: data.speed,
          logLevel: data.config.logLevel,
          resumeFrom: data,
        });
      },
    });
    container.add(loadBtn);

    const delBtn = new Button(this, {
      x: rowWidth - 68,
      y: 0,
      width: 64,
      height: 28,
      label: "Delete",
      onClick: () => {
        deleteSandboxSave(slot.id);
        this.scene.restart();
      },
    });
    container.add(delBtn);
  }
}

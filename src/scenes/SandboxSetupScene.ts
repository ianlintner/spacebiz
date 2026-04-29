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
} from "../ui/index.ts";
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

export class SandboxSetupScene extends Phaser.Scene {
  private seed = 0;
  private selectedSize: "quick" | "standard" | "epic" = "standard";
  private selectedShape: "spiral" | "elliptical" | "ring" | "irregular" =
    "spiral";
  private selectedCompanyCount = 6;
  private selectedSpeed: "normal" | "fast" | "instant" = "normal";
  private selectedLogLevel: "summary" | "standard" | "verbose" = "standard";

  private seedLabel!: Label;
  private sizeButtons: Button[] = [];
  private shapeButtons: Button[] = [];
  private speedButtons: Button[] = [];
  private logButtons: Button[] = [];

  constructor() {
    super({ key: "SandboxSetupScene" });
  }

  create(): void {
    const theme = getTheme();
    const L = getLayout();
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

    const cx = L.gameWidth / 2;
    const padding = 24;
    const sectionGap = 28;
    const btnGap = 12;

    // ── Title ──
    const titleLabel = new Label(this, {
      x: cx,
      y: 40,
      text: "AI SANDBOX",
      style: "heading",
      color: theme.colors.accent,
      glow: true,
    });
    titleLabel.setOrigin(0.5);
    titleLabel.setFontSize(32);

    const subtitleLabel = new Label(this, {
      x: cx,
      y: 82,
      text: "Configure AI-vs-AI Simulation",
      style: "caption",
      color: theme.colors.textDim,
    });
    subtitleLabel.setOrigin(0.5);

    // ── Config panel ──
    const panelW = L.maxContentWidth;
    const panelH = 520;
    const panelX = Math.floor((L.gameWidth - panelW) / 2);
    const panelY = 116;
    new Panel(this, {
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
    });

    const innerX = panelX + padding;
    const innerCx = panelX + panelW / 2;
    let rowY = panelY + padding;

    // ── Seed ──
    new Label(this, {
      x: innerX,
      y: rowY,
      text: "Seed:",
      style: "caption",
      color: theme.colors.accent,
    });

    this.seedLabel = new Label(this, {
      x: innerX + 80,
      y: rowY,
      text: String(this.seed),
      style: "value",
      color: theme.colors.text,
    });

    new Button(this, {
      x: innerX + 200,
      y: rowY - 4,
      width: 120,
      height: 38,
      label: "Randomize",
      onClick: () => {
        this.seed = Math.floor(Math.random() * 1000000);
        this.seedLabel.setText(String(this.seed));
      },
    });

    rowY += sectionGap + 16;

    // ── Galaxy Size ──
    new Label(this, {
      x: innerX,
      y: rowY,
      text: "Galaxy Size",
      style: "caption",
      color: theme.colors.accent,
    });

    rowY += 24;
    const sizes: { label: string; value: "quick" | "standard" | "epic" }[] = [
      { label: "Quick", value: "quick" },
      { label: "Standard", value: "standard" },
      { label: "Epic", value: "epic" },
    ];
    const sizeBtnW = 120;
    let sizeBtnX =
      innerCx - (sizes.length * sizeBtnW + (sizes.length - 1) * btnGap) / 2;
    for (const opt of sizes) {
      const btn = new Button(this, {
        x: sizeBtnX,
        y: rowY,
        width: sizeBtnW,
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
      sizeBtnX += sizeBtnW + btnGap;
    }

    rowY += 38 + sectionGap;

    // ── Galaxy Shape ──
    new Label(this, {
      x: innerX,
      y: rowY,
      text: "Galaxy Shape",
      style: "caption",
      color: theme.colors.accent,
    });

    rowY += 24;
    const shapes: {
      label: string;
      value: "spiral" | "elliptical" | "ring" | "irregular";
    }[] = [
      { label: "Spiral", value: "spiral" },
      { label: "Elliptical", value: "elliptical" },
      { label: "Ring", value: "ring" },
      { label: "Irregular", value: "irregular" },
    ];
    const shapeBtnW = 112;
    let shapeBtnX =
      innerCx - (shapes.length * shapeBtnW + (shapes.length - 1) * btnGap) / 2;
    for (const opt of shapes) {
      const btn = new Button(this, {
        x: shapeBtnX,
        y: rowY,
        width: shapeBtnW,
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
      shapeBtnX += shapeBtnW + btnGap;
    }

    rowY += 38 + sectionGap;

    // ── AI Companies ──
    new Slider(this, {
      x: innerX,
      y: rowY,
      width: 200,
      min: 4,
      max: 10,
      step: 1,
      value: this.selectedCompanyCount,
      label: "AI Companies",
      showValue: true,
      formatValue: (v) => `${v} companies`,
      onChange: (value: number) => {
        this.selectedCompanyCount = value;
      },
    });

    rowY += 60 + sectionGap;

    // ── Playback Speed ──
    new Label(this, {
      x: innerX,
      y: rowY,
      text: "Playback Speed",
      style: "caption",
      color: theme.colors.accent,
    });

    rowY += 24;
    const speeds: { label: string; value: "normal" | "fast" | "instant" }[] = [
      { label: "Normal", value: "normal" },
      { label: "Fast", value: "fast" },
      { label: "Instant", value: "instant" },
    ];
    const speedBtnW = 110;
    let speedBtnX =
      innerCx - (speeds.length * speedBtnW + (speeds.length - 1) * btnGap) / 2;
    for (const opt of speeds) {
      const btn = new Button(this, {
        x: speedBtnX,
        y: rowY,
        width: speedBtnW,
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
      speedBtnX += speedBtnW + btnGap;
    }

    rowY += 38 + sectionGap;

    // ── Log Detail ──
    new Label(this, {
      x: innerX,
      y: rowY,
      text: "Log Detail",
      style: "caption",
      color: theme.colors.accent,
    });

    rowY += 24;
    const logLevels: {
      label: string;
      value: "summary" | "standard" | "verbose";
    }[] = [
      { label: "Summary", value: "summary" },
      { label: "Standard", value: "standard" },
      { label: "Verbose", value: "verbose" },
    ];
    const logBtnW = 110;
    let logBtnX =
      innerCx -
      (logLevels.length * logBtnW + (logLevels.length - 1) * btnGap) / 2;
    for (const opt of logLevels) {
      const btn = new Button(this, {
        x: logBtnX,
        y: rowY,
        width: logBtnW,
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
      logBtnX += logBtnW + btnGap;
    }

    // ── Action buttons ──
    const actionBtnW = 220;
    const actionBtnH = 52;
    const actionBtnGap = 18;
    const actionY = panelY + panelH + 28;

    // Check for resumable sandbox
    const canResume = hasResumableSandbox();
    const saves = listSandboxSaves();
    const hasSaves = saves.length > 0;

    // Determine how many buttons to show
    const totalBtns = canResume ? 3 : 2;
    const totalBtnW = actionBtnW * totalBtns + actionBtnGap * (totalBtns - 1);
    let actionX = cx - totalBtnW / 2;

    new Button(this, {
      x: actionX,
      y: actionY,
      width: actionBtnW,
      height: actionBtnH,
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
    actionX += actionBtnW + actionBtnGap;

    if (canResume) {
      new Button(this, {
        x: actionX,
        y: actionY,
        width: actionBtnW,
        height: actionBtnH,
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
      actionX += actionBtnW + actionBtnGap;
    }

    new Button(this, {
      x: actionX,
      y: actionY,
      width: actionBtnW,
      height: actionBtnH,
      label: "Back to Menu",
      onClick: () => {
        this.scene.start("MainMenuScene");
      },
    });

    // ── Saved Games Panel ──
    if (hasSaves) {
      const savePanelY = actionY + actionBtnH + 24;
      const savePanelH = Math.min(220, L.gameHeight - savePanelY - 16);
      const savePanelW = panelW;
      const savePanelX = panelX;

      new Panel(this, {
        x: savePanelX,
        y: savePanelY,
        width: savePanelW,
        height: savePanelH,
      });

      new Label(this, {
        x: savePanelX + padding,
        y: savePanelY + 8,
        text: "Saved Sandboxes",
        style: "caption",
        color: theme.colors.accent,
      });

      const saveList = new ScrollableList(this, {
        x: savePanelX + padding,
        y: savePanelY + 32,
        width: savePanelW - padding * 2,
        height: savePanelH - 48,
        itemHeight: 36,
      });

      for (const slot of saves) {
        const itemContainer = this.add.container(0, 0);
        this.buildSaveSlotRow(
          itemContainer,
          slot,
          savePanelW - padding * 2,
          saveList,
          saves,
        );
        saveList.addItem(itemContainer);
      }
    }

    // ── Resize handler ──
    const onResize = () => {
      this.scene.restart();
    };
    this.scale.on("resize", onResize);
    this.events.once("shutdown", () => {
      this.scale.off("resize", onResize);
    });
  }

  private buildSaveSlotRow(
    container: Phaser.GameObjects.Container,
    slot: SaveSlotMeta,
    rowWidth: number,
    _saveList: ScrollableList,
    _saves: SaveSlotMeta[],
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

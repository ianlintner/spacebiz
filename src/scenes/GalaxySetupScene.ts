import Phaser from "phaser";
import {
  createStarfield,
  Panel,
  Button,
  Label,
  getTheme,
  getLayout,
} from "../ui/index.ts";
import { gameStore } from "../data/GameStore.ts";
import { createNewGame } from "../game/NewGameSetup.ts";
import type {
  GameState,
  StarSystem,
  GameSize,
  GalaxyShape,
} from "../data/types.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import { CEO_PORTRAITS, getPortraitTextureKey } from "../data/portraits.ts";

const PRESET_NAMES = [
  "Stellar Shipping Co.",
  "Nova Freight Lines",
  "Cosmic Haulers",
  "Galaxy Express",
  "Deep Space Transport",
];

export class GalaxySetupScene extends Phaser.Scene {
  private seed = 0;
  private nameIndex = 0;
  private portraitIndex = 0;
  private selectedSystemIndex = 0;
  private gameSize: GameSize = "small";
  private galaxyShape: GalaxyShape = "spiral";
  private seedLabel!: Label;
  private nameLabel!: Label;
  private sizeButtons: Button[] = [];
  private shapeButtons: Button[] = [];
  private cardObjects: Phaser.GameObjects.GameObject[] = [];
  private systemCards: Panel[] = [];
  private startingOptions: StarSystem[] = [];
  private currentState!: GameState;
  private portraitImage: Phaser.GameObjects.Image | null = null;
  private portraitLabel: Label | null = null;
  private portraitMask: Phaser.GameObjects.Graphics | null = null;
  /** Layout values needed by buildSystemCards, set in create() */
  private configX = 0;
  private configW = 0;
  private cardsTopY = 0;
  private cardsBottomY = 0;

  constructor() {
    super({ key: "GalaxySetupScene" });
  }

  create(): void {
    const theme = getTheme();
    const L = getLayout();
    this.cameras.main.setBackgroundColor(theme.colors.background);
    getAudioDirector().setMusicState("setup");

    this.seed = Math.floor(Math.random() * 1000000);
    this.nameIndex = 0;
    this.portraitIndex = 0;
    this.selectedSystemIndex = 0;
    this.gameSize = "small";
    this.galaxyShape = "spiral";
    this.cardObjects = [];
    this.systemCards = [];
    this.sizeButtons = [];
    this.shapeButtons = [];

    // 1. Starfield background
    createStarfield(this);

    // 2. Centered setup panel
    const panelW = Math.min(780, L.gameWidth - 60);
    const panelH = Math.min(640, L.gameHeight - 60);
    const panelX = Math.floor((L.gameWidth - panelW) / 2);
    const panelY = Math.floor((L.gameHeight - panelH) / 2);
    new Panel(this, {
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
      title: "NEW GALAXY",
    });

    // Form layout
    const pad = theme.spacing.lg;
    const innerX = panelX + pad;
    const labelW = 110;
    const valueX = innerX + labelW;
    const rowH = 48;
    let rowY = panelY + theme.panel.titleHeight + pad;

    // ── Company name ──
    new Label(this, { x: innerX, y: rowY, text: "Company:", style: "body" });
    this.nameLabel = new Label(this, {
      x: valueX,
      y: rowY,
      text: PRESET_NAMES[0],
      style: "value",
      color: theme.colors.accent,
    });
    this.nameLabel.setInteractive({ useHandCursor: true });
    this.nameLabel.on("pointerdown", () => {
      this.nameIndex = (this.nameIndex + 1) % PRESET_NAMES.length;
      this.nameLabel.setText(PRESET_NAMES[this.nameIndex]);
    });

    rowY += rowH;

    // ── Seed ──
    new Label(this, { x: innerX, y: rowY, text: "Seed:", style: "body" });
    this.seedLabel = new Label(this, {
      x: valueX,
      y: rowY,
      text: String(this.seed),
      style: "value",
      color: theme.colors.accent,
    });
    new Button(this, {
      x: valueX + 180,
      y: rowY - 2,
      autoWidth: true,
      height: 34,
      label: "Randomize",
      onClick: () => {
        this.seed = Math.floor(Math.random() * 1000000);
        this.seedLabel.setText(String(this.seed));
        this.regenerate();
      },
    });

    rowY += rowH + 4;

    // ── Game Size ──
    new Label(this, { x: innerX, y: rowY, text: "Size:", style: "body" });
    const sizes: { label: string; value: GameSize }[] = [
      { label: "Small", value: "small" },
      { label: "Medium", value: "medium" },
      { label: "Large", value: "large" },
    ];
    let btnX = valueX;
    for (const sizeOpt of sizes) {
      const btn = new Button(this, {
        x: btnX,
        y: rowY - 4,
        autoWidth: true,
        height: 34,
        label: sizeOpt.label,
        onClick: () => {
          this.gameSize = sizeOpt.value;
          this.updateSizeHighlight();
          this.regenerate();
        },
      });
      this.sizeButtons.push(btn);
      btnX += (btn.width || 90) + 10;
    }
    this.updateSizeHighlight();

    rowY += rowH;

    // ── Galaxy Shape ──
    new Label(this, { x: innerX, y: rowY, text: "Shape:", style: "body" });
    const shapes: { label: string; value: GalaxyShape }[] = [
      { label: "Spiral", value: "spiral" },
      { label: "Elliptical", value: "elliptical" },
      { label: "Ring", value: "ring" },
      { label: "Irregular", value: "irregular" },
    ];
    btnX = valueX;
    for (const shapeOpt of shapes) {
      const btn = new Button(this, {
        x: btnX,
        y: rowY - 4,
        autoWidth: true,
        height: 34,
        label: shapeOpt.label,
        onClick: () => {
          this.galaxyShape = shapeOpt.value;
          this.updateShapeHighlight();
          this.regenerate();
        },
      });
      this.shapeButtons.push(btn);
      btnX += (btn.width || 100) + 10;
    }
    this.updateShapeHighlight();

    rowY += rowH + 12;

    // ── Starting System section ──
    new Label(this, {
      x: innerX,
      y: rowY,
      text: "Select Starting System:",
      style: "body",
      color: theme.colors.accent,
    });

    // Store layout for buildSystemCards
    this.configX = panelX;
    this.configW = panelW;
    this.cardsTopY = rowY + 32;
    this.cardsBottomY = panelY + panelH - 76;

    // Generate initial game data and build cards
    this.regenerate();

    // ── Launch button ──
    const launchW = 220;
    new Button(this, {
      x: panelX + (panelW - launchW) / 2,
      y: panelY + panelH - 62,
      width: launchW,
      height: 44,
      label: "Launch",
      onClick: () => {
        gameStore.setState(this.currentState);
        this.scene.start("GameHUDScene");
      },
    });

    // Restart scene on resize so layout recalculates
    const onResize = () => {
      this.scene.restart();
    };
    this.scale.on("resize", onResize);
    this.events.once("shutdown", () => {
      this.scale.off("resize", onResize);
    });
  }

  private regenerate(): void {
    const result = createNewGame(
      this.seed,
      PRESET_NAMES[this.nameIndex],
      this.gameSize,
      this.galaxyShape,
    );
    this.currentState = result.state;
    this.startingOptions = result.startingSystemOptions;
    this.selectedSystemIndex = 0;
    this.buildSystemCards();
  }

  private updateSizeHighlight(): void {
    const sizeValues: GameSize[] = ["small", "medium", "large"];
    this.sizeButtons.forEach((btn, i) => {
      btn.setActive(sizeValues[i] === this.gameSize);
    });
  }

  private updateShapeHighlight(): void {
    const shapeValues: GalaxyShape[] = [
      "spiral",
      "elliptical",
      "ring",
      "irregular",
    ];
    this.shapeButtons.forEach((btn, i) => {
      btn.setActive(shapeValues[i] === this.galaxyShape);
    });
  }

  private buildSystemCards(): void {
    // Clean up previous card objects
    for (const obj of this.cardObjects) {
      obj.destroy();
    }
    this.cardObjects = [];
    this.systemCards = [];

    if (this.startingOptions.length === 0) return;

    const theme = getTheme();

    const gap = 16;
    const count = this.startingOptions.length;
    const availW = this.configW - theme.spacing.lg * 2;
    const cardW = Math.min(
      240,
      Math.floor((availW - gap * (count - 1)) / count),
    );
    const totalW = cardW * count + gap * (count - 1);
    const startX = this.configX + (this.configW - totalW) / 2;
    const cardsY = this.cardsTopY;
    const cardH = Math.max(140, this.cardsBottomY - cardsY);
    const planets = this.currentState.galaxy.planets;

    this.startingOptions.forEach((system, index) => {
      const cardX = startX + index * (cardW + gap);
      const systemPlanets = planets.filter((p) => p.systemId === system.id);

      // Card panel with title
      const panel = new Panel(this, {
        x: cardX,
        y: cardsY,
        width: cardW,
        height: cardH,
        title: system.name,
      });
      this.cardObjects.push(panel);
      this.systemCards.push(panel);

      // Planet count
      const infoX = cardX + theme.spacing.md;
      const infoY = cardsY + theme.panel.titleHeight + theme.spacing.md;

      const countLabel = new Label(this, {
        x: infoX,
        y: infoY,
        text: `Planets: ${systemPlanets.length}`,
        style: "body",
      });
      this.cardObjects.push(countLabel);

      // Planet type list
      let listY = infoY + 28;
      const lineH = 18;
      const availH = cardH - (listY - cardsY) - theme.spacing.sm;
      const maxPlanetsShown = Math.floor(availH / lineH);
      const planetsToShow = systemPlanets.slice(0, maxPlanetsShown);
      const nameMaxW = cardW - theme.spacing.md * 2 - theme.spacing.sm;
      for (const planet of planetsToShow) {
        // Truncate long names so they don't word-wrap
        let displayName = `${planet.name} (${planet.type})`;
        const approxCharW = 6.5; // caption font ~6.5px per char
        const maxChars = Math.floor(nameMaxW / approxCharW);
        if (displayName.length > maxChars) {
          displayName = displayName.slice(0, maxChars - 1) + "\u2026";
        }
        const pLabel = new Label(this, {
          x: infoX + theme.spacing.sm,
          y: listY,
          text: displayName,
          style: "caption",
        });
        this.cardObjects.push(pLabel);
        listY += lineH;
      }
      if (systemPlanets.length > maxPlanetsShown) {
        const moreLabel = new Label(this, {
          x: infoX + theme.spacing.sm,
          y: listY,
          text: `+${systemPlanets.length - maxPlanetsShown} more...`,
          style: "caption",
          color: theme.colors.textDim,
        });
        this.cardObjects.push(moreLabel);
      }

      // Transparent clickable overlay
      const hitRect = this.add
        .rectangle(
          cardX + cardW / 2,
          cardsY + cardH / 2,
          cardW,
          cardH,
          0x000000,
          0,
        )
        .setInteractive({ useHandCursor: true });

      hitRect.on("pointerover", () => {
        if (this.selectedSystemIndex !== index) {
          panel.setAlpha(0.9);
        }
      });
      hitRect.on("pointerout", () => {
        panel.setAlpha(1);
      });
      hitRect.on("pointerdown", () => {
        this.selectedSystemIndex = index;
        this.updateSelectionHighlight();
      });
      this.cardObjects.push(hitRect);
    });

    this.updateSelectionHighlight();
  }

  private updateSelectionHighlight(): void {
    // Use panel.setActive for selection highlight instead of manual graphics
    this.systemCards.forEach((panel, index) => {
      panel.setActive(index === this.selectedSystemIndex);
    });
  }
}

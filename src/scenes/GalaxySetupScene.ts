import Phaser from "phaser";
import {
  createStarfield,
  Panel,
  Button,
  Label,
  PortraitPanel,
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
  private portraitPanel!: PortraitPanel;
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
    this.selectedSystemIndex = 0;
    this.gameSize = "small";
    this.galaxyShape = "spiral";
    this.cardObjects = [];
    this.systemCards = [];
    this.sizeButtons = [];
    this.shapeButtons = [];

    // 1. Starfield background
    createStarfield(this);

    // Centering offset for maxContentWidth
    const contentLeft = Math.floor((L.gameWidth - L.maxContentWidth) / 2);

    // 2. Title with glow
    const titleLabel = new Label(this, {
      x: L.gameWidth / 2,
      y: 40,
      text: "NEW GALAXY",
      style: "heading",
      color: theme.colors.accent,
      glow: true,
    });
    titleLabel.setOrigin(0.5);
    titleLabel.setFontSize(32);

    // 3. System portrait panel (left side)
    const portraitX = contentLeft;
    const portraitY = 100;
    const portraitW = 260;
    const portraitH = 520;
    this.portraitPanel = new PortraitPanel(this, {
      x: portraitX,
      y: portraitY,
      width: portraitW,
      height: portraitH,
    });

    // 4. Config panel (right side, glass)
    const configGap = 20;
    const configX = portraitX + portraitW + configGap;
    const configW = L.maxContentWidth - portraitW - configGap;
    const configY = portraitY;
    const configH = portraitH;
    new Panel(this, {
      x: configX,
      y: configY,
      width: configW,
      height: configH,
    });

    // Content insets within config panel
    const innerX = configX + theme.spacing.lg;
    let rowY = configY + theme.spacing.lg;

    // Company name row
    new Label(this, {
      x: innerX,
      y: rowY,
      text: "Company:",
      style: "body",
    });

    this.nameLabel = new Label(this, {
      x: innerX + 130,
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

    rowY += 50;

    // Seed row
    new Label(this, {
      x: innerX,
      y: rowY,
      text: "Seed:",
      style: "body",
    });

    this.seedLabel = new Label(this, {
      x: innerX + 130,
      y: rowY,
      text: String(this.seed),
      style: "value",
      color: theme.colors.accent,
    });

    new Button(this, {
      x: innerX + 340,
      y: rowY - 4,
      width: 140,
      height: 36,
      label: "Randomize",
      onClick: () => {
        this.seed = Math.floor(Math.random() * 1000000);
        this.seedLabel.setText(String(this.seed));
        this.regenerate();
      },
    });

    rowY += 60;

    // Game Size row
    new Label(this, {
      x: innerX,
      y: rowY,
      text: "Size:",
      style: "body",
    });

    const sizes: { label: string; value: GameSize; desc: string }[] = [
      { label: "Small", value: "small", desc: "60 turns" },
      { label: "Medium", value: "medium", desc: "80 turns" },
      { label: "Large", value: "large", desc: "100 turns" },
    ];
    const sizeBtnW = 90;
    const sizeBtnGap = 10;
    let sizeBtnX = innerX + 130;
    for (const sizeOpt of sizes) {
      const btn = new Button(this, {
        x: sizeBtnX,
        y: rowY - 4,
        width: sizeBtnW,
        height: 36,
        label: `${sizeOpt.label}`,
        onClick: () => {
          this.gameSize = sizeOpt.value;
          this.updateSizeHighlight();
          this.regenerate();
        },
      });
      this.sizeButtons.push(btn);
      sizeBtnX += sizeBtnW + sizeBtnGap;
    }
    this.updateSizeHighlight();

    rowY += 50;

    // Galaxy Shape row
    new Label(this, {
      x: innerX,
      y: rowY,
      text: "Shape:",
      style: "body",
    });

    const shapes: { label: string; value: GalaxyShape }[] = [
      { label: "Spiral", value: "spiral" },
      { label: "Elliptical", value: "elliptical" },
      { label: "Ring", value: "ring" },
      { label: "Irregular", value: "irregular" },
    ];
    const shapeBtnW = 90;
    const shapeBtnGap = 8;
    let shapeBtnX = innerX + 130;
    for (const shapeOpt of shapes) {
      const btn = new Button(this, {
        x: shapeBtnX,
        y: rowY - 4,
        width: shapeBtnW,
        height: 36,
        label: shapeOpt.label,
        onClick: () => {
          this.galaxyShape = shapeOpt.value;
          this.updateShapeHighlight();
          this.regenerate();
        },
      });
      this.shapeButtons.push(btn);
      shapeBtnX += shapeBtnW + shapeBtnGap;
    }
    this.updateShapeHighlight();

    rowY += 60;

    // Section header
    new Label(this, {
      x: innerX,
      y: rowY,
      text: "Select Starting System:",
      style: "body",
    });

    // Store layout for buildSystemCards
    this.configX = configX;
    this.configW = configW;
    this.cardsTopY = rowY + 30;
    this.cardsBottomY = configY + configH - 90;

    // Generate initial game data and build cards
    this.regenerate();

    // Launch button at bottom of config panel
    const launchBtnW = 220;
    const launchBtnX = configX + (configW - launchBtnW) / 2;
    const launchBtnY = configY + configH - 70;
    new Button(this, {
      x: launchBtnX,
      y: launchBtnY,
      width: launchBtnW,
      height: 48,
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
    this.updatePortraitPanel();
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

    const cardW = 200;
    const gap = 16;
    const count = this.startingOptions.length;
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
        this.updatePortraitPanel();
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

  private updatePortraitPanel(): void {
    if (this.startingOptions.length === 0) return;
    const system = this.startingOptions[this.selectedSystemIndex];
    const planetCount = this.currentState.galaxy.planets.filter(
      (p) => p.systemId === system.id,
    ).length;
    this.portraitPanel.showSystem(system, planetCount);
  }
}

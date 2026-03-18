import Phaser from "phaser";
import { createStarfield } from "../ui/Starfield.ts";
import { Panel } from "../ui/Panel.ts";
import { Button } from "../ui/Button.ts";
import { Label } from "../ui/Label.ts";
import { PortraitPanel } from "../ui/PortraitPanel.ts";
import { getTheme } from "../ui/Theme.ts";
import { GAME_WIDTH, MAX_CONTENT_WIDTH } from "../ui/Layout.ts";
import { gameStore } from "../data/GameStore.ts";
import { createNewGame } from "../game/NewGameSetup.ts";
import type { GameState, StarSystem } from "../data/types.ts";

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
  private seedLabel!: Label;
  private nameLabel!: Label;
  private cardObjects: Phaser.GameObjects.GameObject[] = [];
  private systemCards: Panel[] = [];
  private startingOptions: StarSystem[] = [];
  private currentState!: GameState;
  private portraitPanel!: PortraitPanel;

  constructor() {
    super({ key: "GalaxySetupScene" });
  }

  create(): void {
    const theme = getTheme();
    this.cameras.main.setBackgroundColor(theme.colors.background);

    this.seed = Math.floor(Math.random() * 1000000);
    this.nameIndex = 0;
    this.selectedSystemIndex = 0;
    this.cardObjects = [];
    this.systemCards = [];

    // 1. Starfield background
    createStarfield(this);

    // Centering offset for MAX_CONTENT_WIDTH
    const contentLeft = Math.floor((GAME_WIDTH - MAX_CONTENT_WIDTH) / 2);

    // 2. Title with glow
    const titleLabel = new Label(this, {
      x: GAME_WIDTH / 2,
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
    const configW = MAX_CONTENT_WIDTH - portraitW - configGap;
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

    // Section header
    new Label(this, {
      x: innerX,
      y: rowY,
      text: "Select Starting System:",
      style: "body",
    });

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
  }

  private regenerate(): void {
    const result = createNewGame(this.seed, PRESET_NAMES[this.nameIndex]);
    this.currentState = result.state;
    this.startingOptions = result.startingSystemOptions;
    this.selectedSystemIndex = 0;
    this.buildSystemCards();
    this.updatePortraitPanel();
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
    const contentLeft = Math.floor((GAME_WIDTH - MAX_CONTENT_WIDTH) / 2);
    const portraitW = 260;
    const configGap = 20;
    const configX = contentLeft + portraitW + configGap;
    const configW = MAX_CONTENT_WIDTH - portraitW - configGap;

    const cardW = 200;
    const cardH = 200;
    const gap = 16;
    const count = this.startingOptions.length;
    const totalW = cardW * count + gap * (count - 1);
    const startX = configX + (configW - totalW) / 2;
    const cardsY = 280;
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
      for (const planet of systemPlanets) {
        const pLabel = new Label(this, {
          x: infoX + theme.spacing.sm,
          y: listY,
          text: `${planet.name} (${planet.type})`,
          style: "caption",
        });
        this.cardObjects.push(pLabel);
        listY += 20;
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

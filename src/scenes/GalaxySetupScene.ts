import Phaser from "phaser";
import { Panel } from "../ui/Panel.ts";
import { Button } from "../ui/Button.ts";
import { Label } from "../ui/Label.ts";
import { getTheme } from "../ui/Theme.ts";
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
  private selectionGraphics!: Phaser.GameObjects.Graphics;
  private startingOptions: StarSystem[] = [];
  private currentState!: GameState;

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

    // Background panel
    const panelX = 190;
    const panelY = 40;
    const panelW = 900;
    const panelH = 640;
    new Panel(this, {
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
      title: "New Galaxy",
    });

    const contentX = panelX + theme.spacing.lg;
    let currentY = panelY + theme.panel.titleHeight + theme.spacing.lg;

    // Company name row
    new Label(this, {
      x: contentX,
      y: currentY,
      text: "Company:",
      style: "body",
    });

    this.nameLabel = new Label(this, {
      x: contentX + 130,
      y: currentY,
      text: PRESET_NAMES[0],
      style: "value",
      color: theme.colors.accent,
    });
    this.nameLabel.setInteractive({ useHandCursor: true });
    this.nameLabel.on("pointerdown", () => {
      this.nameIndex = (this.nameIndex + 1) % PRESET_NAMES.length;
      this.nameLabel.setText(PRESET_NAMES[this.nameIndex]);
    });

    currentY += 50;

    // Seed row
    new Label(this, {
      x: contentX,
      y: currentY,
      text: "Seed:",
      style: "body",
    });

    this.seedLabel = new Label(this, {
      x: contentX + 130,
      y: currentY,
      text: String(this.seed),
      style: "value",
      color: theme.colors.accent,
    });

    new Button(this, {
      x: contentX + 340,
      y: currentY - 4,
      width: 140,
      height: 36,
      label: "Randomize",
      onClick: () => {
        this.seed = Math.floor(Math.random() * 1000000);
        this.seedLabel.setText(String(this.seed));
        this.regenerate();
      },
    });

    currentY += 60;

    // Starting system section header
    new Label(this, {
      x: contentX,
      y: currentY,
      text: "Select Starting System:",
      style: "body",
    });

    // Selection highlight graphics (rendered above cards)
    this.selectionGraphics = this.add.graphics();

    // Generate initial game data and build system cards
    this.regenerate();

    // Launch button
    const launchBtnW = 200;
    new Button(this, {
      x: 640 - launchBtnW / 2,
      y: panelY + panelH - 70,
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
  }

  private buildSystemCards(): void {
    // Clean up previous card objects
    for (const obj of this.cardObjects) {
      obj.destroy();
    }
    this.cardObjects = [];

    if (this.startingOptions.length === 0) return;

    const theme = getTheme();
    const cardW = 260;
    const cardH = 260;
    const gap = 20;
    const count = this.startingOptions.length;
    const totalW = cardW * count + gap * (count - 1);
    const startX = (1280 - totalW) / 2;
    const cardsY = 280;
    const planets = this.currentState.galaxy.planets;

    this.startingOptions.forEach((system, index) => {
      const cardX = startX + index * (cardW + gap);
      const systemPlanets = planets.filter((p) => p.systemId === system.id);

      // Card background panel
      const panel = new Panel(this, {
        x: cardX,
        y: cardsY,
        width: cardW,
        height: cardH,
        title: system.name,
      });
      this.cardObjects.push(panel);

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
        this.drawSelectionHighlight();
      });
      this.cardObjects.push(hitRect);
    });

    this.drawSelectionHighlight();
  }

  private drawSelectionHighlight(): void {
    if (this.startingOptions.length === 0) return;

    const theme = getTheme();
    const cardW = 260;
    const cardH = 260;
    const gap = 20;
    const count = this.startingOptions.length;
    const totalW = cardW * count + gap * (count - 1);
    const startX = (1280 - totalW) / 2;
    const cardsY = 280;

    this.selectionGraphics.clear();
    this.selectionGraphics.lineStyle(3, theme.colors.accent, 1);
    const selX = startX + this.selectedSystemIndex * (cardW + gap);
    this.selectionGraphics.strokeRect(
      selX - 2,
      cardsY - 2,
      cardW + 4,
      cardH + 4,
    );
  }
}

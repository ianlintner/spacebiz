import Phaser from "phaser";
import { Button } from "../ui/Button.ts";
import { Label } from "../ui/Label.ts";
import { getTheme } from "../ui/Theme.ts";
import { gameStore } from "../data/GameStore.ts";

function formatCash(amount: number): string {
  return "\u00A7" + amount.toLocaleString();
}

export class GameHUDScene extends Phaser.Scene {
  private companyLabel!: Label;
  private turnLabel!: Label;
  private cashLabel!: Label;
  private phaseLabel!: Label;
  private endTurnButton!: Button;
  private activeContentScene = "GalaxyMapScene";

  private stateListener = (_data: unknown) => {
    this.updateHUD();
  };

  constructor() {
    super({ key: "GameHUDScene" });
  }

  create(): void {
    const theme = getTheme();
    const state = gameStore.getState();

    const topBarHeight = 50;

    // Top bar background
    this.add
      .rectangle(640, topBarHeight / 2, 1280, topBarHeight, theme.colors.headerBg)
      .setOrigin(0.5);

    // Left: Company name
    this.companyLabel = new Label(this, {
      x: theme.spacing.md,
      y: (topBarHeight - theme.fonts.body.size) / 2,
      text: state.companyName,
      style: "body",
    });

    // Center: Turn display
    const quarter = ((state.turn - 1) % 4) + 1;
    const year = Math.ceil(state.turn / 4);
    this.turnLabel = new Label(this, {
      x: 640,
      y: (topBarHeight - theme.fonts.value.size) / 2,
      text: `Q${quarter} Year ${year}`,
      style: "value",
    });
    this.turnLabel.setOrigin(0.5, 0);

    // Right: Cash display (green if positive, red if negative)
    this.cashLabel = new Label(this, {
      x: 1280 - theme.spacing.md,
      y: (topBarHeight - theme.fonts.value.size) / 2,
      text: formatCash(state.cash),
      style: "value",
      color: state.cash >= 0 ? theme.colors.profit : theme.colors.loss,
    });
    this.cashLabel.setOrigin(1, 0);

    // Navigation buttons (left side, vertical column below top bar)
    const navBtnWidth = 100;
    const navBtnHeight = 36;
    const navX = theme.spacing.sm;
    let navY = topBarHeight + theme.spacing.sm;
    const navSpacing = navBtnHeight + theme.spacing.xs;

    const navItems = [
      { label: "Map", scene: "GalaxyMapScene" },
      { label: "Fleet", scene: "FleetScene" },
      { label: "Routes", scene: "RoutesScene" },
      { label: "Finance", scene: "FinanceScene" },
      { label: "Market", scene: "MarketScene" },
    ];

    for (const item of navItems) {
      new Button(this, {
        x: navX,
        y: navY,
        width: navBtnWidth,
        height: navBtnHeight,
        label: item.label,
        onClick: () => {
          this.switchContentScene(item.scene);
        },
      });
      navY += navSpacing;
    }

    // Bottom area
    const bottomY = 660;

    // End Turn button (only visible during planning phase)
    const endTurnW = 160;
    this.endTurnButton = new Button(this, {
      x: 640 - endTurnW / 2,
      y: bottomY,
      width: endTurnW,
      height: 40,
      label: "End Turn",
      onClick: () => {
        this.switchContentScene("SimPlaybackScene");
      },
    });
    this.endTurnButton.setVisible(state.phase === "planning");

    // Phase indicator
    this.phaseLabel = new Label(this, {
      x: 640,
      y: bottomY + 45,
      text: `Phase: ${state.phase}`,
      style: "caption",
    });
    this.phaseLabel.setOrigin(0.5, 0);

    // Subscribe to gameStore state changes
    gameStore.on("stateChanged", this.stateListener);

    // Clean up listener when scene shuts down
    this.events.once("shutdown", () => {
      gameStore.off("stateChanged", this.stateListener);
    });

    // Launch default content scene and ensure HUD renders on top
    this.scene.launch("GalaxyMapScene");
    this.activeContentScene = "GalaxyMapScene";
    this.scene.bringToTop();
  }

  private updateHUD(): void {
    const theme = getTheme();
    const state = gameStore.getState();

    this.companyLabel.setText(state.companyName);

    const quarter = ((state.turn - 1) % 4) + 1;
    const year = Math.ceil(state.turn / 4);
    this.turnLabel.setText(`Q${quarter} Year ${year}`);

    this.cashLabel.setText(formatCash(state.cash));
    this.cashLabel.setLabelColor(
      state.cash >= 0 ? theme.colors.profit : theme.colors.loss,
    );

    this.phaseLabel.setText(`Phase: ${state.phase}`);
    this.endTurnButton.setVisible(state.phase === "planning");
  }

  private switchContentScene(sceneName: string): void {
    if (sceneName === this.activeContentScene) return;
    this.scene.stop(this.activeContentScene);
    this.scene.launch(sceneName);
    this.activeContentScene = sceneName;
    this.scene.bringToTop();
  }
}

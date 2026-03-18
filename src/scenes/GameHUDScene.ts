import Phaser from "phaser";
import { Button } from "../ui/Button.ts";
import { Label } from "../ui/Label.ts";
import { getTheme } from "../ui/Theme.ts";
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  HUD_TOP_BAR_HEIGHT,
  HUD_BOTTOM_BAR_HEIGHT,
} from "../ui/Layout.ts";
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
  private previousCash = 0;
  private navIndicators = new Map<string, Phaser.GameObjects.Rectangle>();

  private stateListener = (_data: unknown) => {
    this.updateHUD();
  };

  constructor() {
    super({ key: "GameHUDScene" });
  }

  create(): void {
    const theme = getTheme();
    const state = gameStore.getState();
    this.previousCash = state.cash;

    // ── Top Bar ──────────────────────────────────────────────
    this.add
      .nineslice(
        0,
        0,
        "hud-bar-bg",
        undefined,
        GAME_WIDTH,
        HUD_TOP_BAR_HEIGHT,
        10,
        10,
        10,
        10,
      )
      .setOrigin(0, 0)
      .setAlpha(0.92);

    // Company name (left-aligned)
    this.companyLabel = new Label(this, {
      x: 20,
      y: HUD_TOP_BAR_HEIGHT / 2,
      text: state.companyName,
      style: "body",
    });
    this.companyLabel.setOrigin(0, 0.5);

    // Turn display (centered)
    const quarter = ((state.turn - 1) % 4) + 1;
    const year = Math.ceil(state.turn / 4);
    this.turnLabel = new Label(this, {
      x: GAME_WIDTH / 2,
      y: HUD_TOP_BAR_HEIGHT / 2,
      text: `Q${quarter} Year ${year}`,
      style: "value",
    });
    this.turnLabel.setOrigin(0.5, 0.5);

    // Cash display (right-aligned, green/red conditional)
    this.cashLabel = new Label(this, {
      x: GAME_WIDTH - 20,
      y: HUD_TOP_BAR_HEIGHT / 2,
      text: formatCash(state.cash),
      style: "value",
      color: state.cash >= 0 ? theme.colors.profit : theme.colors.loss,
    });
    this.cashLabel.setOrigin(1, 0.5);

    // ── Navigation Buttons (horizontal row below top bar) ───
    const navItems = [
      { label: "Map", scene: "GalaxyMapScene" },
      { label: "Fleet", scene: "FleetScene" },
      { label: "Routes", scene: "RoutesScene" },
      { label: "Finance", scene: "FinanceScene" },
      { label: "Market", scene: "MarketScene" },
    ];

    const navBtnWidth = 100;
    const navBtnHeight = 32;
    const navSpacing = 8;
    const totalNavWidth =
      navItems.length * navBtnWidth + (navItems.length - 1) * navSpacing;
    const navStartX = (GAME_WIDTH - totalNavWidth) / 2;
    const navY = HUD_TOP_BAR_HEIGHT + 4;

    for (let i = 0; i < navItems.length; i++) {
      const item = navItems[i];
      const btnX = navStartX + i * (navBtnWidth + navSpacing);

      new Button(this, {
        x: btnX,
        y: navY,
        width: navBtnWidth,
        height: navBtnHeight,
        label: item.label,
        onClick: () => {
          this.switchContentScene(item.scene);
        },
      });

      // Active indicator: accent-colored bar (3px tall) below button
      const indicator = this.add
        .rectangle(
          btnX + navBtnWidth / 2,
          navY + navBtnHeight + 2,
          navBtnWidth,
          3,
          theme.colors.accent,
        )
        .setOrigin(0.5, 0);
      indicator.setVisible(item.scene === this.activeContentScene);
      this.navIndicators.set(item.scene, indicator);
    }

    // ── Bottom Bar ───────────────────────────────────────────
    const bottomBarY = GAME_HEIGHT - HUD_BOTTOM_BAR_HEIGHT;

    this.add
      .nineslice(
        0,
        bottomBarY,
        "hud-bar-bg",
        undefined,
        GAME_WIDTH,
        HUD_BOTTOM_BAR_HEIGHT,
        10,
        10,
        10,
        10,
      )
      .setOrigin(0, 0)
      .setAlpha(0.88);

    // Phase indicator (left side of bottom bar)
    this.phaseLabel = new Label(this, {
      x: 20,
      y: GAME_HEIGHT - HUD_BOTTOM_BAR_HEIGHT / 2,
      text: `Phase: ${state.phase}`,
      style: "caption",
    });
    this.phaseLabel.setOrigin(0, 0.5);

    // End Turn button (centered in bottom bar)
    const endTurnW = 160;
    this.endTurnButton = new Button(this, {
      x: GAME_WIDTH / 2 - endTurnW / 2,
      y: bottomBarY + 6,
      width: endTurnW,
      height: 40,
      label: "End Turn",
      onClick: () => {
        this.switchContentScene("SimPlaybackScene");
      },
    });
    this.endTurnButton.setVisible(state.phase === "planning");

    // ── State Subscription ───────────────────────────────────
    gameStore.on("stateChanged", this.stateListener);

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

    // Cash display with flash effect on change
    const newCash = state.cash;
    this.cashLabel.setText(formatCash(newCash));
    this.cashLabel.setLabelColor(
      newCash >= 0 ? theme.colors.profit : theme.colors.loss,
    );

    if (newCash !== this.previousCash) {
      const flashTint =
        newCash > this.previousCash ? theme.colors.profit : theme.colors.loss;
      this.cashLabel.setTint(flashTint);
      this.tweens.add({
        targets: this.cashLabel,
        alpha: { from: 1, to: 0.5 },
        duration: 150,
        yoyo: true,
        onComplete: () => {
          this.cashLabel.clearTint();
        },
      });
      this.previousCash = newCash;
    }

    this.phaseLabel.setText(`Phase: ${state.phase}`);
    this.endTurnButton.setVisible(state.phase === "planning");
  }

  /**
   * Central method for all content scene transitions. Content scenes
   * must use this instead of calling scene.start() directly.
   * Access from any scene: (this.scene.get("GameHUDScene") as GameHUDScene).switchContentScene(name)
   */
  switchContentScene(sceneName: string, data?: object): void {
    // Stop overlay scenes that might be stacked on top
    const overlayScenes = ["PlanetDetailScene"];
    for (const key of overlayScenes) {
      if (this.scene.isActive(key)) {
        this.scene.stop(key);
      }
    }

    if (sceneName === this.activeContentScene) return;

    // Stop current content scene (check it's actually running)
    if (this.scene.isActive(this.activeContentScene) || this.scene.isPaused(this.activeContentScene)) {
      this.scene.stop(this.activeContentScene);
    }

    // Launch new content scene
    this.scene.launch(sceneName, data);

    // Update active indicators
    for (const [scene, indicator] of this.navIndicators) {
      indicator.setVisible(scene === sceneName);
    }

    this.activeContentScene = sceneName;
    this.scene.bringToTop();
  }
}

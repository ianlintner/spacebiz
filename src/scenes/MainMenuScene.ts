import Phaser from "phaser";
import { Label } from "../ui/Label.ts";
import { Button } from "../ui/Button.ts";
import { getTheme } from "../ui/Theme.ts";
import { gameStore } from "../data/GameStore.ts";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainMenuScene" });
  }

  create(): void {
    const theme = getTheme();
    this.cameras.main.setBackgroundColor(theme.colors.background);

    const centerX = 640;

    // Game title — large heading
    const title = new Label(this, {
      x: centerX,
      y: 230,
      text: "STAR FREIGHT TYCOON",
      style: "heading",
      color: theme.colors.accent,
    });
    title.setOrigin(0.5);
    title.setFontSize(36);

    // Subtitle
    const subtitle = new Label(this, {
      x: centerX,
      y: 280,
      text: "A Space Business Simulation",
      style: "caption",
    });
    subtitle.setOrigin(0.5);

    // Button dimensions
    const btnWidth = 220;
    const btnHeight = 48;

    // New Game button
    new Button(this, {
      x: centerX - btnWidth / 2,
      y: 370,
      width: btnWidth,
      height: btnHeight,
      label: "New Game",
      onClick: () => {
        this.scene.start("GalaxySetupScene");
      },
    });

    // Continue button (disabled when no save exists)
    const hasSave = localStorage.getItem("sft_save") !== null;
    new Button(this, {
      x: centerX - btnWidth / 2,
      y: 435,
      width: btnWidth,
      height: btnHeight,
      label: "Continue",
      disabled: !hasSave,
      onClick: () => {
        const saveData = localStorage.getItem("sft_save");
        if (saveData) {
          gameStore.deserialize(saveData);
          this.scene.start("GameHUDScene");
        }
      },
    });
  }
}

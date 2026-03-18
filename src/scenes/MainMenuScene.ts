import Phaser from "phaser";
import { createStarfield } from "../ui/Starfield.ts";
import { Panel } from "../ui/Panel.ts";
import { Label } from "../ui/Label.ts";
import { Button } from "../ui/Button.ts";
import { getTheme } from "../ui/Theme.ts";
import { GAME_WIDTH, GAME_HEIGHT } from "../ui/Layout.ts";
import { hasSaveGame, loadGameIntoStore } from "../game/SaveManager.ts";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainMenuScene" });
  }

  create(): void {
    const theme = getTheme();
    this.cameras.main.setBackgroundColor(theme.colors.background);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // 1. Starfield background
    createStarfield(this);

    // 2. Radial gradient — subtle lighter circle for depth
    this.add.circle(cx, cy, 400, 0x111140, 0.15);

    // 3. Title
    const title = new Label(this, {
      x: cx,
      y: 200,
      text: "STAR FREIGHT TYCOON",
      style: "heading",
      color: theme.colors.accent,
      glow: true,
    });
    title.setOrigin(0.5);
    title.setFontSize(42);

    // 4. Subtitle
    const subtitle = new Label(this, {
      x: cx,
      y: 255,
      text: "A Space Business Simulation",
      style: "caption",
      color: theme.colors.textDim,
    });
    subtitle.setOrigin(0.5);

    // 5. Glass panel behind buttons
    const panelW = 320;
    const panelH = 220;
    const panelX = cx - panelW / 2;
    const panelY = 310;
    new Panel(this, {
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
    });

    // 6. Buttons inside the glass panel
    const btnWidth = 280;
    const btnHeight = 48;
    const btnX = cx - btnWidth / 2;
    const firstBtnY = panelY + (panelH - (btnHeight * 2 + 65)) / 2;

    new Button(this, {
      x: btnX,
      y: firstBtnY,
      width: btnWidth,
      height: btnHeight,
      label: "New Game",
      onClick: () => {
        this.scene.start("GalaxySetupScene");
      },
    });

    // 7. Continue button — disabled when no save exists
    const canContinue = hasSaveGame();
    new Button(this, {
      x: btnX,
      y: firstBtnY + 65,
      width: btnWidth,
      height: btnHeight,
      label: "Continue",
      disabled: !canContinue,
      onClick: () => {
        if (loadGameIntoStore()) {
          this.scene.start("GameHUDScene");
        }
      },
    });
  }
}

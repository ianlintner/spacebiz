import Phaser from "phaser";
import { addFloatTween, addPulseTween } from "../ui/AmbientFX.ts";
import { Panel } from "../ui/Panel.ts";
import { Label } from "../ui/Label.ts";
import { Button } from "../ui/Button.ts";
import { getTheme } from "../ui/Theme.ts";
import { GAME_WIDTH, GAME_HEIGHT } from "../ui/Layout.ts";
import { hasSaveGame, loadGameIntoStore } from "../game/SaveManager.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";

const HERO_KEYS = ["hero-freight", "hero-passenger"] as const;

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainMenuScene" });
  }

  create(): void {
    const theme = getTheme();
    this.cameras.main.setBackgroundColor(theme.colors.background);
    const audio = getAudioDirector();
    audio.setMusicState("menu");

    const cx = GAME_WIDTH / 2;
    const heroKey = Phaser.Utils.Array.GetRandom([...HERO_KEYS]);

    const hero = this.add
      .image(cx, GAME_HEIGHT / 2 - 18, heroKey)
      .setDisplaySize(GAME_WIDTH * 1.08, GAME_HEIGHT * 1.08)
      .setAlpha(0.98);
    this.tweens.add({
      targets: hero,
      scaleX: 1.1,
      scaleY: 1.1,
      x: cx + 10,
      y: GAME_HEIGHT / 2 - 28,
      duration: 14000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Top and bottom readability scrims so the art stays visible while UI remains legible.
    this.add.rectangle(0, 0, GAME_WIDTH, 190, 0x040813, 0.52).setOrigin(0, 0);
    this.add
      .rectangle(0, GAME_HEIGHT - 240, GAME_WIDTH, 240, 0x040813, 0.74)
      .setOrigin(0, 0);

    const depthCircle = this.add.circle(cx, 150, 320, 0x111140, 0.14);
    addPulseTween(this, depthCircle, {
      minAlpha: 0.08,
      maxAlpha: 0.2,
      duration: 5200,
    });

    // Top title card
    const titlePanelW = 540;
    const titlePanelH = 112;
    const titlePanelX = cx - titlePanelW / 2;
    const titlePanelY = 32;
    new Panel(this, {
      x: titlePanelX,
      y: titlePanelY,
      width: titlePanelW,
      height: titlePanelH,
      showGlow: true,
    });

    const title = new Label(this, {
      x: cx,
      y: titlePanelY + 34,
      text: "STAR FREIGHT TYCOON",
      style: "heading",
      color: theme.colors.accent,
      glow: true,
    });
    title.setOrigin(0.5);
    title.setFontSize(42);
    addFloatTween(this, title, { dx: 0, dy: -4, duration: 4000, delay: 800 });

    const subtitle = new Label(this, {
      x: cx,
      y: titlePanelY + 76,
      text:
        heroKey === "hero-passenger"
          ? "Build a luxury interstellar passenger empire"
          : "Run the freight lines that keep the galaxy moving",
      style: "caption",
      color: theme.colors.textDim,
    });
    subtitle.setOrigin(0.5);

    // Bottom command dock keeps the center of the art clear.
    const panelW = 760;
    const panelH = 168;
    const panelX = cx - panelW / 2;
    const panelY = GAME_HEIGHT - panelH - 26;
    new Panel(this, {
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
      showGlow: true,
    });

    const deckLabel = new Label(this, {
      x: panelX + 28,
      y: panelY + 24,
      text: "Command Deck",
      style: "caption",
      color: theme.colors.accent,
    });
    deckLabel.setOrigin(0, 0);

    const promptLabel = new Label(this, {
      x: panelX + 28,
      y: panelY + 52,
      text: "Choose your next jump.",
      style: "body",
      color: theme.colors.text,
    });
    promptLabel.setOrigin(0, 0);

    const statusLabel = new Label(this, {
      x: panelX + 28,
      y: panelY + 86,
      text: hasSaveGame()
        ? "Save detected — continue your company from orbit."
        : "No save on record — start a fresh company charter.",
      style: "caption",
      color: theme.colors.textDim,
      maxWidth: 340,
    });
    statusLabel.setOrigin(0, 0);

    const btnWidth = 220;
    const btnHeight = 52;
    const btnGap = 18;
    const btnY = panelY + panelH - btnHeight - 26;
    const btnStartX = panelX + panelW - btnWidth * 2 - btnGap - 28;

    new Button(this, {
      x: btnStartX,
      y: btnY,
      width: btnWidth,
      height: btnHeight,
      label: "New Game",
      onClick: () => {
        this.scene.start("GalaxySetupScene");
      },
    });

    const canContinue = hasSaveGame();
    new Button(this, {
      x: btnStartX + btnWidth + btnGap,
      y: btnY,
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

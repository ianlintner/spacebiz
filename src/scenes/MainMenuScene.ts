import Phaser from "phaser";
import { addFloatTween, addPulseTween } from "../ui/AmbientFX.ts";
import { Panel } from "../ui/Panel.ts";
import { Label } from "../ui/Label.ts";
import { Button } from "../ui/Button.ts";
import { getTheme } from "../ui/Theme.ts";
import { GAME_WIDTH, GAME_HEIGHT } from "../ui/Layout.ts";
import { hasSaveGame, loadGameIntoStore } from "../game/SaveManager.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";

type HeroConfig = {
  key: "hero-freight" | "hero-passenger";
  strap: string;
  subtitle: string;
  vignette: string;
  focusX: number;
  focusY: number;
  anchorX: number;
  anchorY: number;
  driftX: number;
  driftY: number;
  zoom: number;
};

const HERO_CONFIGS: readonly HeroConfig[] = [
  {
    key: "hero-freight",
    strap: "Heavy Cargo Division",
    subtitle: "Run the freight lines that keep the galaxy moving",
    vignette: "Containers, cranes, and cold profit under a hard vacuum sky.",
    focusX: 0.56,
    focusY: 0.48,
    anchorX: 0.54,
    anchorY: 0.47,
    driftX: 16,
    driftY: -10,
    zoom: 1.14,
  },
  {
    key: "hero-passenger",
    strap: "Passenger & Luxury Lanes",
    subtitle: "Build a luxury interstellar passenger empire",
    vignette: "High-orbit terminals, moonlit skylines, and premium routes.",
    focusX: 0.58,
    focusY: 0.46,
    anchorX: 0.56,
    anchorY: 0.45,
    driftX: -14,
    driftY: -8,
    zoom: 1.13,
  },
];

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
    const canContinue = hasSaveGame();
    const heroConfig = Phaser.Utils.Array.GetRandom([...HERO_CONFIGS]);
    const heroTexture = this.textures.get(heroConfig.key).getSourceImage() as {
      width: number;
      height: number;
    };
    const coverScale =
      Math.max(
        (GAME_WIDTH + 120) / heroTexture.width,
        (GAME_HEIGHT + 110) / heroTexture.height,
      ) * heroConfig.zoom;

    const hero = this.add
      .image(
        GAME_WIDTH * heroConfig.anchorX,
        GAME_HEIGHT * heroConfig.anchorY,
        heroConfig.key,
      )
      .setOrigin(heroConfig.focusX, heroConfig.focusY)
      .setScale(coverScale)
      .setAlpha(0.98);
    this.tweens.add({
      targets: hero,
      scaleX: coverScale * 1.035,
      scaleY: coverScale * 1.035,
      x: GAME_WIDTH * heroConfig.anchorX + heroConfig.driftX,
      y: GAME_HEIGHT * heroConfig.anchorY + heroConfig.driftY,
      duration: 16000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const heroSheen = this.add
      .rectangle(
        -220,
        GAME_HEIGHT * 0.42,
        220,
        GAME_HEIGHT * 1.2,
        0x9ee7ff,
        0.08,
      )
      .setAngle(16)
      .setBlendMode(Phaser.BlendModes.SCREEN);
    this.tweens.add({
      targets: heroSheen,
      x: GAME_WIDTH + 220,
      duration: 9000,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: 1200,
    });

    // Top and bottom readability scrims so the art stays visible while UI remains legible.
    this.add.rectangle(0, 0, GAME_WIDTH, 220, 0x040813, 0.54).setOrigin(0, 0);
    this.add
      .rectangle(0, GAME_HEIGHT - 270, GAME_WIDTH, 270, 0x040813, 0.78)
      .setOrigin(0, 0);
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x02050d, 0.16)
      .setOrigin(0, 0);

    const depthCircle = this.add.circle(cx, 150, 320, 0x111140, 0.14);
    addPulseTween(this, depthCircle, {
      minAlpha: 0.08,
      maxAlpha: 0.2,
      duration: 5200,
    });

    // Top title card
    const titlePanelW = 620;
    const titlePanelH = 132;
    const titlePanelX = cx - titlePanelW / 2;
    const titlePanelY = 24;
    new Panel(this, {
      x: titlePanelX,
      y: titlePanelY,
      width: titlePanelW,
      height: titlePanelH,
      showGlow: true,
    });

    const strap = new Label(this, {
      x: cx,
      y: titlePanelY + 18,
      text: heroConfig.strap,
      style: "caption",
      color: theme.colors.accent,
    });
    strap.setOrigin(0.5, 0);

    const title = new Label(this, {
      x: cx,
      y: titlePanelY + 52,
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
      y: titlePanelY + 98,
      text: heroConfig.subtitle,
      style: "caption",
      color: theme.colors.textDim,
    });
    subtitle.setOrigin(0.5);

    // Bottom command dock keeps the center of the art clear.
    const panelW = 760;
    const panelH = 182;
    const panelX = cx - panelW / 2;
    const panelY = GAME_HEIGHT - panelH - 22;
    new Panel(this, {
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
      showGlow: true,
    });

    const deckLabel = new Label(this, {
      x: panelX + 28,
      y: panelY + 22,
      text: "Command Deck",
      style: "caption",
      color: theme.colors.accent,
    });
    deckLabel.setOrigin(0, 0);

    const promptLabel = new Label(this, {
      x: panelX + 28,
      y: panelY + 48,
      text: "Choose your next jump.",
      style: "body",
      color: theme.colors.text,
    });
    promptLabel.setOrigin(0, 0);

    const statusLabel = new Label(this, {
      x: panelX + 28,
      y: panelY + 80,
      text: canContinue
        ? "Save detected — continue your company from orbit."
        : "No save on record — start a fresh company charter.",
      style: "caption",
      color: theme.colors.textDim,
      maxWidth: 340,
    });
    statusLabel.setOrigin(0, 0);

    const vignetteLabel = new Label(this, {
      x: panelX + 28,
      y: panelY + 112,
      text: heroConfig.vignette,
      style: "caption",
      color: theme.colors.textDim,
      maxWidth: 360,
    });
    vignetteLabel.setOrigin(0, 0);

    const btnWidth = 220;
    const btnHeight = 52;
    const btnGap = 18;
    const btnY = panelY + panelH - btnHeight - 28;
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

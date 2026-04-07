import Phaser from "phaser";
import {
  addFloatTween,
  addPulseTween,
  Panel,
  Label,
  Button,
  getTheme,
  getLayout,
} from "../ui/index.ts";
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
    const L = getLayout();
    const theme = getTheme();
    this.cameras.main.setBackgroundColor(theme.colors.background);
    const audio = getAudioDirector();
    audio.setMusicState("menu");

    const cx = L.gameWidth / 2;
    const canContinue = hasSaveGame();
    const heroConfig = Phaser.Utils.Array.GetRandom([...HERO_CONFIGS]);
    const heroTexture = this.textures.get(heroConfig.key).getSourceImage() as {
      width: number;
      height: number;
    };
    const coverScale =
      Math.max(
        (L.gameWidth + 120) / heroTexture.width,
        (L.gameHeight + 110) / heroTexture.height,
      ) * heroConfig.zoom;

    const hero = this.add
      .image(
        L.gameWidth * heroConfig.anchorX,
        L.gameHeight * heroConfig.anchorY,
        heroConfig.key,
      )
      .setOrigin(heroConfig.focusX, heroConfig.focusY)
      .setScale(coverScale)
      .setAlpha(0.98);
    this.tweens.add({
      targets: hero,
      scaleX: coverScale * 1.035,
      scaleY: coverScale * 1.035,
      x: L.gameWidth * heroConfig.anchorX + heroConfig.driftX,
      y: L.gameHeight * heroConfig.anchorY + heroConfig.driftY,
      duration: 16000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const heroSheen = this.add
      .rectangle(
        -220,
        L.gameHeight * 0.42,
        220,
        L.gameHeight * 1.2,
        theme.colors.accent,
        0.08,
      )
      .setAngle(16)
      .setBlendMode(Phaser.BlendModes.SCREEN);
    this.tweens.add({
      targets: heroSheen,
      x: L.gameWidth + 220,
      duration: 9000,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: 1200,
    });

    // Top and bottom readability scrims so the art stays visible while UI remains legible.
    this.add
      .rectangle(0, 0, L.gameWidth, 220, theme.colors.background, 0.54)
      .setOrigin(0, 0);
    this.add
      .rectangle(
        0,
        L.gameHeight - 270,
        L.gameWidth,
        270,
        theme.colors.background,
        0.78,
      )
      .setOrigin(0, 0);
    this.add
      .rectangle(0, 0, L.gameWidth, L.gameHeight, theme.colors.background, 0.16)
      .setOrigin(0, 0);

    const depthCircle = this.add.circle(
      cx,
      150,
      320,
      theme.colors.panelBg,
      0.14,
    );
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
    const panelY = L.gameHeight - panelH - 22;
    const btnWidth = 220;
    const btnHeight = 52;
    const btnGap = 18;
    const btnY = panelY + panelH - btnHeight - 28;
    const btnStartX = panelX + panelW - btnWidth * 2 - btnGap - 28;
    const textLeftX = panelX + 28;
    const textRightLimit = btnStartX - 24;
    const textColumnWidth = Math.max(220, textRightLimit - textLeftX);
    new Panel(this, {
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
      showGlow: true,
    });

    const deckLabel = new Label(this, {
      x: textLeftX,
      y: panelY + 22,
      text: "Command Deck",
      style: "caption",
      color: theme.colors.accent,
    });
    deckLabel.setOrigin(0, 0);

    const promptLabel = new Label(this, {
      x: textLeftX,
      y: panelY + 48,
      text: "Choose your next jump.",
      style: "body",
      color: theme.colors.text,
    });
    promptLabel.setOrigin(0, 0);

    const statusLabel = new Label(this, {
      x: textLeftX,
      y: panelY + 80,
      text: canContinue
        ? "Save detected — continue your company from orbit."
        : "No save on record — start a fresh company charter.",
      style: "caption",
      color: theme.colors.textDim,
      maxWidth: textColumnWidth,
    });
    statusLabel.setOrigin(0, 0);

    const vignetteLabel = new Label(this, {
      x: textLeftX,
      y: panelY + 112,
      text: heroConfig.vignette,
      style: "caption",
      color: theme.colors.textDim,
      maxWidth: textColumnWidth,
    });
    vignetteLabel.setOrigin(0, 0);

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

    // Style Guide link — small caption-style button at bottom-right
    const sgBtnW = 120;
    const sgBtnH = 32;
    new Button(this, {
      x: L.gameWidth - sgBtnW - 16,
      y: L.gameHeight - sgBtnH - 8,
      width: sgBtnW,
      height: sgBtnH,
      label: "Style Guide",
      onClick: () => {
        window.open("./styleguide/index.html", "_blank");
      },
    });
  }
}

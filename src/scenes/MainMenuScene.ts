import * as Phaser from "phaser";
import {
  addFloatTween,
  addPulseTween,
  Panel,
  Label,
  Button,
  getTheme,
  getLayout,
  attachReflowHandler,
} from "../ui/index.ts";
import { hasSaveGame, loadGameIntoStore } from "../game/SaveManager.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import {
  hasResumableSandbox,
  getActiveSandboxData,
} from "../game/simulation/SandboxSaveManager.ts";

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
    subtitle: "Operate freight corridors that sustain interstellar economies",
    vignette:
      "Industrial terminals, cargo cranes, and long-haul logistics across contested space.",
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
    subtitle: "Manage premium passenger routes between high-demand systems",
    vignette:
      "Orbital terminals, high-traffic hubs, and service tiers built around reliability.",
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
  private heroConfig!: HeroConfig;
  private canContinue = false;
  private canResumeSandbox = false;

  // Decorative layer (rebuilt on every relayout — raw Phaser objects without setSize)
  private decorativeLayer: Phaser.GameObjects.GameObject[] = [];

  // Title card
  private titlePanel!: Panel;
  private strapLabel!: Label;
  private titleLabel!: Label;
  private subtitleLabel!: Label;

  // Bottom command dock
  private dockPanel!: Panel;
  private deckLabel!: Label;
  private promptLabel!: Label;
  private statusLabel!: Label;
  private vignetteLabel!: Label;

  // Buttons
  private newGameButton!: Button;
  private continueButton!: Button;
  private sandboxButton!: Button;
  private resumeSandboxButton: Button | null = null;
  private styleGuideButton: Button | null = null;

  constructor() {
    super({ key: "MainMenuScene" });
  }

  create(): void {
    const theme = getTheme();
    this.cameras.main.setBackgroundColor(theme.colors.background);
    const audio = getAudioDirector();
    audio.setMusicState("menu");

    this.heroConfig = Phaser.Utils.Array.GetRandom([...HERO_CONFIGS]);
    this.canContinue = hasSaveGame();
    this.canResumeSandbox = hasResumableSandbox();

    // Title card built once — geometry applied in relayout().
    this.titlePanel = new Panel(this, {
      x: 0,
      y: 0,
      width: 620,
      height: 132,
      showGlow: true,
    });

    this.strapLabel = new Label(this, {
      x: 0,
      y: 0,
      text: this.heroConfig.strap,
      style: "caption",
      color: theme.colors.accent,
    });
    this.strapLabel.setOrigin(0.5, 0);

    this.titleLabel = new Label(this, {
      x: 0,
      y: 0,
      text: "STAR FREIGHT TYCOON",
      style: "heading",
      color: theme.colors.accent,
      glow: true,
    });
    this.titleLabel.setOrigin(0.5);
    this.titleLabel.setFontSize(42);
    addFloatTween(this, this.titleLabel, {
      dx: 0,
      dy: -4,
      duration: 4000,
      delay: 800,
    });

    this.subtitleLabel = new Label(this, {
      x: 0,
      y: 0,
      text: this.heroConfig.subtitle,
      style: "caption",
      color: theme.colors.textDim,
    });
    this.subtitleLabel.setOrigin(0.5);

    // Bottom command dock built once — geometry applied in relayout().
    this.dockPanel = new Panel(this, {
      x: 0,
      y: 0,
      width: 760,
      height: 260,
      showGlow: true,
    });

    this.deckLabel = new Label(this, {
      x: 0,
      y: 0,
      text: "Command Deck",
      style: "caption",
      color: theme.colors.accent,
    });
    this.deckLabel.setOrigin(0, 0);

    this.promptLabel = new Label(this, {
      x: 0,
      y: 0,
      text: "Select your next operation.",
      style: "body",
      color: theme.colors.text,
    });
    this.promptLabel.setOrigin(0, 0);

    const statusText = this.canResumeSandbox
      ? "Sandbox session detected — resume current simulation or start a new run."
      : this.canContinue
        ? "Saved company detected — continue from the last checkpoint."
        : "No save detected — initialize a new company profile.";
    this.statusLabel = new Label(this, {
      x: 0,
      y: 0,
      text: statusText,
      style: "caption",
      color: theme.colors.textDim,
      maxWidth: 760 - 56,
    });
    this.statusLabel.setOrigin(0, 0);

    this.vignetteLabel = new Label(this, {
      x: 0,
      y: 0,
      text: this.heroConfig.vignette,
      style: "caption",
      color: theme.colors.textDim,
      maxWidth: 760 - 56,
    });
    this.vignetteLabel.setOrigin(0, 0);

    this.newGameButton = new Button(this, {
      x: 0,
      y: 0,
      width: 220,
      height: 52,
      label: "New Game",
      onClick: () => {
        this.scene.start("GalaxySetupScene");
      },
    });

    this.continueButton = new Button(this, {
      x: 0,
      y: 0,
      width: 220,
      height: 52,
      label: "Continue",
      disabled: !this.canContinue,
      onClick: () => {
        if (loadGameIntoStore()) {
          this.scene.start("GameHUDScene");
        }
      },
    });

    this.sandboxButton = new Button(this, {
      x: 0,
      y: 0,
      width: 220,
      height: 52,
      label: "AI Sandbox",
      onClick: () => {
        this.scene.start("SandboxSetupScene");
      },
    });

    if (this.canResumeSandbox) {
      this.resumeSandboxButton = new Button(this, {
        x: 0,
        y: 0,
        width: 168,
        height: 52,
        label: "Resume Sandbox",
        onClick: () => {
          const data = getActiveSandboxData();
          if (!data) return;
          this.scene.start("AISandboxScene", {
            seed: data.config.seed,
            gameSize: data.config.gameSize,
            galaxyShape: data.config.galaxyShape,
            companyCount: data.config.companyCount,
            speed: data.speed,
            logLevel: data.config.logLevel,
            resumeFrom: data,
          });
        },
      });
    }

    if (import.meta.env.DEV) {
      this.styleGuideButton = new Button(this, {
        x: 0,
        y: 0,
        width: 120,
        height: 32,
        label: "Style Guide",
        onClick: () => {
          window.open("./styleguide/index.html", "_blank");
        },
      });
    }

    this.relayout();
    attachReflowHandler(this, () => this.relayout());
  }

  private relayout(): void {
    const L = getLayout();
    const cx = L.gameWidth / 2;

    // Decorative layer (hero image, sheen, scrims, depth circle) has no
    // setSize() — destroy and rebuild on each reflow.
    this.rebuildDecorativeLayer();

    // Title card
    const titlePanelW = 620;
    const titlePanelH = 132;
    const titlePanelX = cx - titlePanelW / 2;
    const titlePanelY = 24;
    this.titlePanel.setPosition(titlePanelX, titlePanelY);
    this.titlePanel.setSize(titlePanelW, titlePanelH);

    this.strapLabel.setPosition(cx, titlePanelY + 18);
    this.titleLabel.setPosition(cx, titlePanelY + 52);
    this.subtitleLabel.setPosition(cx, titlePanelY + 98);

    // Bottom command dock
    const panelW = 760;
    const panelH = 260;
    const panelX = cx - panelW / 2;
    const panelY = L.gameHeight - panelH - 22;
    const btnHeight = 52;
    const btnGap = 18;
    const totalBtns = this.canResumeSandbox ? 4 : 3;
    const btnWidth = this.canResumeSandbox ? 168 : 220;
    const totalBtnWidth = btnWidth * totalBtns + btnGap * (totalBtns - 1);
    const btnStartX = panelX + (panelW - totalBtnWidth) / 2;
    const btnY = panelY + panelH - btnHeight - 28;
    const textLeftX = panelX + 28;

    this.dockPanel.setPosition(panelX, panelY);
    this.dockPanel.setSize(panelW, panelH);

    this.deckLabel.setPosition(textLeftX, panelY + 22);
    this.promptLabel.setPosition(textLeftX, panelY + 48);
    this.statusLabel.setPosition(textLeftX, panelY + 80);
    this.vignetteLabel.setPosition(textLeftX, panelY + 112);

    this.newGameButton.setPosition(btnStartX, btnY);
    this.continueButton.setPosition(btnStartX + btnWidth + btnGap, btnY);
    this.sandboxButton.setPosition(btnStartX + (btnWidth + btnGap) * 2, btnY);
    if (this.resumeSandboxButton) {
      this.resumeSandboxButton.setPosition(
        btnStartX + (btnWidth + btnGap) * 3,
        btnY,
      );
    }

    if (this.styleGuideButton) {
      const sgBtnW = 120;
      const sgBtnH = 32;
      this.styleGuideButton.setPosition(
        L.gameWidth - sgBtnW - 16,
        L.gameHeight - sgBtnH - 8,
      );
    }
  }

  private rebuildDecorativeLayer(): void {
    const L = getLayout();
    const theme = getTheme();
    const cx = L.gameWidth / 2;

    // Tear down previous decorative objects (and their tweens).
    for (const obj of this.decorativeLayer) {
      this.tweens.killTweensOf(obj);
      obj.destroy();
    }
    this.decorativeLayer = [];

    // Hero image
    const heroTexture = this.textures
      .get(this.heroConfig.key)
      .getSourceImage() as { width: number; height: number };
    const coverScale =
      Math.max(
        (L.gameWidth + 120) / heroTexture.width,
        (L.gameHeight + 110) / heroTexture.height,
      ) * this.heroConfig.zoom;

    const hero = this.add
      .image(
        L.gameWidth * this.heroConfig.anchorX,
        L.gameHeight * this.heroConfig.anchorY,
        this.heroConfig.key,
      )
      .setOrigin(this.heroConfig.focusX, this.heroConfig.focusY)
      .setScale(coverScale)
      .setAlpha(0.98);
    hero.setDepth(-100);
    this.decorativeLayer.push(hero);
    this.tweens.add({
      targets: hero,
      scaleX: coverScale * 1.035,
      scaleY: coverScale * 1.035,
      x: L.gameWidth * this.heroConfig.anchorX + this.heroConfig.driftX,
      y: L.gameHeight * this.heroConfig.anchorY + this.heroConfig.driftY,
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
    heroSheen.setDepth(-90);
    this.decorativeLayer.push(heroSheen);
    this.tweens.add({
      targets: heroSheen,
      x: L.gameWidth + 220,
      duration: 9000,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: 1200,
    });

    // Top and bottom readability scrims so the art stays visible while UI remains legible.
    const topScrim = this.add
      .rectangle(0, 0, L.gameWidth, 220, theme.colors.background, 0.54)
      .setOrigin(0, 0);
    topScrim.setDepth(-80);
    this.decorativeLayer.push(topScrim);

    const bottomScrim = this.add
      .rectangle(
        0,
        L.gameHeight - 270,
        L.gameWidth,
        270,
        theme.colors.background,
        0.78,
      )
      .setOrigin(0, 0);
    bottomScrim.setDepth(-80);
    this.decorativeLayer.push(bottomScrim);

    const fullScrim = this.add
      .rectangle(0, 0, L.gameWidth, L.gameHeight, theme.colors.background, 0.16)
      .setOrigin(0, 0);
    fullScrim.setDepth(-80);
    this.decorativeLayer.push(fullScrim);

    const depthCircle = this.add.circle(
      cx,
      150,
      320,
      theme.colors.panelBg,
      0.14,
    );
    depthCircle.setDepth(-70);
    this.decorativeLayer.push(depthCircle);
    addPulseTween(this, depthCircle, {
      minAlpha: 0.08,
      maxAlpha: 0.2,
      duration: 5200,
    });
  }
}

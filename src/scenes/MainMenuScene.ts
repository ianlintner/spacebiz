import * as Phaser from "phaser";
import {
  addFloatTween,
  Button,
  getTheme,
  getLayout,
  attachReflowHandler,
} from "../ui/index.ts";
import {
  hasSaveGame,
  loadGameIntoStore,
  hasFreshDraft,
  loadDraftIntoStore,
  deleteDraft,
} from "../game/SaveManager.ts";
import { getAudioDirector } from "../audio/AudioDirector.ts";
import {
  hasResumableSandbox,
  getActiveSandboxData,
} from "../game/simulation/SandboxSaveManager.ts";

// Once the player picks a destination from the menu, we tear the ambient
// video backdrop down for the rest of the session — it's a boot-time mood
// piece, not a recurring layer. Survives only until the next full page load.
let videoDismissed = false;

export class MainMenuScene extends Phaser.Scene {
  private canContinue = false;
  private canResumeSandbox = false;
  private canResumeDraft = false;

  // Decorative layer (rebuilt on every relayout — raw Phaser objects without setSize)
  private decorativeLayer: Phaser.GameObjects.GameObject[] = [];

  // Title — single text element floating over the video backdrop
  private titleText!: Phaser.GameObjects.Text;

  // Bottom command dock — flat translucent scrim + thin accent line
  private dockBg!: Phaser.GameObjects.Rectangle;
  private dockAccent!: Phaser.GameObjects.Rectangle;
  private deckText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  // Buttons
  private newGameButton!: Button;
  private continueButton!: Button;
  private sandboxButton!: Button;
  private resumeSandboxButton: Button | null = null;
  private resumeDraftButton: Button | null = null;
  private styleGuideButton: Button | null = null;

  constructor() {
    super({ key: "MainMenuScene" });
  }

  create(): void {
    const theme = getTheme();
    // Transparent camera so the persistent VideoBackdropScene shows through.
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");
    // Make sure the video scene is below this one in the render order, in
    // case we returned here from a deeper scene that re-ordered scenes.
    // Once dismissed (after the first menu pick), it stays gone until reload.
    if (!videoDismissed) {
      if (this.scene.isActive("VideoBackdropScene")) {
        this.scene.sendToBack("VideoBackdropScene");
      } else {
        this.scene.launch("VideoBackdropScene");
        this.scene.sendToBack("VideoBackdropScene");
      }
    }
    const audio = getAudioDirector();
    audio.setMusicState("menu");

    this.canContinue = hasSaveGame();
    this.canResumeSandbox = hasResumableSandbox();
    this.canResumeDraft = hasFreshDraft();

    // Slick cinematic title: thin, widely-tracked, off-white over the video.
    // No panel, no strap, no subtitle — the video does the talking.
    const textDpr = Math.min(
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
      3,
    );
    this.titleText = this.add
      .text(0, 0, "STAR FREIGHT TYCOON", {
        fontFamily: "monospace",
        fontSize: "44px",
        color: "#f4f8fc",
        letterSpacing: 14,
      })
      .setOrigin(0.5, 0.5)
      .setAlpha(0.95)
      .setShadow(0, 2, "rgba(0,0,0,0.7)", 12, false, true)
      .setResolution(textDpr);
    addFloatTween(this, this.titleText, {
      dx: 0,
      dy: -4,
      duration: 4000,
      delay: 800,
    });

    // Bottom command dock — flat scrim with a hairline accent edge.
    this.dockBg = this.add.rectangle(0, 0, 10, 10, 0x05101a, 0.62).setOrigin(0);
    this.dockAccent = this.add
      .rectangle(0, 0, 10, 1, theme.colors.accent, 0.55)
      .setOrigin(0);

    // Eyebrow label, wide-tracked uppercase
    this.deckText = this.add
      .text(0, 0, "COMMAND DECK", {
        fontFamily: "monospace",
        fontSize: "10px",
        color: "#7eb8d4",
        letterSpacing: 4,
      })
      .setOrigin(0, 0)
      .setAlpha(0.85)
      .setResolution(textDpr);

    this.promptText = this.add
      .text(0, 0, "Select your next operation.", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#f4f8fc",
        letterSpacing: 1,
      })
      .setOrigin(0, 0)
      .setAlpha(0.95)
      .setShadow(0, 1, "rgba(0,0,0,0.7)", 6, false, true)
      .setResolution(textDpr);

    const statusString = this.canResumeDraft
      ? "Unsaved session detected — resume where you left off or start fresh."
      : this.canResumeSandbox
        ? "Sandbox session detected — resume current simulation or start a new run."
        : this.canContinue
          ? "Saved company detected — continue from the last checkpoint."
          : "No save detected — initialize a new company profile.";
    this.statusText = this.add
      .text(0, 0, statusString, {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#a8c4d4",
        letterSpacing: 1,
        wordWrap: { width: 760 - 56 },
      })
      .setOrigin(0, 0)
      .setAlpha(0.85)
      .setResolution(textDpr);

    this.newGameButton = new Button(this, {
      x: 0,
      y: 0,
      width: 220,
      height: 52,
      label: "New Game",
      onClick: () => {
        this.dismissVideo();
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
          this.dismissVideo();
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
        this.dismissVideo();
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
          this.dismissVideo();
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

    if (this.canResumeDraft) {
      this.resumeDraftButton = new Button(this, {
        x: 0,
        y: 0,
        width: 220,
        height: 52,
        label: "Resume Session",
        onClick: () => {
          if (loadDraftIntoStore()) {
            deleteDraft();
            this.dismissVideo();
            this.scene.start("GameHUDScene");
          }
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

    // Title — centered horizontally near the top of the frame.
    this.titleText.setPosition(cx, 84);

    // Bottom command dock — full-width scrim, content centered.
    const panelW = 820;
    const panelH = 200;
    const panelX = cx - panelW / 2;
    const panelY = L.gameHeight - panelH - 22;
    const btnHeight = 52;
    const btnGap = 18;
    const extraBtns =
      (this.canResumeSandbox ? 1 : 0) + (this.canResumeDraft ? 1 : 0);
    const totalBtns = 3 + extraBtns;
    const btnWidth = totalBtns > 3 ? 168 : 220;
    const totalBtnWidth = btnWidth * totalBtns + btnGap * (totalBtns - 1);
    const btnStartX = panelX + (panelW - totalBtnWidth) / 2;
    const btnY = panelY + panelH - btnHeight - 22;
    const textLeftX = panelX + 28;

    this.dockBg.setPosition(panelX, panelY);
    this.dockBg.setSize(panelW, panelH);
    this.dockAccent.setPosition(panelX, panelY);
    this.dockAccent.setSize(panelW, 1);

    this.deckText.setPosition(textLeftX, panelY + 18);
    this.promptText.setPosition(textLeftX, panelY + 36);
    this.statusText.setPosition(textLeftX, panelY + 70);

    this.newGameButton.setPosition(btnStartX, btnY);
    this.newGameButton.setSize(btnWidth, btnHeight);
    this.continueButton.setPosition(btnStartX + (btnWidth + btnGap), btnY);
    this.continueButton.setSize(btnWidth, btnHeight);
    this.sandboxButton.setPosition(btnStartX + (btnWidth + btnGap) * 2, btnY);
    this.sandboxButton.setSize(btnWidth, btnHeight);
    let nextSlot = 3;
    if (this.resumeSandboxButton) {
      this.resumeSandboxButton.setPosition(
        btnStartX + (btnWidth + btnGap) * nextSlot,
        btnY,
      );
      this.resumeSandboxButton.setSize(btnWidth, btnHeight);
      nextSlot++;
    }
    if (this.resumeDraftButton) {
      this.resumeDraftButton.setPosition(
        btnStartX + (btnWidth + btnGap) * nextSlot,
        btnY,
      );
      this.resumeDraftButton.setSize(btnWidth, btnHeight);
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

  private dismissVideo(): void {
    if (videoDismissed) return;
    videoDismissed = true;
    // stop() fires shutdown which destroys the Video GameObject (releasing
    // the HTMLVideoElement). remove() drops the scene from the manager so
    // it can't be relaunched without a full page reload.
    if (this.scene.isActive("VideoBackdropScene")) {
      this.scene.stop("VideoBackdropScene");
    }
    this.scene.remove("VideoBackdropScene");
  }

  private rebuildDecorativeLayer(): void {
    // Tear down previous decorative objects (and their tweens).
    for (const obj of this.decorativeLayer) {
      this.tweens.killTweensOf(obj);
      obj.destroy();
    }
    this.decorativeLayer = [];

    // Backdrop is now the cycling video (VideoBackdropScene) — no scrims,
    // bars, or depth overlays on top of it.
  }
}

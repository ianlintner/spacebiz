import * as Phaser from "phaser";
import {
  getLayout,
  Panel,
  Button,
  Label,
  DEPTH_MODAL,
  getTheme,
} from "@spacebiz/ui";
import type { SceneUiDirector, SceneUiLayer } from "@spacebiz/ui";
import {
  portraitLoader,
  PORTRAIT_PLACEHOLDER_KEY,
} from "../game/PortraitLoader.ts";

export interface CommunicationDialogue {
  speakerName: string;
  speakerTitle: string;
  /** Direct Phaser texture key for preloaded portraits (e.g. "rex-portrait-standby"). */
  portraitTextureKey?: string;
  /** ID passed to portraitLoader.ensureAmbassadorPortrait — loads async. */
  ambassadorPortraitId?: string;
  text: string;
  /** Optional empire/faction accent color for the decorative line. */
  accentColor?: number;
  onDismiss?: () => void;
  /** When provided, renders these buttons instead of "Continue ▶". */
  choices?: Array<{ label: string; onClick: () => void }>;
}

export function openCommunicationModal(
  scene: Phaser.Scene,
  ui: SceneUiDirector,
  dialogue: CommunicationDialogue,
): void {
  const layer = ui.openLayer({ key: "communication" });
  const theme = getTheme();

  layer.createOverlay({
    alpha: 0,
    color: theme.colors.modalOverlay,
    closeOnPointerUp: false,
    activationDelayMs: 300,
    onPointerUp: () => {
      dialogue.onDismiss?.();
      layer.destroy();
    },
  });
  new CommunicationPanel(scene, layer, dialogue);
}

class CommunicationPanel {
  private readonly scene: Phaser.Scene;
  private readonly layer: SceneUiLayer;
  private readonly dialogue: CommunicationDialogue;
  private portraitImage!: Phaser.GameObjects.Image;
  private dialogText!: Phaser.GameObjects.Text;
  private continueButton?: Button;
  private choiceButtons: Button[] = [];
  private typewriterEvent: Phaser.Time.TimerEvent | null = null;
  private typewriterDone = false;

  constructor(
    scene: Phaser.Scene,
    layer: SceneUiLayer,
    dialogue: CommunicationDialogue,
  ) {
    this.scene = scene;
    this.layer = layer;
    this.dialogue = dialogue;

    this.build();
    this.startTypewriter(dialogue.text);
    this.loadPortrait();
  }

  private build(): void {
    const theme = getTheme();
    const L = getLayout();

    const panelW = Math.min(620, Math.max(420, L.gameWidth - 100));
    const panelH = 248;
    const panelX = Math.floor((L.gameWidth - panelW) / 2);
    const panelY = Math.floor(L.contentTop + (L.contentHeight - panelH) / 2);

    const panel = new Panel(this.scene, {
      x: panelX,
      y: panelY,
      width: panelW,
      height: panelH,
      title: "Incoming Transmission",
    });
    panel.setDepth(DEPTH_MODAL);
    this.layer.track(panel);

    const content = panel.getContentArea();
    const absX = panelX + content.x;
    const absY = panelY + content.y;

    // ── Portrait box ──────────────────────────────────────────────────────

    const portraitSize = 96;
    const portraitX = absX + 4;
    const portraitY = absY + 4;

    const portraitBg = this.scene.add
      .rectangle(
        portraitX,
        portraitY,
        portraitSize,
        portraitSize,
        0x000000,
        0.5,
      )
      .setOrigin(0, 0)
      .setDepth(DEPTH_MODAL);
    this.layer.track(portraitBg);

    this.portraitImage = this.scene.add
      .image(
        portraitX + portraitSize / 2,
        portraitY + portraitSize / 2,
        PORTRAIT_PLACEHOLDER_KEY,
      )
      .setDisplaySize(portraitSize, portraitSize)
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH_MODAL + 1);
    this.layer.track(this.portraitImage);

    // Accent frame around portrait
    const accentColor = this.dialogue.accentColor ?? theme.colors.accent;
    const portraitFrame = this.scene.add
      .rectangle(portraitX, portraitY, portraitSize, portraitSize)
      .setOrigin(0, 0)
      .setStrokeStyle(2, accentColor)
      .setFillStyle(0x000000, 0)
      .setDepth(DEPTH_MODAL + 2);
    this.layer.track(portraitFrame);

    // ── Speaker name + title ──────────────────────────────────────────────

    const nameLabel = new Label(this.scene, {
      x: absX + 4,
      y: absY + portraitSize + 8,
      text: this.dialogue.speakerName,
      style: "body",
      color: accentColor,
      maxWidth: portraitSize,
    });
    nameLabel.setDepth(DEPTH_MODAL + 1);
    this.layer.track(nameLabel);

    const titleLabel = new Label(this.scene, {
      x: absX + 4,
      y: absY + portraitSize + 44,
      text: this.dialogue.speakerTitle,
      style: "caption",
      color: theme.colors.textDim,
      maxWidth: portraitSize,
    });
    titleLabel.setDepth(DEPTH_MODAL + 1);
    this.layer.track(titleLabel);

    // ── Decorative separator line ────────────────────────────────────────

    const sepX = absX + portraitSize + 12;
    const sep = this.scene.add
      .rectangle(sepX, absY, 2, content.height - 8, accentColor, 0.6)
      .setOrigin(0, 0)
      .setDepth(DEPTH_MODAL);
    this.layer.track(sep);

    // ── Dialog text area ─────────────────────────────────────────────────

    const textX = sepX + 12;
    const textW = panelW - content.x - (sepX - panelX) - 12 - 12;
    const textH = content.height - 44;

    this.dialogText = this.scene.add
      .text(textX, absY + 4, "", {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: "#e8e8f0",
        wordWrap: { width: textW, useAdvancedWrap: true },
        lineSpacing: 4,
      })
      .setOrigin(0, 0)
      .setDepth(DEPTH_MODAL + 1);
    this.layer.track(this.dialogText);

    // Click on text area to skip typewriter
    const textHitZone = this.scene.add
      .rectangle(textX, absY, textW, textH, 0x000000, 0)
      .setOrigin(0, 0)
      .setDepth(DEPTH_MODAL + 3)
      .setInteractive();
    textHitZone.on("pointerdown", () => this.skipTypewriter());
    this.layer.track(textHitZone);

    // ── Action buttons ───────────────────────────────────────────────────

    const btnY = panelY + panelH - 48;
    const choices = this.dialogue.choices;

    if (choices && choices.length > 0) {
      // Multiple choice buttons — right-aligned, spaced left
      const btnW = 120;
      const gap = 8;
      let startX =
        panelX +
        panelW -
        content.x -
        btnW * choices.length -
        gap * (choices.length - 1);

      for (const choice of choices) {
        const btn = new Button(this.scene, {
          x: startX,
          y: btnY,
          width: btnW,
          label: choice.label,
          onClick: () => {
            choice.onClick();
            this.layer.destroy();
          },
        });
        btn.setDepth(DEPTH_MODAL + 2);
        btn.setVisible(false);
        this.layer.track(btn);
        this.choiceButtons.push(btn);
        startX += btnW + gap;
      }
    } else {
      this.continueButton = new Button(this.scene, {
        x: panelX + panelW - content.x - 110,
        y: btnY,
        width: 110,
        label: "Continue  ▶",
        onClick: () => {
          this.dialogue.onDismiss?.();
          this.layer.destroy();
        },
      });
      this.continueButton.setDepth(DEPTH_MODAL + 2);
      this.continueButton.setVisible(false);
      this.layer.track(this.continueButton);
    }

    // Cleanup timer on layer destroy
    this.layer.onDestroy(() => {
      this.typewriterEvent?.remove(false);
    });
  }

  private revealButtons(): void {
    this.typewriterDone = true;
    if (this.choiceButtons.length > 0) {
      for (const btn of this.choiceButtons) btn.setVisible(true);
    } else {
      this.continueButton?.setVisible(true);
    }
  }

  private startTypewriter(text: string): void {
    let charIndex = 0;
    this.typewriterEvent = this.scene.time.addEvent({
      delay: 20,
      repeat: text.length - 1,
      callback: () => {
        charIndex++;
        this.dialogText.setText(text.slice(0, charIndex));
        if (charIndex >= text.length) {
          this.revealButtons();
        }
      },
    });
  }

  private skipTypewriter(): void {
    if (this.typewriterDone) return;
    this.typewriterEvent?.remove(false);
    this.typewriterEvent = null;
    this.dialogText.setText(this.dialogue.text);
    this.revealButtons();
  }

  private loadPortrait(): void {
    const { portraitTextureKey, ambassadorPortraitId } = this.dialogue;

    if (portraitTextureKey) {
      if (this.scene.textures.exists(portraitTextureKey)) {
        this.portraitImage
          .setTexture(portraitTextureKey)
          .setDisplaySize(96, 96);
      }
      return;
    }

    if (!ambassadorPortraitId) return;

    portraitLoader
      .ensureAmbassadorPortrait(this.scene, ambassadorPortraitId)
      .then((key) => {
        if (this.portraitImage.active) {
          this.portraitImage.setTexture(key).setDisplaySize(96, 96);
        }
      })
      .catch(() => {
        // Placeholder stays on load failure
      });
  }
}

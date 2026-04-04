import Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";
import { Button } from "./Button.ts";
import { drawRexPortrait } from "./AdviserPortrait.ts";
import type { AdviserMood } from "../data/types.ts";

export interface TutorialOverlayConfig {
  text: string;
  mood?: AdviserMood;
  highlightHint?: string;
  onDismiss: () => void;
}

const PORTRAIT_SIZE = 48;
const PANEL_WIDTH = 340;
const PADDING = 12;

/**
 * A floating tutorial overlay with Rex's portrait, a pulsing border,
 * and a "Got it" dismiss button.
 */
export class TutorialOverlay extends Phaser.GameObjects.Container {
  private dimBg: Phaser.GameObjects.Rectangle;
  private panelBg: Phaser.GameObjects.NineSlice;
  private portraitGfx: Phaser.GameObjects.Graphics;
  private msgText: Phaser.GameObjects.Text;
  private dismissBtn: Button;
  private glowTween: Phaser.Tweens.Tween | null = null;
  private accentBorder: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, config: TutorialOverlayConfig) {
    const centerX = scene.cameras.main.centerX;
    const centerY = scene.cameras.main.centerY;
    super(scene, centerX, centerY);
    const theme = getTheme();
    const mood = config.mood ?? "standby";

    // Dim background (click-through prevented by consuming pointer)
    this.dimBg = scene.add
      .rectangle(
        0,
        0,
        scene.cameras.main.width * 2,
        scene.cameras.main.height * 2,
        0x000000,
        0.55,
      )
      .setInteractive();
    this.add(this.dimBg);

    // Measure text height first
    const tempText = scene.add.text(0, 0, config.text, {
      fontSize: `${theme.fonts.body.size}px`,
      fontFamily: theme.fonts.body.family,
      wordWrap: { width: PANEL_WIDTH - PORTRAIT_SIZE - PADDING * 3 },
    });
    const textH = tempText.height;
    tempText.destroy();

    const contentH = Math.max(PORTRAIT_SIZE, textH);
    const panelH = PADDING * 2 + contentH + PADDING + (theme.button.height + 4);
    const halfW = PANEL_WIDTH / 2;
    const halfH = panelH / 2;

    // Panel bg
    this.panelBg = scene.add
      .nineslice(
        -halfW,
        -halfH,
        "panel-bg",
        undefined,
        PANEL_WIDTH,
        panelH,
        10,
        10,
        10,
        10,
      )
      .setOrigin(0, 0);
    this.add(this.panelBg);

    // Pulsing accent border
    this.accentBorder = scene.add
      .rectangle(-halfW - 1, -halfH - 1, PANEL_WIDTH + 2, panelH + 2)
      .setStrokeStyle(2, theme.colors.accent, 0.8)
      .setOrigin(0, 0)
      .setFillStyle(0x000000, 0);
    this.add(this.accentBorder);

    this.glowTween = scene.tweens.add({
      targets: this.accentBorder,
      alpha: { from: 1, to: 0.3 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    // Portrait
    this.portraitGfx = scene.add.graphics();
    this.portraitGfx.setPosition(-halfW + PADDING, -halfH + PADDING);
    drawRexPortrait(this.portraitGfx, PORTRAIT_SIZE, PORTRAIT_SIZE, mood);
    this.add(this.portraitGfx);

    // Message text
    const textX = -halfW + PADDING + PORTRAIT_SIZE + PADDING;
    this.msgText = scene.add
      .text(textX, -halfH + PADDING, config.text, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
        wordWrap: { width: PANEL_WIDTH - PORTRAIT_SIZE - PADDING * 3 },
        lineSpacing: 2,
      })
      .setOrigin(0, 0);
    this.add(this.msgText);

    // Hint label
    if (config.highlightHint) {
      const hintY = -halfH + PADDING + contentH + 2;
      const hint = scene.add
        .text(-halfW + PADDING, hintY, `💡 ${config.highlightHint}`, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.accent),
        })
        .setOrigin(0, 0);
      this.add(hint);
    }

    // "Got it" button
    const btnW = 80;
    this.dismissBtn = new Button(scene, {
      x: halfW - btnW - PADDING,
      y: halfH - theme.button.height - PADDING,
      width: btnW,
      height: theme.button.height,
      label: "Got it",
      onClick: () => {
        config.onDismiss();
        this.close();
      },
    });
    this.add(this.dismissBtn);

    // Entrance tween
    this.setAlpha(0);
    scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 200,
      ease: "Sine.easeOut",
    });

    this.setDepth(1000);
    scene.add.existing(this);
  }

  close(): void {
    if (this.scene) {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: 150,
        onComplete: () => this.destroy(),
      });
    } else {
      this.destroy();
    }
  }

  destroy(fromScene?: boolean): void {
    if (this.glowTween) {
      this.glowTween.destroy();
      this.glowTween = null;
    }
    super.destroy(fromScene);
  }
}

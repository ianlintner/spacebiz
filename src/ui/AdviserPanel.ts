import Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";
import { drawRexPortrait, getMoodAccentColor } from "./AdviserPortrait.ts";
import type { AdviserMessage, AdviserMood } from "../data/types.ts";

export interface AdviserPanelConfig {
  x: number;
  y: number;
  width: number;
  /** If true, uses compact single-line mode (for HUD sidebar) */
  compact?: boolean;
}

const PORTRAIT_SIZE = 64;
const COMPACT_PORTRAIT = 40;
const TYPEWRITER_MS = 25; // ms per character
const MSG_PADDING = 8;

/**
 * Self-contained adviser panel showing Rex's portrait + message with
 * typewriter effect. Supports compact (HUD badge) and full (report) modes.
 */
export class AdviserPanel extends Phaser.GameObjects.Container {
  private portraitGfx: Phaser.GameObjects.Graphics;
  private msgLabel: Phaser.GameObjects.Text;
  private bg: Phaser.GameObjects.NineSlice;
  private accentBar: Phaser.GameObjects.Rectangle;
  private navLabel: Phaser.GameObjects.Text | null = null;
  private isCompact: boolean;

  private messages: AdviserMessage[] = [];
  private currentIndex = 0;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private fullText = "";
  private charIndex = 0;
  private currentMood: AdviserMood = "standby";
  private portraitSize: number;

  constructor(scene: Phaser.Scene, config: AdviserPanelConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();
    this.isCompact = config.compact ?? false;
    this.portraitSize = this.isCompact ? COMPACT_PORTRAIT : PORTRAIT_SIZE;
    const panelHeight = this.isCompact
      ? this.portraitSize + MSG_PADDING * 2
      : this.portraitSize + MSG_PADDING * 3 + 20; // extra for nav

    // Drop shadow (offset dark rect behind everything)
    const shadow = scene.add
      .rectangle(3, 3, config.width, panelHeight, 0x000000)
      .setOrigin(0, 0)
      .setAlpha(0.45);
    this.add(shadow);

    // Solid dark backing for contrast (behind the nineslice)
    const solidBg = scene.add
      .rectangle(0, 0, config.width, panelHeight, 0x0a0e14)
      .setOrigin(0, 0)
      .setAlpha(0.92);
    this.add(solidBg);

    // Background
    this.bg = scene.add
      .nineslice(
        0,
        0,
        "panel-bg",
        undefined,
        config.width,
        panelHeight,
        10,
        10,
        10,
        10,
      )
      .setOrigin(0, 0)
      .setAlpha(0.85);
    this.add(this.bg);

    // Top highlight line for glass effect
    const topHighlight = scene.add
      .rectangle(1, 0, config.width - 2, 1, 0xffffff)
      .setOrigin(0, 0)
      .setAlpha(0.08);
    this.add(topHighlight);

    // Accent bar left side (wider, brighter)
    this.accentBar = scene.add
      .rectangle(0, 0, 4, panelHeight, theme.colors.accent)
      .setOrigin(0, 0)
      .setAlpha(0.75);
    this.add(this.accentBar);

    // Portrait
    this.portraitGfx = scene.add.graphics();
    this.portraitGfx.setPosition(MSG_PADDING, MSG_PADDING);
    this.add(this.portraitGfx);
    drawRexPortrait(
      this.portraitGfx,
      this.portraitSize,
      this.portraitSize,
      "standby",
    );

    // Message text
    const textX = MSG_PADDING + this.portraitSize + MSG_PADDING;
    const textW = config.width - textX - MSG_PADDING;
    this.msgLabel = scene.add
      .text(textX, MSG_PADDING + 2, "", {
        fontSize: `${this.isCompact ? theme.fonts.caption.size : theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
        wordWrap: { width: textW },
        lineSpacing: 2,
      })
      .setOrigin(0, 0);
    this.add(this.msgLabel);

    // Navigation label (full mode only)
    if (!this.isCompact) {
      this.navLabel = scene.add
        .text(config.width - MSG_PADDING, panelHeight - MSG_PADDING - 4, "", {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
        })
        .setOrigin(1, 1)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.nextMessage());
      this.add(this.navLabel);
    }

    // Click anywhere to advance in full mode
    if (!this.isCompact) {
      const hitZone = scene.add
        .zone(0, 0, config.width, panelHeight)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          if (this.charIndex < this.fullText.length) {
            // Skip typewriter
            this.finishTypewriter();
          } else {
            this.nextMessage();
          }
        });
      this.add(hitZone);
    }

    this.setVisible(false);
    scene.add.existing(this);
  }

  // ── Public API ──────────────────────────

  /** Show a batch of messages. Replaces any current queue. */
  showMessages(messages: AdviserMessage[]): void {
    if (messages.length === 0) {
      this.setVisible(false);
      return;
    }
    this.messages = [...messages];
    this.currentIndex = 0;
    this.setVisible(true);
    this.displayCurrent();
  }

  /** Append messages to the queue without resetting. */
  appendMessages(messages: AdviserMessage[]): void {
    if (messages.length === 0) return;
    const wasEmpty = this.messages.length === 0;
    this.messages.push(...messages);
    if (wasEmpty) {
      this.currentIndex = 0;
      this.setVisible(true);
      this.displayCurrent();
    }
    this.updateNav();
  }

  /** Show a single message immediately. */
  showSingle(text: string, mood: AdviserMood = "standby"): void {
    this.showMessages([
      {
        id: `single-${Date.now()}`,
        text,
        mood,
        priority: 1,
        context: "tip",
        turnGenerated: 0,
      },
    ]);
  }

  /** Clear all messages and hide. */
  clear(): void {
    this.stopTypewriter();
    this.messages = [];
    this.currentIndex = 0;
    this.setVisible(false);
  }

  /** Number of unread messages remaining (including current). */
  get remaining(): number {
    return Math.max(0, this.messages.length - this.currentIndex);
  }

  get mood(): AdviserMood {
    return this.currentMood;
  }

  // ── Internal ────────────────────────────

  private displayCurrent(): void {
    const msg = this.messages[this.currentIndex];
    if (!msg) {
      this.setVisible(false);
      return;
    }
    this.currentMood = msg.mood;
    this.updatePortrait(msg.mood);
    this.updateAccentBar(msg.mood);
    this.startTypewriter(msg.text);
    this.updateNav();
  }

  private nextMessage(): void {
    if (this.currentIndex < this.messages.length - 1) {
      this.currentIndex++;
      this.displayCurrent();
    }
  }

  private updatePortrait(mood: AdviserMood): void {
    drawRexPortrait(
      this.portraitGfx,
      this.portraitSize,
      this.portraitSize,
      mood,
    );
  }

  private updateAccentBar(mood: AdviserMood): void {
    this.accentBar.setFillStyle(getMoodAccentColor(mood));
  }

  private startTypewriter(text: string): void {
    this.stopTypewriter();
    this.fullText = text;
    this.charIndex = 0;
    this.msgLabel.setText("");

    this.typewriterTimer = this.scene.time.addEvent({
      delay: TYPEWRITER_MS,
      repeat: text.length - 1,
      callback: () => {
        this.charIndex++;
        this.msgLabel.setText(this.fullText.substring(0, this.charIndex));
      },
    });
  }

  private finishTypewriter(): void {
    this.stopTypewriter();
    this.charIndex = this.fullText.length;
    this.msgLabel.setText(this.fullText);
  }

  private stopTypewriter(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.destroy();
      this.typewriterTimer = null;
    }
  }

  private updateNav(): void {
    if (!this.navLabel) return;
    const total = this.messages.length;
    if (total <= 1) {
      this.navLabel.setText("");
    } else {
      this.navLabel.setText(`${this.currentIndex + 1}/${total}  ▶`);
    }
  }

  destroy(fromScene?: boolean): void {
    this.stopTypewriter();
    super.destroy(fromScene);
  }
}

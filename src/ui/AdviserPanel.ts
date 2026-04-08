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

const PORTRAIT_SIZE = 96;
const COMPACT_PORTRAIT = 64;
const TYPEWRITER_MS = 25; // ms per character
const MSG_PADDING = 12;
const NAME_HEIGHT = 18;

/**
 * Self-contained adviser panel showing Rex's portrait + message with
 * typewriter effect. Supports compact (HUD badge) and full (report) modes.
 */
export class AdviserPanel extends Phaser.GameObjects.Container {
  private portraitGfx: Phaser.GameObjects.Graphics;
  private nameLabel: Phaser.GameObjects.Text;
  private msgLabel: Phaser.GameObjects.Text;
  private bg: Phaser.GameObjects.NineSlice;
  private accentBar: Phaser.GameObjects.Rectangle;
  private shadow: Phaser.GameObjects.Rectangle;
  private solidBg: Phaser.GameObjects.Rectangle;
  private navLabel: Phaser.GameObjects.Text | null = null;
  private hitZone: Phaser.GameObjects.Zone | null = null;
  private isCompact: boolean;

  private messages: AdviserMessage[] = [];
  private currentIndex = 0;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private fullText = "";
  private charIndex = 0;
  private currentMood: AdviserMood = "standby";
  private portraitSize: number;
  private panelWidth: number;
  private panelHeight: number;
  private minPanelHeight: number;

  constructor(scene: Phaser.Scene, config: AdviserPanelConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();
    this.isCompact = config.compact ?? false;
    this.portraitSize = this.isCompact ? COMPACT_PORTRAIT : PORTRAIT_SIZE;
    this.panelWidth = config.width;
    this.minPanelHeight = this.isCompact
      ? this.portraitSize + MSG_PADDING * 2
      : this.portraitSize + MSG_PADDING * 3 + 24; // extra for nav
    this.panelHeight = this.minPanelHeight;
    const panelHeight = this.panelHeight;

    // Drop shadow (offset dark rect behind everything)
    this.shadow = scene.add
      .rectangle(4, 4, config.width, panelHeight, theme.colors.modalOverlay)
      .setOrigin(0, 0)
      .setAlpha(0.5);
    this.add(this.shadow);

    // Solid dark backing for contrast (behind the nineslice)
    this.solidBg = scene.add
      .rectangle(0, 0, config.width, panelHeight, theme.colors.background)
      .setOrigin(0, 0)
      .setAlpha(0.94);
    this.add(this.solidBg);

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
      .setAlpha(0.1);
    this.add(topHighlight);

    // Accent bar left side
    this.accentBar = scene.add
      .rectangle(0, 0, 4, panelHeight, theme.colors.accent)
      .setOrigin(0, 0)
      .setAlpha(0.8);
    this.add(this.accentBar);

    // Portrait with subtle border
    const portraitBorder = scene.add
      .rectangle(
        MSG_PADDING - 2,
        MSG_PADDING - 2,
        this.portraitSize + 4,
        this.portraitSize + 4,
        theme.colors.panelBorder,
      )
      .setOrigin(0, 0)
      .setAlpha(0.6);
    this.add(portraitBorder);

    this.portraitGfx = scene.add.graphics();
    this.portraitGfx.setPosition(MSG_PADDING, MSG_PADDING);
    this.add(this.portraitGfx);
    drawRexPortrait(
      this.portraitGfx,
      this.portraitSize,
      this.portraitSize,
      "standby",
    );

    // Text area to the right of portrait
    const textX = MSG_PADDING + this.portraitSize + MSG_PADDING + 4;
    const textW = config.width - textX - MSG_PADDING;

    // Name / title label
    const nameText = this.isCompact ? "Rex" : "Rex — K9-Corp Adviser";
    this.nameLabel = scene.add
      .text(textX, MSG_PADDING, nameText, {
        fontSize: `${this.isCompact ? theme.fonts.caption.size : 13}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(theme.colors.accent),
      })
      .setOrigin(0, 0);
    this.add(this.nameLabel);

    // Thin separator line below name
    const separatorY = MSG_PADDING + NAME_HEIGHT - 2;
    const separator = scene.add
      .rectangle(textX, separatorY, textW, 1, theme.colors.accent)
      .setOrigin(0, 0)
      .setAlpha(0.25);
    this.add(separator);

    // Message text
    const msgY = MSG_PADDING + NAME_HEIGHT + 2;
    this.msgLabel = scene.add
      .text(textX, msgY, "", {
        fontSize: `${this.isCompact ? theme.fonts.caption.size : theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.text),
        wordWrap: { width: textW },
        lineSpacing: 3,
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
      this.hitZone = scene.add
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
      this.add(this.hitZone);
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
    this.resizePanel(this.minPanelHeight);
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

    // Measure full text to auto-size panel height
    this.msgLabel.setText(text);
    const textHeight = this.msgLabel.height;
    this.msgLabel.setText("");

    const msgY = MSG_PADDING + NAME_HEIGHT + 2;
    const bottomPad = this.isCompact ? MSG_PADDING : MSG_PADDING + 24;
    const neededHeight = Math.max(
      this.minPanelHeight,
      msgY + textHeight + bottomPad,
    );
    this.resizePanel(neededHeight);

    this.typewriterTimer = this.scene.time.addEvent({
      delay: TYPEWRITER_MS,
      repeat: text.length - 1,
      callback: () => {
        this.charIndex++;
        this.msgLabel.setText(this.fullText.substring(0, this.charIndex));
      },
    });
  }

  /** Resize panel height, growing upward so bottom edge stays fixed. */
  private resizePanel(newHeight: number): void {
    const delta = newHeight - this.panelHeight;
    if (delta === 0) return;

    this.y -= delta;
    this.panelHeight = newHeight;

    this.shadow.setSize(this.panelWidth, newHeight);
    this.solidBg.setSize(this.panelWidth, newHeight);
    this.bg.setSize(this.panelWidth, newHeight);
    this.accentBar.setSize(4, newHeight);
    if (this.hitZone) {
      this.hitZone.setSize(this.panelWidth, newHeight);
    }
    if (this.navLabel) {
      this.navLabel.setY(newHeight - MSG_PADDING - 4);
    }
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

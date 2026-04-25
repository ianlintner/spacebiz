import * as Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";
import { addPulseTween } from "./AmbientFX.ts";

export type BadgeVariant =
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

export interface StatusBadgeConfig {
  x: number;
  y: number;
  text: string;
  variant?: BadgeVariant;
  /** Pulse the badge to draw attention (default: false). */
  pulse?: boolean;
  /** Custom background color override. */
  bgColor?: number;
  /** Custom text color override. */
  textColor?: number;
}

function variantColors(variant: BadgeVariant): { bg: number; text: number } {
  const theme = getTheme();
  switch (variant) {
    case "success":
      return { bg: 0x003322, text: theme.colors.profit };
    case "warning":
      return { bg: 0x332200, text: theme.colors.warning };
    case "danger":
      return { bg: 0x330011, text: theme.colors.loss };
    case "info":
      return { bg: 0x002233, text: theme.colors.accent };
    case "neutral":
    default:
      return { bg: theme.colors.panelBg, text: theme.colors.textDim };
  }
}

/**
 * A small pill-shaped status indicator with configurable variant styling.
 * Used in HUDs, table rows, and info cards to communicate state at a
 * glance (e.g. "Active", "Low Fuel", "Profit Streak").
 */
export class StatusBadge extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private pulseTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, config: StatusBadgeConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();
    const variant = config.variant ?? "neutral";
    const colors = variantColors(variant);
    const bgColor = config.bgColor ?? colors.bg;
    const textColor = config.textColor ?? colors.text;

    const font = theme.fonts.caption;

    // Measure text to auto-size
    const tempText = scene.add.text(0, 0, config.text, {
      fontSize: `${font.size}px`,
      fontFamily: font.family,
    });
    const textW = tempText.width;
    const textH = tempText.height;
    tempText.destroy();

    const padX = theme.spacing.sm;
    const padY = theme.spacing.xs;
    const pillW = textW + padX * 2;
    const pillH = textH + padY * 2;

    // Pill background
    this.bg = scene.add
      .rectangle(0, 0, pillW, pillH, bgColor, 0.85)
      .setOrigin(0, 0);
    this.bg.setStrokeStyle(1, textColor, 0.4);
    this.add(this.bg);

    // Label
    this.label = scene.add
      .text(padX, padY, config.text, {
        fontSize: `${font.size}px`,
        fontFamily: font.family,
        color: colorToString(textColor),
      })
      .setOrigin(0, 0);
    this.add(this.label);

    // Pulse animation
    if (config.pulse) {
      this.pulseTween = addPulseTween(scene, this, {
        minAlpha: 0.6,
        maxAlpha: 1.0,
        duration: theme.ambient.panelIdlePulseDuration,
      });
    }

    this.setSize(pillW, pillH);
    scene.add.existing(this);
  }

  /** Update the badge text and optionally its variant. */
  update(text: string, variant?: BadgeVariant): this {
    this.label.setText(text);
    if (variant !== undefined) {
      const colors = variantColors(variant);
      this.bg.setFillStyle(colors.bg, 0.85);
      this.bg.setStrokeStyle(1, colors.text, 0.4);
      this.label.setColor(colorToString(colors.text));

      // Re-measure & resize
      const theme = getTheme();
      const padX = theme.spacing.sm;
      const padY = theme.spacing.xs;
      this.bg.setSize(
        this.label.width + padX * 2,
        this.label.height + padY * 2,
      );
      this.setSize(this.bg.width, this.bg.height);
    }
    return this;
  }

  get badgeWidth(): number {
    return this.bg.width;
  }

  get badgeHeight(): number {
    return this.bg.height;
  }

  destroy(fromScene?: boolean): void {
    if (this.pulseTween) {
      this.pulseTween.destroy();
      this.pulseTween = null;
    }
    super.destroy(fromScene);
  }
}

import * as Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";

const GLASS_TITLE_HEIGHT = 30;

export interface GlassPanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  titleFontSize?: number;
  /** Background alpha. Default 0.62. */
  backgroundAlpha?: number;
  /** "elevated" gets 0.08 more alpha for nested card usage. Default "flat". */
  variant?: "elevated" | "flat";
}

export class GlassPanel extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.NineSlice;
  private titleLabel: Phaser.GameObjects.Text | null = null;
  private titleUnderline: Phaser.GameObjects.Rectangle | null = null;
  protected contentY: number;
  protected panelWidth: number;
  protected panelHeight: number;
  private baseBgAlpha: number;

  constructor(scene: Phaser.Scene, config: GlassPanelConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();
    this.panelWidth = config.width;
    this.panelHeight = config.height;

    const baseAlpha = config.backgroundAlpha ?? 0.62;
    const bgAlpha =
      config.variant === "elevated" ? Math.min(1, baseAlpha + 0.08) : baseAlpha;
    this.baseBgAlpha = bgAlpha;

    this.bg = scene.add
      .nineslice(
        0,
        0,
        "panel-bg",
        undefined,
        config.width,
        config.height,
        10,
        10,
        10,
        10,
      )
      .setOrigin(0, 0)
      .setAlpha(bgAlpha);
    this.add(this.bg);

    this.contentY = theme.spacing.sm;

    if (config.title) {
      this.titleLabel = scene.add.text(
        theme.spacing.md,
        theme.spacing.sm,
        config.title,
        {
          fontSize: `${config.titleFontSize ?? theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.heading.family,
          color: colorToString(theme.color.accent.primary),
        },
      );
      this.titleUnderline = scene.add
        .rectangle(
          0,
          GLASS_TITLE_HEIGHT - 1,
          config.width,
          1,
          theme.color.accent.primary,
        )
        .setOrigin(0, 0)
        .setAlpha(0.7);
      this.add([this.titleLabel, this.titleUnderline]);
      this.contentY = GLASS_TITLE_HEIGHT + theme.spacing.xs;
    }

    scene.add.existing(this);
  }

  getContentY(): number {
    return this.contentY;
  }

  getContentArea(): { x: number; y: number; width: number; height: number } {
    const theme = getTheme();
    return {
      x: theme.spacing.sm,
      y: this.contentY,
      width: this.panelWidth - theme.spacing.sm * 2,
      height: this.panelHeight - this.contentY - theme.spacing.sm,
    };
  }

  setSize(width: number, height: number): this {
    super.setSize(width, height);
    this.panelWidth = width;
    this.panelHeight = height;
    this.bg.setSize(width, height);
    if (this.titleUnderline) {
      this.titleUnderline.setSize(width, 1);
    }
    return this;
  }

  setTitle(title: string): this {
    this.titleLabel?.setText(title);
    return this;
  }

  override setActive(active: boolean): this {
    super.setActive(active);
    const targetAlpha = active
      ? Math.min(1, this.baseBgAlpha + 0.2)
      : this.baseBgAlpha;
    this.scene.tweens.add({
      targets: this.bg,
      alpha: targetAlpha,
      duration: 200,
      ease: "Power2",
    });
    if (this.titleUnderline) {
      this.scene.tweens.add({
        targets: this.titleUnderline,
        alpha: active ? 1.0 : 0.7,
        duration: 200,
        ease: "Power2",
      });
    }
    return this;
  }
}

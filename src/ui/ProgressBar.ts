import Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";

export interface ProgressBarConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  value?: number;
  maxValue?: number;
  showLabel?: boolean;
  fillColor?: number;
  bgColor?: number;
  borderColor?: number;
  labelFormat?: (value: number, max: number) => string;
}

export class ProgressBar extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private fill: Phaser.GameObjects.Rectangle;
  private border: Phaser.GameObjects.Rectangle;
  private outerGlow: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text | null = null;
  private currentValue: number;
  private maxValue: number;
  private barWidth: number;
  private fillColor: number;
  private labelFormatFn: ((value: number, max: number) => string) | null;

  constructor(scene: Phaser.Scene, config: ProgressBarConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();

    this.barWidth = config.width;
    this.currentValue = config.value ?? 0;
    this.maxValue = config.maxValue ?? 100;
    this.fillColor = config.fillColor ?? theme.colors.accent;
    this.labelFormatFn = config.labelFormat ?? null;

    const borderColor = config.borderColor ?? theme.colors.panelBorder;
    const bgColor = config.bgColor ?? theme.colors.panelBg;
    const bw = theme.panel.borderWidth;

    // Outer glow (behind the border, offset by -2px on each side)
    this.outerGlow = scene.add
      .rectangle(
        -2,
        -2,
        config.width + 4,
        config.height + 4,
        theme.colors.accent,
      )
      .setOrigin(0, 0)
      .setAlpha(0.15);
    this.add(this.outerGlow);

    // Border
    this.border = scene.add
      .rectangle(0, 0, config.width, config.height, borderColor)
      .setOrigin(0, 0);
    this.add(this.border);

    // Background
    this.bg = scene.add
      .rectangle(bw, bw, config.width - bw * 2, config.height - bw * 2, bgColor)
      .setOrigin(0, 0);
    this.add(this.bg);

    // Fill
    const fillWidth = this.calculateFillWidth();
    this.fill = scene.add
      .rectangle(bw, bw, fillWidth, config.height - bw * 2, this.fillColor)
      .setOrigin(0, 0);
    this.add(this.fill);

    // Optional label
    if (config.showLabel !== false) {
      const labelText = this.formatLabel();
      this.label = scene.add
        .text(config.width / 2, config.height / 2, labelText, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.text),
        })
        .setOrigin(0.5);
      this.add(this.label);
    }

    scene.add.existing(this);
  }

  private calculateFillWidth(): number {
    const theme = getTheme();
    const bw = theme.panel.borderWidth;
    const innerWidth = this.barWidth - bw * 2;
    const ratio = Phaser.Math.Clamp(this.currentValue / this.maxValue, 0, 1);
    return innerWidth * ratio;
  }

  private formatLabel(): string {
    if (this.labelFormatFn) {
      return this.labelFormatFn(this.currentValue, this.maxValue);
    }
    const pct = Math.round((this.currentValue / this.maxValue) * 100);
    return `${pct}%`;
  }

  setValue(value: number, animate = true): void {
    this.currentValue = Phaser.Math.Clamp(value, 0, this.maxValue);
    const targetWidth = this.calculateFillWidth();

    if (animate) {
      this.scene.tweens.add({
        targets: this.fill,
        displayWidth: targetWidth,
        duration: 300,
        ease: "Power2",
      });
    } else {
      this.fill.displayWidth = targetWidth;
    }

    if (this.label) {
      this.label.setText(this.formatLabel());
    }
  }

  getValue(): number {
    return this.currentValue;
  }

  setFillColor(color: number): void {
    this.fillColor = color;
    this.fill.setFillStyle(color);
  }
}

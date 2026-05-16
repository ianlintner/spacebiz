import * as Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";
import type { ThemeConfig } from "./Theme.ts";

export type ChipVariant = "default" | "warn" | "danger" | "success" | "accent";

export interface StatusChipConfig {
  x: number;
  y: number;
  /** Fixed chip width. Default 140. */
  width?: number;
  /** Chip height. Default 28. */
  height?: number;
  /** Optional dim label on the left (e.g. "Ships"). */
  label?: string;
  /** Main value text (e.g. "8"). */
  value: string;
  variant?: ChipVariant;
}

const CHIP_PADDING_X = 10;
const CHIP_GAP = 6;

function variantValueColor(variant: ChipVariant, theme: ThemeConfig): number {
  switch (variant) {
    case "warn":
      return theme.colors.warning;
    case "danger":
      return theme.colors.loss;
    case "success":
      return theme.colors.profit;
    case "accent":
      return theme.colors.accent;
    default:
      return theme.colors.textDim;
  }
}

function variantBorderColor(variant: ChipVariant, theme: ThemeConfig): number {
  switch (variant) {
    case "warn":
      return theme.colors.warning;
    case "danger":
      return theme.colors.loss;
    case "success":
      return theme.colors.profit;
    case "accent":
      return theme.colors.accent;
    default:
      return theme.colors.panelBorder;
  }
}

export class StatusChip extends Phaser.GameObjects.Container {
  private chipBg: Phaser.GameObjects.Rectangle;
  private labelText: Phaser.GameObjects.Text | null = null;
  private valueText: Phaser.GameObjects.Text;
  private chipWidth: number;
  private chipHeight: number;

  constructor(scene: Phaser.Scene, config: StatusChipConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();
    this.chipWidth = config.width ?? 140;
    this.chipHeight = config.height ?? 28;
    const currentVariant: ChipVariant = config.variant ?? "default";

    const valueColor = variantValueColor(currentVariant, theme);
    const borderColor = variantBorderColor(currentVariant, theme);

    this.chipBg = scene.add
      .rectangle(
        0,
        0,
        this.chipWidth,
        this.chipHeight,
        theme.colors.background,
        0.36,
      )
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, borderColor, 0.26);
    this.add(this.chipBg);

    let valueX = CHIP_PADDING_X;

    if (config.label) {
      this.labelText = scene.add
        .text(CHIP_PADDING_X, 0, config.label, {
          fontSize: `${theme.fonts.caption.size}px`,
          fontFamily: theme.fonts.caption.family,
          color: colorToString(theme.colors.textDim),
        })
        .setOrigin(0, 0.5);
      this.add(this.labelText);
      valueX = CHIP_PADDING_X + this.labelText.width + CHIP_GAP;
    }

    this.valueText = scene.add
      .text(valueX, 0, config.value, {
        fontSize: `${theme.fonts.caption.size}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(valueColor),
      })
      .setOrigin(0, 0.5);
    this.add(this.valueText);

    scene.add.existing(this);
  }

  setValue(text: string): this {
    this.valueText.setText(text);
    return this;
  }

  setLabel(text: string): this {
    this.labelText?.setText(text);
    return this;
  }

  setVariant(variant: ChipVariant): this {
    const theme = getTheme();
    this.valueText.setColor(colorToString(variantValueColor(variant, theme)));
    this.chipBg.setStrokeStyle(1, variantBorderColor(variant, theme), 0.26);
    return this;
  }

  setSize(width: number, height: number): this {
    this.chipWidth = width;
    this.chipHeight = height;
    this.chipBg.setSize(width, height);
    return this;
  }
}

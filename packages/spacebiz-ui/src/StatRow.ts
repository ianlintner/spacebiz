import * as Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";

export interface StatRowConfig {
  x: number;
  y: number;
  /** Width of the row. Labels are left-aligned, values right-aligned. */
  width: number;
  label: string;
  value: string;
  /** Override value color (default: theme accent). */
  valueColor?: number;
  /** Use caption-size text for a compact display. */
  compact?: boolean;
}

/**
 * A single-line key→value row with left-aligned label and right-aligned
 * value, connected by a dotted leader. Common pattern in HUDs, stat
 * panels, and info cards throughout the game.
 */
export class StatRow extends Phaser.GameObjects.Container {
  private labelText: Phaser.GameObjects.Text;
  private valueText: Phaser.GameObjects.Text;
  private leaderLine: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, config: StatRowConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();
    const compact = config.compact ?? false;
    const font = compact ? theme.fonts.caption : theme.fonts.body;

    this.labelText = scene.add
      .text(0, 0, config.label, {
        fontSize: `${font.size}px`,
        fontFamily: font.family,
        color: colorToString(theme.colors.textDim),
      })
      .setOrigin(0, 0);
    this.add(this.labelText);

    this.valueText = scene.add
      .text(config.width, 0, config.value, {
        fontSize: `${font.size}px`,
        fontFamily: font.family,
        color: colorToString(config.valueColor ?? theme.colors.accent),
      })
      .setOrigin(1, 0);
    this.add(this.valueText);

    // Dotted leader line between label and value
    const lineY = Math.floor(font.size * 0.75);
    this.leaderLine = scene.add
      .rectangle(0, lineY, config.width, 1, theme.colors.panelBorder, 0.3)
      .setOrigin(0, 0.5);
    this.add(this.leaderLine);

    // Send leader behind text
    this.sendToBack(this.leaderLine);

    scene.add.existing(this);
  }

  /** Update the displayed value text and optionally its color. */
  setValue(value: string, color?: number): this {
    this.valueText.setText(value);
    if (color !== undefined) {
      this.valueText.setColor(colorToString(color));
    }
    return this;
  }

  /** Update the label text. */
  setLabel(label: string): this {
    this.labelText.setText(label);
    return this;
  }

  /** Height of one stat row (for layout stacking). */
  get rowHeight(): number {
    return Math.max(this.labelText.height, this.valueText.height) + 4;
  }
}

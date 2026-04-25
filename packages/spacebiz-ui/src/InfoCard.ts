import * as Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";
import { StatRow } from "./StatRow.ts";

export interface InfoCardConfig {
  x: number;
  y: number;
  width: number;
  /** Card title shown in accent color at the top. */
  title: string;
  /** Key-value stat rows displayed below the title. */
  stats: Array<{ label: string; value: string; valueColor?: number }>;
  /** Optional description text below stats. */
  description?: string;
  /** Compact mode uses smaller fonts. */
  compact?: boolean;
}

/**
 * A self-contained glass-styled info card with a title, key-value stats,
 * and optional description. Useful for tooltips, sidebar summaries,
 * and entity info pop-ups.
 */
export class InfoCard extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.NineSlice;
  private titleLabel: Phaser.GameObjects.Text;
  private statRows: StatRow[] = [];
  private descLabel: Phaser.GameObjects.Text | null = null;
  private computedHeight: number;

  constructor(scene: Phaser.Scene, config: InfoCardConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();
    const compact = config.compact ?? false;
    const pad = theme.spacing.sm;
    const statWidth = config.width - pad * 2;

    let contentY = pad;

    // Title
    const titleFont = compact ? theme.fonts.caption : theme.fonts.body;
    this.titleLabel = scene.add
      .text(pad, contentY, config.title, {
        fontSize: `${titleFont.size}px`,
        fontFamily: titleFont.family,
        color: colorToString(theme.colors.accent),
        fontStyle: "bold",
      })
      .setOrigin(0, 0);
    this.add(this.titleLabel);
    contentY += this.titleLabel.height + pad;

    // Separator line below title
    const sep = scene.add
      .rectangle(pad, contentY, statWidth, 1, theme.colors.accent, 0.3)
      .setOrigin(0, 0);
    this.add(sep);
    contentY += pad;

    // Stat rows
    for (const stat of config.stats) {
      const row = new StatRow(scene, {
        x: pad,
        y: contentY,
        width: statWidth,
        label: stat.label,
        value: stat.value,
        valueColor: stat.valueColor,
        compact,
      });
      // Re-parent into this container
      scene.children.remove(row);
      this.add(row);
      this.statRows.push(row);
      contentY += row.rowHeight;
    }

    // Description
    if (config.description) {
      contentY += pad / 2;
      const descFont = theme.fonts.caption;
      this.descLabel = scene.add
        .text(pad, contentY, config.description, {
          fontSize: `${descFont.size}px`,
          fontFamily: descFont.family,
          color: colorToString(theme.colors.textDim),
          wordWrap: { width: statWidth },
          lineSpacing: 2,
        })
        .setOrigin(0, 0);
      this.add(this.descLabel);
      contentY += this.descLabel.height;
    }

    contentY += pad;
    this.computedHeight = contentY;

    // Glass background (rendered behind everything)
    this.bg = scene.add
      .nineslice(
        0,
        0,
        "panel-bg",
        undefined,
        config.width,
        this.computedHeight,
        10,
        10,
        10,
        10,
      )
      .setOrigin(0, 0)
      .setAlpha(0.9);
    this.add(this.bg);
    this.sendToBack(this.bg);

    scene.add.existing(this);
  }

  /** Height of the card (for layout stacking). */
  get cardHeight(): number {
    return this.computedHeight;
  }

  /** Update a stat row by index. */
  updateStat(index: number, value: string, color?: number): this {
    const row = this.statRows[index];
    if (row) {
      row.setValue(value, color);
    }
    return this;
  }
}

import * as Phaser from "phaser";
import { colorToString, getTheme } from "@spacebiz/ui";
import {
  getEffectBreakdown,
  type EffectEntry,
} from "../../game/tech/EffectBreakdown.ts";
import type { TechState } from "../../data/types.ts";

export interface TechBonusesPanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

const CARD_HEIGHT = 64;
const CARD_GAP = 8;

// Reducer effect types — a negative value here is good for the player
// (lower fees, lower costs, shorter bad events).
const REDUCER_EFFECTS = new Set([
  "modifyLicenseFee",
  "modifyTariff",
  "modifyMaintenance",
  "modifyFuel",
  "modifyConditionDecay",
  "modifyOverhaulCost",
  "modifyEventDuration",
]);

export class TechBonusesPanel extends Phaser.GameObjects.Container {
  private cfg: TechBonusesPanelConfig;
  private cardGroup: Phaser.GameObjects.Container;
  private emptyText: Phaser.GameObjects.Text;
  private cardCount = 0;

  constructor(scene: Phaser.Scene, config: TechBonusesPanelConfig) {
    super(scene, config.x, config.y);
    this.cfg = config;
    scene.add.existing(this);

    const theme = getTheme();

    this.cardGroup = new Phaser.GameObjects.Container(scene, 0, 0);
    scene.add.existing(this.cardGroup);
    this.add(this.cardGroup);

    this.emptyText = scene.add
      .text(
        config.width / 2,
        config.height / 2,
        "No active bonuses — research a tech to see effects here",
        {
          fontSize: "11px",
          fontFamily: theme.fonts.body.family,
          color: colorToString(theme.colors.textDim),
          align: "center",
          wordWrap: { width: config.width - 40 },
        },
      )
      .setOrigin(0.5, 0.5)
      .setVisible(false);
    this.add(this.emptyText);
  }

  setBonusesState(tech: TechState): this {
    this.cardGroup.removeAll(true);
    const entries = getEffectBreakdown(tech);
    this.cardCount = entries.length;

    if (entries.length === 0) {
      this.emptyText.setVisible(true);
      return this;
    }
    this.emptyText.setVisible(false);

    const cols = this.cfg.width >= 240 ? 2 : 1;
    const cardWidth = (this.cfg.width - CARD_GAP * (cols - 1)) / cols;

    entries.forEach((entry, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = col * (cardWidth + CARD_GAP);
      const y = row * (CARD_HEIGHT + CARD_GAP);
      this.renderCard(entry, x, y, cardWidth);
    });

    return this;
  }

  resize(width: number, height: number): this {
    this.cfg.width = width;
    this.cfg.height = height;
    this.emptyText.setPosition(width / 2, height / 2);
    this.emptyText.setWordWrapWidth(width - 40);
    return this;
  }

  getCardCount(): number {
    return this.cardCount;
  }

  private renderCard(
    entry: EffectEntry,
    x: number,
    y: number,
    width: number,
  ): void {
    const theme = getTheme();

    // Player-perspective color: reducer effects that have negative values are
    // GOOD (lower cost), so map them to the positive (green) colour.
    const playerGood =
      (entry.sign === "negative" && REDUCER_EFFECTS.has(entry.effectType)) ||
      (entry.sign === "positive" && !REDUCER_EFFECTS.has(entry.effectType));
    const valueColor = playerGood ? 0x9cffb0 : 0xff9c9c;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x141c2e, 0.95);
    bg.fillRoundedRect(x, y, width, CARD_HEIGHT, 6);
    bg.lineStyle(1, 0x2c3a55, 1);
    bg.strokeRoundedRect(x, y, width, CARD_HEIGHT, 6);

    const label = this.scene.add.text(
      x + 10,
      y + 8,
      entry.label.toUpperCase(),
      {
        fontSize: "9px",
        fontFamily: theme.fonts.body.family,
        color: colorToString(theme.colors.textDim),
        letterSpacing: 1,
      },
    );

    const formatted = formatValue(entry);
    const valueText = this.scene.add.text(x + 10, y + 20, formatted, {
      fontSize: "18px",
      fontFamily: theme.fonts.body.family,
      color: colorToString(valueColor),
      fontStyle: "bold",
    });

    const fromText = this.scene.add.text(x + 10, y + 46, sourceLine(entry), {
      fontSize: "9px",
      fontFamily: theme.fonts.body.family,
      color: colorToString(theme.colors.textDim),
      wordWrap: { width: width - 20 },
    });

    this.cardGroup.add([bg, label, valueText, fromText]);
  }
}

function formatValue(entry: EffectEntry): string {
  const sign = entry.value > 0 ? "+" : entry.value < 0 ? "−" : "";
  const abs = Math.abs(entry.value);
  if (entry.format === "percent") {
    return `${sign}${(abs * 100).toFixed(0)}%`;
  }
  const formatted = Number.isInteger(abs) ? abs.toString() : abs.toFixed(1);
  return `${sign}${formatted}`;
}

function sourceLine(entry: EffectEntry): string {
  if (entry.sources.length === 1) return `from ${entry.sources[0].techName}`;
  return `from ${entry.sources.length} techs`;
}

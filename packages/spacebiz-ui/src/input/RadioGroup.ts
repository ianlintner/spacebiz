import * as Phaser from "phaser";
import { getTheme, colorToString } from "../Theme.ts";
import { playUiSfx } from "../UiSound.ts";

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupConfig {
  x: number;
  y: number;
  options: RadioOption[];
  value: string;
  onChange?: (value: string) => void;
  /** Vertical pixels between rows. Defaults to 28. */
  rowSpacing?: number;
}

const RADIO_RADIUS = 8;
const DOT_RADIUS = 4;
const LABEL_GAP = 10;
const DEFAULT_ROW_SPACING = 28;

interface RadioRow {
  ring: Phaser.GameObjects.Arc;
  dot: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  hitZone: Phaser.GameObjects.Zone;
  value: string;
}

export class RadioGroup extends Phaser.GameObjects.Container {
  private readonly rows: RadioRow[] = [];
  private readonly onChangeFn?: (value: string) => void;
  private currentValue: string;
  private isEnabledState = true;

  constructor(scene: Phaser.Scene, config: RadioGroupConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();
    const spacing = config.rowSpacing ?? DEFAULT_ROW_SPACING;

    this.onChangeFn = config.onChange;
    this.currentValue = config.value;

    let maxWidth = 0;
    for (let i = 0; i < config.options.length; i++) {
      const opt = config.options[i];
      const rowY = i * spacing + RADIO_RADIUS;

      const ring = scene.add.circle(
        RADIO_RADIUS,
        rowY,
        RADIO_RADIUS,
        theme.colors.buttonBg,
      );
      ring.setStrokeStyle(1, theme.colors.panelBorder);
      this.add(ring);

      const dot = scene.add
        .circle(RADIO_RADIUS, rowY, DOT_RADIUS, theme.colors.accent)
        .setVisible(opt.value === this.currentValue);
      this.add(dot);

      const label = scene.add
        .text(RADIO_RADIUS * 2 + LABEL_GAP, rowY, opt.label, {
          fontSize: `${theme.fonts.body.size}px`,
          fontFamily: theme.fonts.body.family,
          color: colorToString(theme.colors.text),
        })
        .setOrigin(0, 0.5);
      this.add(label);

      const rowWidth = RADIO_RADIUS * 2 + LABEL_GAP + label.width;
      if (rowWidth > maxWidth) maxWidth = rowWidth;

      const hitZone = scene.add
        .zone(0, rowY - RADIO_RADIUS, rowWidth, RADIO_RADIUS * 2)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      if (hitZone.input) hitZone.input.cursor = "pointer";
      this.add(hitZone);

      const captured = opt.value;
      hitZone.on("pointerup", () => this.handleClick(captured));

      this.rows.push({ ring, dot, label, hitZone, value: opt.value });
    }

    const totalHeight =
      config.options.length > 0
        ? (config.options.length - 1) * spacing + RADIO_RADIUS * 2
        : 0;
    this.setSize(maxWidth, totalHeight);

    scene.add.existing(this);
  }

  private handleClick(value: string): void {
    if (!this.isEnabledState) return;
    if (value === this.currentValue) return;
    this.applySelection(value, true);
  }

  private applySelection(value: string, fireCallback: boolean): void {
    this.currentValue = value;
    for (const row of this.rows) {
      row.dot.setVisible(row.value === value);
    }
    if (fireCallback) {
      playUiSfx("ui_click");
      this.onChangeFn?.(value);
    }
  }

  getValue(): string {
    return this.currentValue;
  }

  setValue(value: string): void {
    if (value === this.currentValue) return;
    if (!this.rows.some((r) => r.value === value)) return;
    this.applySelection(value, false);
  }

  setEnabled(enabled: boolean): void {
    if (this.isEnabledState === enabled) return;
    this.isEnabledState = enabled;
    const theme = getTheme();
    for (const row of this.rows) {
      if (enabled) {
        row.hitZone.setInteractive({ useHandCursor: true });
        row.label.setColor(colorToString(theme.colors.text));
        row.ring.setFillStyle(theme.colors.buttonBg);
        row.dot.setFillStyle(theme.colors.accent);
      } else {
        row.hitZone.disableInteractive();
        row.label.setColor(colorToString(theme.colors.textDim));
        row.ring.setFillStyle(theme.colors.buttonDisabled);
        row.dot.setFillStyle(theme.colors.textDim);
      }
    }
    this.setAlpha(enabled ? 1 : 0.6);
  }

  isEnabled(): boolean {
    return this.isEnabledState;
  }
}

import * as Phaser from "phaser";
import { getTheme, colorToString } from "../Theme.ts";
import { playUiSfx } from "../UiSound.ts";
import {
  HOLD_REPEAT_INITIAL_DELAY,
  HOLD_REPEAT_START_INTERVAL,
  clampStepperValue,
  nextRepeatInterval,
} from "./stepperLogic.ts";

export interface StepperConfig {
  x: number;
  y: number;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  /** Total width of the stepper (buttons + value display). Default 140. */
  width?: number;
  /** Height of the stepper. Default theme.button.height. */
  height?: number;
  onChange?: (value: number) => void;
  /** Format the value for display (e.g. money, percent). Default String(value). */
  formatValue?: (value: number) => string;
}

export class Stepper extends Phaser.GameObjects.Container {
  private currentValue: number;
  private readonly min: number;
  private readonly max: number;
  private readonly step: number;
  private readonly onChange?: (value: number) => void;
  private readonly format: (value: number) => string;

  private valueText: Phaser.GameObjects.Text;
  private decBg: Phaser.GameObjects.Rectangle;
  private incBg: Phaser.GameObjects.Rectangle;
  private decGlyph: Phaser.GameObjects.Text;
  private incGlyph: Phaser.GameObjects.Text;

  private holdInitialTimer: Phaser.Time.TimerEvent | null = null;
  private holdRepeatTimer: Phaser.Time.TimerEvent | null = null;
  private currentRepeatInterval = HOLD_REPEAT_START_INTERVAL;

  constructor(scene: Phaser.Scene, config: StepperConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();

    this.min = config.min ?? Number.NEGATIVE_INFINITY;
    this.max = config.max ?? Number.POSITIVE_INFINITY;
    this.step = config.step ?? 1;
    this.onChange = config.onChange;
    this.format = config.formatValue ?? ((v) => String(v));
    this.currentValue = clampStepperValue(config.value, this.min, this.max);

    const width = config.width ?? 140;
    const height = config.height ?? theme.button.height;
    const btnSize = height;
    const valueWidth = width - btnSize * 2;
    this.setSize(width, height);

    // Decrement button (left)
    this.decBg = scene.add
      .rectangle(0, 0, btnSize, height, theme.colors.buttonBg)
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.6);
    this.decGlyph = scene.add
      .text(btnSize / 2, height / 2, "−", {
        fontSize: `${theme.fonts.value.size}px`,
        fontFamily: theme.fonts.value.family,
        color: colorToString(theme.colors.text),
      })
      .setOrigin(0.5);

    // Value display (middle)
    const valueBg = scene.add
      .rectangle(btnSize, 0, valueWidth, height, theme.colors.panelBg)
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.6);
    this.valueText = scene.add
      .text(
        btnSize + valueWidth / 2,
        height / 2,
        this.format(this.currentValue),
        {
          fontSize: `${theme.fonts.body.size}px`,
          fontFamily: theme.fonts.body.family,
          color: colorToString(theme.colors.text),
        },
      )
      .setOrigin(0.5);

    // Increment button (right)
    this.incBg = scene.add
      .rectangle(
        btnSize + valueWidth,
        0,
        btnSize,
        height,
        theme.colors.buttonBg,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.6);
    this.incGlyph = scene.add
      .text(btnSize + valueWidth + btnSize / 2, height / 2, "+", {
        fontSize: `${theme.fonts.value.size}px`,
        fontFamily: theme.fonts.value.family,
        color: colorToString(theme.colors.text),
      })
      .setOrigin(0.5);

    this.add([
      this.decBg,
      this.decGlyph,
      valueBg,
      this.valueText,
      this.incBg,
      this.incGlyph,
    ]);

    this.wireButton(this.decBg, -1);
    this.wireButton(this.incBg, +1);

    scene.add.existing(this);

    this.refreshDisabledStates();
  }

  private wireButton(
    bg: Phaser.GameObjects.Rectangle,
    direction: 1 | -1,
  ): void {
    const theme = getTheme();
    bg.setInteractive({ useHandCursor: true });

    bg.on("pointerover", () => {
      if (!this.canStep(direction)) return;
      bg.setFillStyle(theme.colors.buttonHover);
      playUiSfx("ui_hover");
    });
    bg.on("pointerout", () => {
      bg.setFillStyle(theme.colors.buttonBg);
      this.cancelHold();
    });
    bg.on("pointerup", () => {
      bg.setFillStyle(theme.colors.buttonHover);
      this.cancelHold();
    });
    bg.on("pointerupoutside", () => {
      bg.setFillStyle(theme.colors.buttonBg);
      this.cancelHold();
    });
    bg.on("pointerdown", () => {
      if (!this.canStep(direction)) return;
      bg.setFillStyle(theme.colors.buttonPressed);
      this.applyStep(direction);
      this.beginHold(direction);
    });
  }

  private beginHold(direction: 1 | -1): void {
    this.cancelHold();
    this.currentRepeatInterval = HOLD_REPEAT_START_INTERVAL;
    this.holdInitialTimer = this.scene.time.delayedCall(
      HOLD_REPEAT_INITIAL_DELAY,
      () => {
        this.scheduleNextRepeat(direction);
      },
    );
  }

  private scheduleNextRepeat(direction: 1 | -1): void {
    if (!this.canStep(direction)) {
      this.cancelHold();
      return;
    }
    this.applyStep(direction);
    this.currentRepeatInterval = nextRepeatInterval(this.currentRepeatInterval);
    this.holdRepeatTimer = this.scene.time.delayedCall(
      this.currentRepeatInterval,
      () => this.scheduleNextRepeat(direction),
    );
  }

  private cancelHold(): void {
    this.holdInitialTimer?.remove(false);
    this.holdInitialTimer = null;
    this.holdRepeatTimer?.remove(false);
    this.holdRepeatTimer = null;
  }

  private canStep(direction: 1 | -1): boolean {
    const next = this.currentValue + direction * this.step;
    return clampStepperValue(next, this.min, this.max) !== this.currentValue;
  }

  private applyStep(direction: 1 | -1): void {
    const proposed = this.currentValue + direction * this.step;
    const clamped = clampStepperValue(proposed, this.min, this.max);
    if (clamped === this.currentValue) {
      this.cancelHold();
      return;
    }
    this.currentValue = clamped;
    this.valueText.setText(this.format(this.currentValue));
    playUiSfx("ui_click_secondary");
    this.onChange?.(this.currentValue);
    this.refreshDisabledStates();
  }

  private refreshDisabledStates(): void {
    const theme = getTheme();
    const decAlpha = this.canStep(-1) ? 1 : 0.35;
    const incAlpha = this.canStep(+1) ? 1 : 0.35;
    this.decGlyph.setColor(
      colorToString(
        this.canStep(-1) ? theme.colors.text : theme.colors.textDim,
      ),
    );
    this.incGlyph.setColor(
      colorToString(
        this.canStep(+1) ? theme.colors.text : theme.colors.textDim,
      ),
    );
    this.decBg.setAlpha(decAlpha);
    this.incBg.setAlpha(incAlpha);
  }

  getValue(): number {
    return this.currentValue;
  }

  setValue(value: number): void {
    const clamped = clampStepperValue(value, this.min, this.max);
    if (clamped === this.currentValue) return;
    this.currentValue = clamped;
    this.valueText.setText(this.format(this.currentValue));
    this.refreshDisabledStates();
    this.onChange?.(this.currentValue);
  }

  override destroy(fromScene?: boolean): void {
    this.cancelHold();
    super.destroy(fromScene);
  }
}

import * as Phaser from "phaser";
import { getTheme, colorToString } from "../Theme.ts";
import { playUiSfx } from "../UiSound.ts";

export interface CheckboxConfig {
  x: number;
  y: number;
  checked: boolean;
  label?: string;
  onChange?: (checked: boolean) => void;
}

const BOX_SIZE = 18;
const LABEL_GAP = 8;
const CHECK_INSET = 4;

export class Checkbox extends Phaser.GameObjects.Container {
  private readonly box: Phaser.GameObjects.Rectangle;
  private readonly check: Phaser.GameObjects.Rectangle;
  private readonly labelText: Phaser.GameObjects.Text | null;
  private readonly hitZone: Phaser.GameObjects.Zone;
  private readonly onChangeFn?: (checked: boolean) => void;
  private isCheckedState: boolean;
  private isEnabledState = true;

  constructor(scene: Phaser.Scene, config: CheckboxConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();

    this.isCheckedState = config.checked;
    this.onChangeFn = config.onChange;

    this.box = scene.add
      .rectangle(0, 0, BOX_SIZE, BOX_SIZE, theme.colors.buttonBg)
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder);
    this.add(this.box);

    this.check = scene.add
      .rectangle(
        CHECK_INSET,
        CHECK_INSET,
        BOX_SIZE - CHECK_INSET * 2,
        BOX_SIZE - CHECK_INSET * 2,
        theme.colors.accent,
      )
      .setOrigin(0, 0)
      .setVisible(this.isCheckedState);
    this.add(this.check);

    let totalWidth = BOX_SIZE;
    if (config.label) {
      this.labelText = scene.add
        .text(BOX_SIZE + LABEL_GAP, BOX_SIZE / 2, config.label, {
          fontSize: `${theme.fonts.body.size}px`,
          fontFamily: theme.fonts.body.family,
          color: colorToString(theme.colors.text),
        })
        .setOrigin(0, 0.5);
      this.add(this.labelText);
      totalWidth = BOX_SIZE + LABEL_GAP + this.labelText.width;
    } else {
      this.labelText = null;
    }

    this.hitZone = scene.add
      .zone(0, 0, totalWidth, BOX_SIZE)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    if (this.hitZone.input) this.hitZone.input.cursor = "pointer";
    this.add(this.hitZone);

    this.hitZone.on("pointerup", () => this.toggle());

    this.setSize(totalWidth, BOX_SIZE);
    scene.add.existing(this);
  }

  private toggle(): void {
    if (!this.isEnabledState) return;
    this.setChecked(!this.isCheckedState, true);
  }

  setChecked(value: boolean, fireCallback = false): void {
    if (this.isCheckedState === value) return;
    this.isCheckedState = value;
    this.check.setVisible(value);
    if (fireCallback) {
      playUiSfx("ui_click");
      this.onChangeFn?.(value);
    }
  }

  isChecked(): boolean {
    return this.isCheckedState;
  }

  setEnabled(enabled: boolean): void {
    if (this.isEnabledState === enabled) return;
    this.isEnabledState = enabled;
    const theme = getTheme();
    if (enabled) {
      this.hitZone.setInteractive({ useHandCursor: true });
      this.box.setFillStyle(theme.colors.buttonBg);
      this.check.setFillStyle(theme.colors.accent);
      this.labelText?.setColor(colorToString(theme.colors.text));
      this.setAlpha(1);
    } else {
      this.hitZone.disableInteractive();
      this.box.setFillStyle(theme.colors.buttonDisabled);
      this.check.setFillStyle(theme.colors.textDim);
      this.labelText?.setColor(colorToString(theme.colors.textDim));
      this.setAlpha(0.6);
    }
  }

  isEnabled(): boolean {
    return this.isEnabledState;
  }
}

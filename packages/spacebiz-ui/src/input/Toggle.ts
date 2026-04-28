import * as Phaser from "phaser";
import { getTheme, colorToString } from "../Theme.ts";
import { playUiSfx } from "../UiSound.ts";

export interface ToggleConfig {
  x: number;
  y: number;
  on: boolean;
  onLabel?: string;
  offLabel?: string;
  onChange?: (on: boolean) => void;
}

const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 22;
const KNOB_RADIUS = 8;
const KNOB_INSET = 3;
const LABEL_GAP = 8;
const TWEEN_MS = 140;

export class Toggle extends Phaser.GameObjects.Container {
  private readonly track: Phaser.GameObjects.Rectangle;
  private readonly knob: Phaser.GameObjects.Arc;
  private readonly stateLabel: Phaser.GameObjects.Text | null;
  private readonly hitZone: Phaser.GameObjects.Zone;
  private readonly onChangeFn?: (on: boolean) => void;
  private readonly onLabel?: string;
  private readonly offLabel?: string;
  private isOnState: boolean;
  private isEnabledState = true;
  private knobTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, config: ToggleConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();

    this.isOnState = config.on;
    this.onChangeFn = config.onChange;
    this.onLabel = config.onLabel;
    this.offLabel = config.offLabel;

    this.track = scene.add
      .rectangle(
        0,
        0,
        TRACK_WIDTH,
        TRACK_HEIGHT,
        this.isOnState ? theme.colors.accent : theme.colors.buttonBg,
      )
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder);
    this.add(this.track);

    this.knob = scene.add.circle(
      this.computeKnobX(),
      TRACK_HEIGHT / 2,
      KNOB_RADIUS,
      theme.colors.text,
    );
    this.add(this.knob);

    let totalWidth = TRACK_WIDTH;
    const labelText = this.resolveLabel();
    if (labelText !== null) {
      this.stateLabel = scene.add
        .text(TRACK_WIDTH + LABEL_GAP, TRACK_HEIGHT / 2, labelText, {
          fontSize: `${theme.fonts.body.size}px`,
          fontFamily: theme.fonts.body.family,
          color: colorToString(theme.colors.text),
        })
        .setOrigin(0, 0.5);
      this.add(this.stateLabel);
      totalWidth = TRACK_WIDTH + LABEL_GAP + this.stateLabel.width;
    } else {
      this.stateLabel = null;
    }

    this.hitZone = scene.add
      .zone(0, 0, totalWidth, TRACK_HEIGHT)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    if (this.hitZone.input) this.hitZone.input.cursor = "pointer";
    this.add(this.hitZone);

    this.hitZone.on("pointerup", () => this.toggle());

    this.setSize(totalWidth, TRACK_HEIGHT);
    scene.add.existing(this);
  }

  private resolveLabel(): string | null {
    const text = this.isOnState ? this.onLabel : this.offLabel;
    return text ?? null;
  }

  private computeKnobX(): number {
    return this.isOnState
      ? TRACK_WIDTH - KNOB_INSET - KNOB_RADIUS
      : KNOB_INSET + KNOB_RADIUS;
  }

  private toggle(): void {
    if (!this.isEnabledState) return;
    this.setOn(!this.isOnState, true);
  }

  setOn(value: boolean, fireCallback = false): void {
    if (this.isOnState === value) return;
    this.isOnState = value;
    const theme = getTheme();

    this.track.setFillStyle(
      value ? theme.colors.accent : theme.colors.buttonBg,
    );

    if (this.knobTween) this.knobTween.stop();
    this.knobTween = this.scene.tweens.add({
      targets: this.knob,
      x: this.computeKnobX(),
      duration: TWEEN_MS,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.knobTween = null;
      },
    });

    if (this.stateLabel) {
      const next = this.resolveLabel();
      if (next !== null) this.stateLabel.setText(next);
    }

    if (fireCallback) {
      playUiSfx("ui_click");
      this.onChangeFn?.(value);
    }
  }

  isOn(): boolean {
    return this.isOnState;
  }

  setEnabled(enabled: boolean): void {
    if (this.isEnabledState === enabled) return;
    this.isEnabledState = enabled;
    if (enabled) {
      this.hitZone.setInteractive({ useHandCursor: true });
      this.setAlpha(1);
    } else {
      this.hitZone.disableInteractive();
      this.setAlpha(0.55);
    }
  }

  isEnabled(): boolean {
    return this.isEnabledState;
  }
}

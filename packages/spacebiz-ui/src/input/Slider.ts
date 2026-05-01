import * as Phaser from "phaser";
import { getTheme, colorToString } from "../Theme.ts";
import { playUiSfx } from "../UiSound.ts";
import { quantizeSliderValue } from "./sliderMath.ts";

export { quantizeSliderValue } from "./sliderMath.ts";

export interface SliderConfig {
  x: number;
  y: number;
  width: number;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange?: (value: number) => void;
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
}

const TRACK_HEIGHT = 6;
const THUMB_RADIUS = 9;
const LABEL_GAP = 4;

export class Slider extends Phaser.GameObjects.Container {
  private widthPx: number;
  private readonly min: number;
  private readonly max: number;
  private readonly step?: number;
  private readonly onChangeFn?: (value: number) => void;
  private readonly formatValueFn: (value: number) => string;
  private readonly showValue: boolean;

  private currentValue: number;
  private isEnabledState = true;
  private isDragging = false;

  private readonly track: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly thumb: Phaser.GameObjects.Arc;
  private readonly hitZone: Phaser.GameObjects.Zone;
  private readonly labelText: Phaser.GameObjects.Text | null;
  private readonly valueText: Phaser.GameObjects.Text | null;

  constructor(scene: Phaser.Scene, config: SliderConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();

    this.widthPx = config.width;
    this.min = config.min;
    this.max = config.max;
    this.step = config.step;
    this.onChangeFn = config.onChange;
    this.showValue = config.showValue ?? false;
    this.formatValueFn =
      config.formatValue ??
      ((v: number) => (Number.isInteger(v) ? `${v}` : v.toFixed(2)));
    this.currentValue = quantizeSliderValue(
      config.value,
      this.min,
      this.max,
      this.step,
    );

    let trackY = 0;
    if (config.label || this.showValue) {
      const headerY = 0;
      if (config.label) {
        this.labelText = scene.add
          .text(0, headerY, config.label, {
            fontSize: `${theme.fonts.body.size}px`,
            fontFamily: theme.fonts.body.family,
            color: colorToString(theme.colors.text),
          })
          .setOrigin(0, 0);
        this.add(this.labelText);
      } else {
        this.labelText = null;
      }
      if (this.showValue) {
        this.valueText = scene.add
          .text(this.widthPx, headerY, this.formatValueFn(this.currentValue), {
            fontSize: `${theme.fonts.body.size}px`,
            fontFamily: theme.fonts.body.family,
            color: colorToString(theme.colors.accent),
          })
          .setOrigin(1, 0);
        this.add(this.valueText);
      } else {
        this.valueText = null;
      }
      trackY = theme.fonts.body.size + LABEL_GAP + THUMB_RADIUS;
    } else {
      this.labelText = null;
      this.valueText = null;
      trackY = THUMB_RADIUS;
    }

    this.track = scene.add
      .rectangle(
        0,
        trackY,
        this.widthPx,
        TRACK_HEIGHT,
        theme.colors.scrollbarTrack,
      )
      .setOrigin(0, 0.5);
    this.add(this.track);

    this.fill = scene.add
      .rectangle(
        0,
        trackY,
        this.computeThumbX(),
        TRACK_HEIGHT,
        theme.colors.accent,
      )
      .setOrigin(0, 0.5);
    this.add(this.fill);

    this.thumb = scene.add.circle(
      this.computeThumbX(),
      trackY,
      THUMB_RADIUS,
      theme.colors.accent,
    );
    this.thumb.setStrokeStyle(1, theme.colors.text, 0.6);
    this.add(this.thumb);

    this.hitZone = scene.add
      .zone(0, trackY, this.widthPx, THUMB_RADIUS * 2 + TRACK_HEIGHT)
      .setOrigin(0, 0.5);
    this.add(this.hitZone);
    this.setupInteraction();

    const totalHeight = trackY + THUMB_RADIUS;
    this.setSize(this.widthPx, totalHeight);

    scene.add.existing(this);
  }

  private computeThumbX(): number {
    if (this.max === this.min) return 0;
    const t = (this.currentValue - this.min) / (this.max - this.min);
    return Math.max(0, Math.min(1, t)) * this.widthPx;
  }

  private setupInteraction(): void {
    this.hitZone.setInteractive({ useHandCursor: true, draggable: true });
    if (this.hitZone.input) this.hitZone.input.cursor = "pointer";

    const updateFromPointer = (pointer: Phaser.Input.Pointer): void => {
      if (!this.isEnabledState) return;
      const m = this.getWorldTransformMatrix();
      const localX = pointer.worldX - m.tx;
      const fraction = Math.max(0, Math.min(1, localX / this.widthPx));
      const raw = this.min + fraction * (this.max - this.min);
      const next = quantizeSliderValue(raw, this.min, this.max, this.step);
      this.applyValue(next, true);
    };

    this.hitZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!this.isEnabledState) return;
      this.isDragging = true;
      updateFromPointer(pointer);
    });

    this.scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      updateFromPointer(pointer);
    });

    const stopDrag = (): void => {
      if (this.isDragging) this.isDragging = false;
    };
    this.scene.input.on("pointerup", stopDrag);
    this.scene.input.on("pointerupoutside", stopDrag);

    this.once("destroy", () => {
      this.scene.input.off("pointermove");
      this.scene.input.off("pointerup", stopDrag);
      this.scene.input.off("pointerupoutside", stopDrag);
    });
  }

  private applyValue(next: number, fireCallback: boolean): void {
    if (next === this.currentValue) return;
    this.currentValue = next;
    const x = this.computeThumbX();
    this.thumb.setX(x);
    this.fill.setSize(x, TRACK_HEIGHT);
    if (this.valueText) {
      this.valueText.setText(this.formatValueFn(this.currentValue));
    }
    if (fireCallback) {
      playUiSfx("ui_click");
      this.onChangeFn?.(this.currentValue);
    }
  }

  getValue(): number {
    return this.currentValue;
  }

  setValue(value: number): void {
    const next = quantizeSliderValue(value, this.min, this.max, this.step);
    this.applyValue(next, false);
  }

  /**
   * Flex the slider's track width on resize. The height parameter is
   * accepted for API symmetry with the rest of the layout system but is
   * effectively dictated by the track + thumb geometry, so it is
   * forwarded to `super.setSize` and otherwise ignored.
   *
   * The handle is re-anchored to the current value (no value change).
   */
  override setSize(width: number, height: number): this {
    super.setSize(width, height);
    this.widthPx = width;
    this.track.setSize(width, TRACK_HEIGHT);
    if (this.valueText) {
      this.valueText.setX(width);
    }
    this.hitZone.setSize(width, THUMB_RADIUS * 2 + TRACK_HEIGHT);
    const x = this.computeThumbX();
    this.thumb.setX(x);
    this.fill.setSize(x, TRACK_HEIGHT);
    return this;
  }

  setEnabled(enabled: boolean): void {
    if (this.isEnabledState === enabled) return;
    this.isEnabledState = enabled;
    const theme = getTheme();
    if (enabled) {
      this.hitZone.setInteractive({ useHandCursor: true, draggable: true });
      this.fill.setFillStyle(theme.colors.accent);
      this.thumb.setFillStyle(theme.colors.accent);
      this.setAlpha(1);
    } else {
      this.hitZone.disableInteractive();
      this.fill.setFillStyle(theme.colors.buttonDisabled);
      this.thumb.setFillStyle(theme.colors.buttonDisabled);
      this.setAlpha(0.55);
      this.isDragging = false;
    }
  }

  isEnabled(): boolean {
    return this.isEnabledState;
  }
}

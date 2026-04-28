import * as Phaser from "phaser";
import { getTheme } from "../Theme.ts";
import { playUiSfx } from "../UiSound.ts";

export interface ColorSwatchConfig {
  x: number;
  y: number;
  /** Square edge length in pixels. */
  size: number;
  /** Hex color (e.g. 0xff8800). */
  color: number;
  onClick?: (color: number) => void;
  /** When true, draws a thicker accent border to indicate selection. */
  selected?: boolean;
}

/**
 * A small clickable color square. Building block for a future ColorPicker;
 * also useful on its own for "current color" displays.
 */
export class ColorSwatch extends Phaser.GameObjects.Container {
  private fillRect: Phaser.GameObjects.Rectangle;
  private borderRect: Phaser.GameObjects.Rectangle;
  private currentColor: number;
  private isSelected: boolean;

  constructor(scene: Phaser.Scene, config: ColorSwatchConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();

    this.currentColor = config.color;
    this.isSelected = config.selected ?? false;
    this.setSize(config.size, config.size);

    this.fillRect = scene.add
      .rectangle(0, 0, config.size, config.size, this.currentColor)
      .setOrigin(0, 0);
    this.borderRect = scene.add
      .rectangle(0, 0, config.size, config.size)
      .setOrigin(0, 0)
      .setFillStyle()
      .setStrokeStyle(
        this.isSelected ? 3 : 1,
        this.isSelected ? theme.colors.accent : theme.colors.panelBorder,
        this.isSelected ? 1 : 0.7,
      );

    this.add([this.fillRect, this.borderRect]);

    if (config.onClick) {
      const onClick = config.onClick;
      this.fillRect.setInteractive({ useHandCursor: true });
      this.fillRect.on("pointerover", () => {
        playUiSfx("ui_hover");
        this.borderRect.setStrokeStyle(2, theme.colors.accentHover, 1);
      });
      this.fillRect.on("pointerout", () => {
        this.borderRect.setStrokeStyle(
          this.isSelected ? 3 : 1,
          this.isSelected ? theme.colors.accent : theme.colors.panelBorder,
          this.isSelected ? 1 : 0.7,
        );
      });
      this.fillRect.on("pointerdown", () => {
        playUiSfx("ui_click_secondary");
        onClick(this.currentColor);
      });
    }

    scene.add.existing(this);
  }

  setColor(color: number): void {
    this.currentColor = color;
    this.fillRect.setFillStyle(color);
  }

  getColor(): number {
    return this.currentColor;
  }

  setSelected(selected: boolean): void {
    if (this.isSelected === selected) return;
    this.isSelected = selected;
    const theme = getTheme();
    this.borderRect.setStrokeStyle(
      selected ? 3 : 1,
      selected ? theme.colors.accent : theme.colors.panelBorder,
      selected ? 1 : 0.7,
    );
  }
}

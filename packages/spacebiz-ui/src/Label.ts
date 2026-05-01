import * as Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";

export type LabelStyle = "heading" | "body" | "caption" | "value";

export interface LabelConfig {
  x: number;
  y: number;
  text: string;
  style?: LabelStyle;
  color?: number;
  maxWidth?: number;
  glow?: boolean;
}

export class Label extends Phaser.GameObjects.Text {
  constructor(scene: Phaser.Scene, config: LabelConfig) {
    const theme = getTheme();
    const fontConfig = theme.fonts[config.style ?? "body"];
    const color = config.color ?? theme.colors.text;

    super(scene, config.x, config.y, config.text, {
      fontSize: `${fontConfig.size}px`,
      fontFamily: fontConfig.family,
      color: colorToString(color),
      wordWrap: config.maxWidth ? { width: config.maxWidth } : undefined,
    });

    this.setShadow(0, 1, "#000000", 4, true, true);

    if (config.glow) {
      this.setShadow(2, 2, colorToString(theme.colors.accent), 8, true, true);
    }

    scene.add.existing(this);
  }

  /**
   * Resize the label's bounds. Updates the inherited `width`/`height` so
   * Phaser layout machinery sees the new dimensions, and rewires the
   * text's wordWrap width so long strings reflow inside the new bounds.
   *
   * Phaser's underlying `Text` measures its own pixel size from the glyphs;
   * `setSize` does not literally stretch the text. The behaviour we want
   * for a layout-driven Label is "give me a text widget that wraps at this
   * width" — so wrap-width is the load-bearing side effect.
   */
  override setSize(width: number, height: number): this {
    super.setSize(width, height);
    this.setWordWrapWidth(width);
    return this;
  }

  setLabelColor(color: number): this {
    this.setColor(colorToString(color));
    return this;
  }

  setGlow(enabled: boolean): this {
    const theme = getTheme();
    if (enabled) {
      this.setShadow(2, 2, colorToString(theme.colors.accent), 8, true, true);
    } else {
      this.setShadow(0, 0, "transparent", 0, false, false);
    }
    return this;
  }
}

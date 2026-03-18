import Phaser from "phaser";
import { getTheme, colorToString } from "./Theme";

export type LabelStyle = "heading" | "body" | "caption" | "value";

export interface LabelConfig {
  x: number;
  y: number;
  text: string;
  style?: LabelStyle;
  color?: number;
  maxWidth?: number;
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

    scene.add.existing(this);
  }

  setLabelColor(color: number): this {
    this.setColor(colorToString(color));
    return this;
  }
}

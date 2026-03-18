import Phaser from "phaser";
import { getTheme, colorToString } from "./Theme";

export interface ButtonConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.NineSlice;
  private label: Phaser.GameObjects.Text;
  private isDisabled: boolean;
  private onClickFn: () => void;

  constructor(scene: Phaser.Scene, config: ButtonConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();
    const width = config.width ?? theme.button.minWidth;
    const height = config.height ?? theme.button.height;
    this.isDisabled = config.disabled ?? false;
    this.onClickFn = config.onClick;

    const textureKey = this.isDisabled ? "btn-disabled" : "btn-normal";
    this.bg = scene.add
      .nineslice(0, 0, textureKey, undefined, width, height, 4, 4, 4, 4)
      .setOrigin(0, 0);

    const textColor = this.isDisabled
      ? colorToString(theme.colors.textDim)
      : colorToString(theme.colors.text);
    this.label = scene.add
      .text(width / 2, height / 2, config.label, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: textColor,
      })
      .setOrigin(0.5);

    this.add([this.bg, this.label]);

    if (!this.isDisabled) {
      this.setupInteractive();
    }

    scene.add.existing(this);
  }

  private setupInteractive(): void {
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on("pointerover", () => this.setTexture("btn-hover"));
    this.bg.on("pointerout", () => this.setTexture("btn-normal"));
    this.bg.on("pointerdown", () => this.setTexture("btn-pressed"));
    this.bg.on("pointerup", () => {
      this.setTexture("btn-hover");
      this.onClickFn();
    });
  }

  private setTexture(key: string): void {
    this.bg.setTexture(key);
  }

  setDisabled(disabled: boolean): void {
    this.isDisabled = disabled;
    const theme = getTheme();
    if (disabled) {
      this.bg.setTexture("btn-disabled");
      this.bg.removeInteractive();
      this.label.setColor(colorToString(theme.colors.textDim));
    } else {
      this.bg.setTexture("btn-normal");
      this.setupInteractive();
      this.label.setColor(colorToString(theme.colors.text));
    }
  }

  setLabel(text: string): void {
    this.label.setText(text);
  }
}

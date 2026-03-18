import Phaser from "phaser";
import { getTheme, colorToString } from "./Theme";

export interface PanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  draggable?: boolean;
}

export class Panel extends Phaser.GameObjects.Container {
  protected bg: Phaser.GameObjects.NineSlice;
  protected titleBar: Phaser.GameObjects.Container | null = null;
  protected contentY: number;
  protected panelWidth: number;
  protected panelHeight: number;

  constructor(scene: Phaser.Scene, config: PanelConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();
    this.panelWidth = config.width;
    this.panelHeight = config.height;

    // Background
    this.bg = scene.add
      .nineslice(
        0,
        0,
        "panel-bg",
        undefined,
        config.width,
        config.height,
        4,
        4,
        4,
        4,
      )
      .setOrigin(0, 0);
    this.add(this.bg);

    this.contentY = theme.spacing.sm;

    // Title bar
    if (config.title) {
      const titleBg = scene.add
        .rectangle(
          0,
          0,
          config.width,
          theme.panel.titleHeight,
          theme.colors.headerBg,
        )
        .setOrigin(0, 0);

      const titleText = scene.add.text(
        theme.spacing.md,
        theme.spacing.sm,
        config.title,
        {
          fontSize: `${theme.fonts.heading.size}px`,
          fontFamily: theme.fonts.heading.family,
          color: colorToString(theme.colors.accent),
        },
      );

      this.titleBar = scene.add.container(0, 0, [titleBg, titleText]);
      this.add(this.titleBar);
      this.contentY = theme.panel.titleHeight + theme.spacing.sm;
    }

    // Draggable
    if (config.draggable) {
      const hitArea = this.titleBar ?? this.bg;
      (hitArea as Phaser.GameObjects.GameObject).setInteractive({
        draggable: true,
      });
      scene.input.setDraggable(hitArea as Phaser.GameObjects.GameObject);
      hitArea.on(
        "drag",
        (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          this.x += dragX;
          this.y += dragY;
        },
      );
    }

    scene.add.existing(this);
  }

  getContentY(): number {
    return this.contentY;
  }

  getContentArea(): { x: number; y: number; width: number; height: number } {
    const theme = getTheme();
    return {
      x: theme.spacing.sm,
      y: this.contentY,
      width: this.panelWidth - theme.spacing.sm * 2,
      height: this.panelHeight - this.contentY - theme.spacing.sm,
    };
  }
}

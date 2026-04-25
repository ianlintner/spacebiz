import * as Phaser from "phaser";
import { getTheme, colorToString } from "./Theme.ts";

export interface TooltipConfig {
  maxWidth?: number;
  showDelay?: number;
}

export class Tooltip extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private border: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private showDelay: number;
  private delayTimer: Phaser.Time.TimerEvent | null = null;
  private trackedObjects: Map<
    Phaser.GameObjects.GameObject,
    { text: string; moveHandler: (pointer: Phaser.Input.Pointer) => void }
  > = new Map();
  private tooltipMaxWidth: number;

  constructor(scene: Phaser.Scene, config?: TooltipConfig) {
    super(scene, 0, 0);
    const theme = getTheme();

    this.showDelay = config?.showDelay ?? 500;
    this.tooltipMaxWidth = config?.maxWidth ?? 250;

    // Border
    this.border = scene.add
      .rectangle(0, 0, 100, 30, theme.colors.panelBorder)
      .setOrigin(0, 0);
    this.add(this.border);

    // Background
    const bw = 1;
    this.bg = scene.add
      .rectangle(bw, bw, 100 - bw * 2, 30 - bw * 2, theme.colors.panelBg)
      .setOrigin(0, 0);
    this.add(this.bg);

    // Text
    this.label = scene.add
      .text(theme.spacing.sm, theme.spacing.xs, "", {
        fontSize: `${theme.fonts.caption.size}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(theme.colors.text),
        wordWrap: { width: this.tooltipMaxWidth - theme.spacing.sm * 2 },
      })
      .setOrigin(0, 0);
    this.add(this.label);

    this.setVisible(false);
    this.setDepth(2000);

    scene.add.existing(this);
  }

  attachTo(gameObject: Phaser.GameObjects.GameObject, text: string): void {
    // Remove existing handler if already attached
    this.detachFrom(gameObject);

    if (!gameObject.input) {
      gameObject.setInteractive();
    }

    const moveHandler = (pointer: Phaser.Input.Pointer) => {
      this.setPosition(pointer.x + 12, pointer.y + 12);
    };

    this.trackedObjects.set(gameObject, { text, moveHandler });

    gameObject.on("pointerover", (pointer: Phaser.Input.Pointer) => {
      this.delayTimer = this.scene.time.delayedCall(this.showDelay, () => {
        this.showTooltip(text, pointer.x + 12, pointer.y + 12);
      });
      gameObject.on("pointermove", moveHandler);
    });

    gameObject.on("pointerout", () => {
      if (this.delayTimer) {
        this.delayTimer.destroy();
        this.delayTimer = null;
      }
      gameObject.off("pointermove", moveHandler);
      this.setVisible(false);
    });
  }

  detachFrom(gameObject: Phaser.GameObjects.GameObject): void {
    const tracked = this.trackedObjects.get(gameObject);
    if (tracked) {
      gameObject.off("pointerover");
      gameObject.off("pointerout");
      gameObject.off("pointermove", tracked.moveHandler);
      this.trackedObjects.delete(gameObject);
    }
  }

  private showTooltip(text: string, x: number, y: number): void {
    const theme = getTheme();
    this.label.setText(text);

    const padding = theme.spacing.sm;
    const bw = 1;
    const textWidth = Math.min(this.label.width, this.tooltipMaxWidth);
    const totalWidth = textWidth + padding * 2;
    const totalHeight = this.label.height + theme.spacing.xs * 2;

    this.border.setSize(totalWidth, totalHeight);
    this.bg.setPosition(bw, bw);
    this.bg.setSize(totalWidth - bw * 2, totalHeight - bw * 2);

    this.setPosition(x, y);
    this.setVisible(true);
  }

  destroy(fromScene?: boolean): void {
    for (const [gameObject] of this.trackedObjects) {
      gameObject.off("pointerover");
      gameObject.off("pointerout");
    }
    this.trackedObjects.clear();
    super.destroy(fromScene);
  }
}

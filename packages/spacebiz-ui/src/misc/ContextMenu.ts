import * as Phaser from "phaser";
import { getTheme, colorToString } from "../Theme.ts";
import { playUiSfx } from "../UiSound.ts";
import {
  clampMenuPosition,
  type ContextMenuMetrics,
  type ViewportRect,
} from "./contextMenuLogic.ts";

export {
  clampMenuPosition,
  type ContextMenuMetrics,
  type ViewportRect,
} from "./contextMenuLogic.ts";

export interface ContextMenuItem {
  label: string;
  /** Optional icon texture key shown left of the label. */
  icon?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** When true, this entry renders as a thin divider line instead of a button. */
  separator?: boolean;
}

export interface ContextMenuConfig {
  items: ContextMenuItem[];
  /** Item row height in pixels. Default 26. */
  itemHeight?: number;
  /** Separator row height in pixels. Default 9. */
  separatorHeight?: number;
  /** Menu min width in pixels. Default 140. */
  minWidth?: number;
  /** Horizontal padding around labels. Default 12. */
  paddingX?: number;
  /** Top/bottom inner padding. Default 4. */
  paddingY?: number;
  /** Margin to keep from viewport edges. Default 6. */
  edgeMargin?: number;
}

/**
 * Right-click popup menu. Use the static `ContextMenu.attach()` helper to wire
 * up a right-click handler on a target GameObject, or instantiate directly and
 * call `show(x, y)` for custom triggers.
 */
export class ContextMenu extends Phaser.GameObjects.Container {
  private readonly items: ContextMenuItem[];
  private readonly itemHeight: number;
  private readonly separatorHeight: number;
  private readonly minWidth: number;
  private readonly paddingX: number;
  private readonly paddingY: number;
  private readonly edgeMargin: number;
  private bg!: Phaser.GameObjects.Rectangle;
  private outsideHandler: ((pointer: Phaser.Input.Pointer) => void) | null =
    null;
  private metrics: ContextMenuMetrics = { width: 0, height: 0 };

  constructor(scene: Phaser.Scene, config: ContextMenuConfig) {
    super(scene, 0, 0);
    this.items = config.items;
    this.itemHeight = config.itemHeight ?? 26;
    this.separatorHeight = config.separatorHeight ?? 9;
    this.minWidth = config.minWidth ?? 140;
    this.paddingX = config.paddingX ?? 12;
    this.paddingY = config.paddingY ?? 4;
    this.edgeMargin = config.edgeMargin ?? 6;

    this.build();
    this.setVisible(false);
    this.setDepth(3000);
    scene.add.existing(this);
  }

  private build(): void {
    const theme = getTheme();
    const fontSize = theme.fonts.body.size;

    // Measure required width using a temporary text object.
    let maxLabelW = 0;
    for (const item of this.items) {
      if (item.separator) continue;
      const tmp = this.scene.add.text(0, 0, item.label, {
        fontSize: `${fontSize}px`,
        fontFamily: theme.fonts.body.family,
      });
      maxLabelW = Math.max(maxLabelW, tmp.width);
      tmp.destroy();
    }
    const width = Math.max(this.minWidth, maxLabelW + this.paddingX * 2);

    let height = this.paddingY * 2;
    for (const item of this.items) {
      height += item.separator ? this.separatorHeight : this.itemHeight;
    }

    this.metrics = { width, height };
    this.setSize(width, height);

    this.bg = this.scene.add
      .rectangle(0, 0, width, height, theme.colors.panelBg, 0.97)
      .setOrigin(0, 0)
      .setStrokeStyle(1, theme.colors.panelBorder, 0.9);
    this.add(this.bg);

    let y = this.paddingY;
    for (const item of this.items) {
      if (item.separator) {
        const sep = this.scene.add
          .rectangle(
            this.paddingX / 2,
            y + Math.floor(this.separatorHeight / 2),
            width - this.paddingX,
            1,
            theme.colors.panelBorder,
            0.7,
          )
          .setOrigin(0, 0.5);
        this.add(sep);
        y += this.separatorHeight;
        continue;
      }

      const rowBg = this.scene.add
        .rectangle(0, y, width, this.itemHeight, theme.colors.rowHover, 0)
        .setOrigin(0, 0);
      const labelColor = item.disabled
        ? theme.colors.textDim
        : theme.colors.text;
      const text = this.scene.add
        .text(this.paddingX, y + this.itemHeight / 2, item.label, {
          fontSize: `${fontSize}px`,
          fontFamily: theme.fonts.body.family,
          color: colorToString(labelColor),
        })
        .setOrigin(0, 0.5);

      this.add([rowBg, text]);

      if (!item.disabled) {
        rowBg.setInteractive({ useHandCursor: true });
        rowBg.on("pointerover", () => {
          rowBg.setFillStyle(theme.colors.rowHover, 0.9);
          playUiSfx("ui_hover");
        });
        rowBg.on("pointerout", () => {
          rowBg.setFillStyle(theme.colors.rowHover, 0);
        });
        rowBg.on("pointerup", () => {
          playUiSfx("ui_click_primary");
          this.hide();
          item.onClick?.();
        });
      }

      y += this.itemHeight;
    }
  }

  /** Show the menu at a specific pointer/anchor position (in scene coords). */
  show(anchorX: number, anchorY: number): void {
    const cam = this.scene.cameras.main;
    const viewport: ViewportRect = {
      width: cam?.width ?? 0,
      height: cam?.height ?? 0,
    };
    const { x, y } = clampMenuPosition(
      anchorX,
      anchorY,
      this.metrics,
      viewport,
      this.edgeMargin,
    );
    this.setPosition(x, y);
    this.setVisible(true);

    // Dismiss on next outside click.
    if (this.outsideHandler) {
      this.scene.input.off("pointerdown", this.outsideHandler);
    }
    this.outsideHandler = (pointer: Phaser.Input.Pointer) => {
      const within =
        pointer.x >= this.x &&
        pointer.x <= this.x + this.metrics.width &&
        pointer.y >= this.y &&
        pointer.y <= this.y + this.metrics.height;
      if (!within) this.hide();
    };
    // Defer one frame so the triggering click doesn't immediately dismiss.
    this.scene.time.delayedCall(0, () => {
      if (this.outsideHandler && this.visible) {
        this.scene.input.on("pointerdown", this.outsideHandler);
      }
    });
  }

  hide(): void {
    this.setVisible(false);
    if (this.outsideHandler) {
      this.scene.input.off("pointerdown", this.outsideHandler);
      this.outsideHandler = null;
    }
  }

  /** Returns the measured width/height of the menu. */
  getMetrics(): ContextMenuMetrics {
    return { ...this.metrics };
  }

  override destroy(fromScene?: boolean): void {
    if (this.outsideHandler && this.scene) {
      this.scene.input.off("pointerdown", this.outsideHandler);
      this.outsideHandler = null;
    }
    super.destroy(fromScene);
  }

  /**
   * Wire up a right-click handler on the target object that opens a fresh
   * ContextMenu at the pointer position. Returns the menu instance for
   * external control.
   */
  static attach(
    target: Phaser.GameObjects.GameObject,
    items: ContextMenuItem[],
    options?: Omit<ContextMenuConfig, "items">,
  ): ContextMenu {
    const scene = (target as unknown as { scene: Phaser.Scene }).scene;
    const menu = new ContextMenu(scene, { ...options, items });
    if (!target.input) {
      const interactiveTarget = target as unknown as {
        setInteractive: () => void;
      };
      interactiveTarget.setInteractive();
    }
    target.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        menu.show(pointer.x, pointer.y);
      }
    });
    return menu;
  }
}

import * as Phaser from "phaser";
import { getTheme } from "../Theme.ts";
import { Button } from "../Button.ts";
import { IconButton } from "../IconButton.ts";
import { layoutToolbar, type ToolbarLayoutResult } from "./toolbarLogic.ts";

export {
  layoutToolbar,
  type ToolbarLayoutItemSpec,
  type ToolbarLayoutResult,
} from "./toolbarLogic.ts";

export interface ToolbarButtonItem {
  kind: "button";
  label: string;
  onClick: () => void;
  disabled?: boolean;
  width?: number;
}

export interface ToolbarIconItem {
  kind: "icon";
  icon: string;
  label?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}

export type ToolbarItem = ToolbarButtonItem | ToolbarIconItem;

export interface ToolbarGroup {
  items: ToolbarItem[];
}

export interface ToolbarConfig {
  x: number;
  y: number;
  groups: ToolbarGroup[];
  /** Use compact (icon-button-sized) row height. Default false. */
  compact?: boolean;
  /** Pixel gap between adjacent items in a group. Default theme.spacing.sm. */
  itemGap?: number;
  /** Pixel gap between groups (centered around the divider). Default theme.spacing.md. */
  groupGap?: number;
}

/**
 * Horizontal grouped action bar. Renders groups separated by vertical
 * dividers; each item is a Button or IconButton.
 */
export class Toolbar extends Phaser.GameObjects.Container {
  private readonly compact: boolean;
  private readonly itemGap: number;
  private readonly groupGap: number;
  private layoutResult: ToolbarLayoutResult;

  constructor(scene: Phaser.Scene, config: ToolbarConfig) {
    super(scene, config.x, config.y);
    const theme = getTheme();
    this.compact = config.compact ?? false;
    this.itemGap = config.itemGap ?? theme.spacing.sm;
    this.groupGap = config.groupGap ?? theme.spacing.md;

    const rowHeight = this.compact ? 32 : theme.button.height;

    // First pass: build items off-screen so we can measure widths.
    const built: Array<{
      obj: Phaser.GameObjects.GameObject;
      width: number;
      groupIndex: number;
    }> = [];
    const groupWidthArrays: number[][] = config.groups.map(() => []);

    config.groups.forEach((group, gi) => {
      group.items.forEach((item) => {
        if (item.kind === "icon") {
          const btn = new IconButton(scene, {
            x: 0,
            y: 0,
            icon: item.icon,
            label: item.label,
            onClick: item.onClick,
            disabled: item.disabled,
            active: item.active,
            size: rowHeight,
          });
          scene.children.remove(btn);
          const w = item.label
            ? rowHeight + 6 + (this.measureLabel(item.label) ?? 0) + 8
            : rowHeight;
          built.push({ obj: btn, width: w, groupIndex: gi });
          groupWidthArrays[gi].push(w);
        } else {
          const explicitW = item.width;
          const btn = new Button(scene, {
            x: 0,
            y: 0,
            label: item.label,
            onClick: item.onClick,
            disabled: item.disabled,
            ...(explicitW !== undefined
              ? { width: explicitW }
              : { autoWidth: true }),
            height: rowHeight,
          });
          scene.children.remove(btn);
          const w = btn.width;
          built.push({ obj: btn, width: w, groupIndex: gi });
          groupWidthArrays[gi].push(w);
        }
      });
    });

    this.layoutResult = layoutToolbar(
      groupWidthArrays.map((widths) => ({ widths })),
      this.itemGap,
      this.groupGap,
    );

    // Place children using the computed layout.
    this.layoutResult.items.forEach((spec, idx) => {
      const { obj } = built[idx];
      const phaserObj = obj as unknown as { x: number; y: number };
      phaserObj.x = spec.x;
      phaserObj.y = 0;
      this.add(obj);
    });

    // Draw dividers.
    for (const dx of this.layoutResult.dividerXs) {
      const div = scene.add
        .rectangle(
          dx,
          rowHeight / 2,
          1,
          rowHeight - 8,
          theme.colors.panelBorder,
          0.7,
        )
        .setOrigin(0.5);
      this.add(div);
    }

    this.setSize(this.layoutResult.totalWidth, rowHeight);
    scene.add.existing(this);
  }

  private measureLabel(text: string): number | null {
    const theme = getTheme();
    const tmp = this.scene.add.text(0, 0, text, {
      fontSize: `${theme.fonts.caption.size}px`,
      fontFamily: theme.fonts.caption.family,
    });
    const w = tmp.width;
    tmp.destroy();
    return w;
  }

  /** Returns the computed layout (positions + divider Xs) of the rendered bar. */
  getLayout(): ToolbarLayoutResult {
    return {
      items: this.layoutResult.items.map((s) => ({ ...s })),
      dividerXs: [...this.layoutResult.dividerXs],
      totalWidth: this.layoutResult.totalWidth,
    };
  }
}

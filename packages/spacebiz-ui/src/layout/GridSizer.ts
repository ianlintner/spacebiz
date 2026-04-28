import * as Phaser from "phaser";
import { applyChildSize, placeChild, readChildSize } from "./sizerBase.ts";
import { placeGrid, spanSize, trackOffset } from "./gridMath.ts";
import type {
  GridChildOptions,
  HAlign,
  Insets,
  Resizable,
  VAlign,
} from "./types.ts";
import { normalizeInsets } from "./types.ts";
import type { LayoutMetrics } from "../Layout.ts";

export interface GridSizerConfig {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  columns: number;
  rows?: number;
  columnGap?: number;
  rowGap?: number;
  hAlign?: HAlign;
  vAlign?: VAlign;
  padding?: number | Partial<Insets>;
}

interface ChildEntry {
  child: Phaser.GameObjects.GameObject;
  options: GridChildOptions;
}

export class GridSizer
  extends Phaser.GameObjects.Container
  implements Resizable
{
  private columns: number;
  private rows: number | undefined;
  private columnGap: number;
  private rowGap: number;
  private hAlign: HAlign;
  private vAlign: VAlign;
  private padding: Insets;
  private fixedWidth: number | null;
  private fixedHeight: number | null;
  private entries: ChildEntry[] = [];
  private contentWidth = 0;
  private contentHeight = 0;

  constructor(scene: Phaser.Scene, config: GridSizerConfig) {
    super(scene, config.x ?? 0, config.y ?? 0);
    this.columns = Math.max(1, config.columns);
    this.rows = config.rows;
    this.columnGap = config.columnGap ?? 0;
    this.rowGap = config.rowGap ?? 0;
    this.hAlign = config.hAlign ?? "left";
    this.vAlign = config.vAlign ?? "top";
    this.padding = normalizeInsets(config.padding ?? 0);
    this.fixedWidth = config.width ?? null;
    this.fixedHeight = config.height ?? null;
    if (this.fixedWidth !== null && this.fixedHeight !== null) {
      super.setSize(this.fixedWidth, this.fixedHeight);
    }
    scene.add.existing(this);
  }

  add(
    child: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[],
    options?: GridChildOptions,
  ): this {
    const items = Array.isArray(child) ? child : [child];
    for (const item of items) {
      super.add(item);
      this.entries.push({ child: item, options: options ?? {} });
    }
    this.layout();
    return this;
  }

  remove<T extends Phaser.GameObjects.GameObject>(
    child: T | T[],
    destroyChild?: boolean,
  ): this {
    const list = Array.isArray(child) ? child : [child];
    super.remove(child, destroyChild);
    this.entries = this.entries.filter((e) => !list.includes(e.child as T));
    this.layout();
    return this;
  }

  setSize(width: number, height: number): this {
    this.fixedWidth = width;
    this.fixedHeight = height;
    super.setSize(width, height);
    this.layout();
    return this;
  }

  onLayout(_metrics: LayoutMetrics): void {
    this.layout();
  }

  layout(): void {
    const padH = this.padding.left + this.padding.right;
    const padV = this.padding.top + this.padding.bottom;

    const measured = this.entries.map((e) => readChildSize(e.child));
    const result = placeGrid({
      columns: this.columns,
      rows: this.rows,
      columnGap: this.columnGap,
      rowGap: this.rowGap,
      children: this.entries.map((e, i) => ({
        width: measured[i].width,
        height: measured[i].height,
        colspan: e.options.colspan ?? 1,
        rowspan: e.options.rowspan ?? 1,
      })),
    });

    let cols = result.columnWidths.slice();
    let rows = result.rowHeights.slice();

    if (this.fixedWidth !== null) {
      const usable = Math.max(0, this.fixedWidth - padH);
      const natural = result.totalWidth;
      if (natural > 0 && usable !== natural) {
        const ratio = usable / natural;
        cols = cols.map((w) => w * ratio);
      }
    }
    if (this.fixedHeight !== null) {
      const usable = Math.max(0, this.fixedHeight - padV);
      const natural = result.totalHeight;
      if (natural > 0 && usable !== natural) {
        const ratio = usable / natural;
        rows = rows.map((h) => h * ratio);
      }
    }

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const place = result.placements[i];
      const cellX = trackOffset(cols, this.columnGap, place.col);
      const cellY = trackOffset(rows, this.rowGap, place.row);
      const cellW = spanSize(cols, this.columnGap, place.col, place.colspan);
      const cellH = spanSize(rows, this.rowGap, place.row, place.rowspan);

      const hAlign = entry.options.hAlign ?? this.hAlign;
      const vAlign = entry.options.vAlign ?? this.vAlign;

      let drawW = measured[i].width;
      let drawH = measured[i].height;
      let dx = 0;
      let dy = 0;
      if (hAlign === "stretch") {
        drawW = cellW;
      } else if (hAlign === "center") {
        dx = (cellW - drawW) / 2;
      } else if (hAlign === "right") {
        dx = cellW - drawW;
      }
      if (vAlign === "stretch") {
        drawH = cellH;
      } else if (vAlign === "center") {
        dy = (cellH - drawH) / 2;
      } else if (vAlign === "bottom") {
        dy = cellH - drawH;
      }
      if (hAlign === "stretch" || vAlign === "stretch") {
        applyChildSize(entry.child, drawW, drawH);
      }
      placeChild(
        entry.child,
        this.padding.left + cellX + dx,
        this.padding.top + cellY + dy,
      );
    }

    const totalW =
      cols.reduce((a, b) => a + b, 0) +
      this.columnGap * Math.max(0, cols.length - 1);
    const totalH =
      rows.reduce((a, b) => a + b, 0) +
      this.rowGap * Math.max(0, rows.length - 1);
    this.contentWidth = totalW + padH;
    this.contentHeight = totalH + padV;
    if (this.fixedWidth === null || this.fixedHeight === null) {
      super.setSize(
        this.fixedWidth ?? this.contentWidth,
        this.fixedHeight ?? this.contentHeight,
      );
    }
  }

  getContentSize(): { width: number; height: number } {
    return { width: this.contentWidth, height: this.contentHeight };
  }
}

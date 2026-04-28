import * as Phaser from "phaser";
import { computeWrap } from "./wrapMath.ts";
import { placeChild, readChildSize } from "./sizerBase.ts";
import type { Insets, Resizable } from "./types.ts";
import { normalizeInsets } from "./types.ts";
import type { LayoutMetrics } from "../Layout.ts";

export interface FixWidthSizerConfig {
  x?: number;
  y?: number;
  width: number;
  height?: number;
  columnGap?: number;
  rowGap?: number;
  hAlign?: "start" | "center" | "end";
  padding?: number | Partial<Insets>;
}

export class FixWidthSizer
  extends Phaser.GameObjects.Container
  implements Resizable
{
  private fixedWidth: number;
  private fixedHeight: number | null;
  private columnGap: number;
  private rowGap: number;
  private hAlign: "start" | "center" | "end";
  private padding: Insets;
  private entries: Phaser.GameObjects.GameObject[] = [];
  private contentWidth = 0;
  private contentHeight = 0;

  constructor(scene: Phaser.Scene, config: FixWidthSizerConfig) {
    super(scene, config.x ?? 0, config.y ?? 0);
    this.fixedWidth = config.width;
    this.fixedHeight = config.height ?? null;
    this.columnGap = config.columnGap ?? 0;
    this.rowGap = config.rowGap ?? 0;
    this.hAlign = config.hAlign ?? "start";
    this.padding = normalizeInsets(config.padding ?? 0);
    super.setSize(this.fixedWidth, this.fixedHeight ?? 0);
    scene.add.existing(this);
  }

  add(
    child: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[],
  ): this {
    const items = Array.isArray(child) ? child : [child];
    for (const item of items) {
      super.add(item);
      this.entries.push(item);
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
    this.entries = this.entries.filter((c) => !list.includes(c as T));
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
    const measured = this.entries.map((c) => readChildSize(c));
    const result = computeWrap({
      containerWidth: Math.max(0, this.fixedWidth - padH),
      columnGap: this.columnGap,
      rowGap: this.rowGap,
      children: measured,
      hAlign: this.hAlign,
    });

    for (let i = 0; i < this.entries.length; i++) {
      placeChild(
        this.entries[i],
        this.padding.left + result.positions[i].x,
        this.padding.top + result.positions[i].y,
      );
    }

    this.contentWidth = this.fixedWidth;
    this.contentHeight = (this.fixedHeight ?? result.totalHeight) + padV;
    super.setSize(this.fixedWidth, this.contentHeight);
  }

  getContentSize(): { width: number; height: number } {
    return { width: this.contentWidth, height: this.contentHeight };
  }
}

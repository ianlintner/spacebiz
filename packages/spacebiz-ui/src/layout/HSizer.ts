import * as Phaser from "phaser";
import { computeFlex, alignCross } from "./flexMath.ts";
import { applyChildSize, placeChild, readChildSize } from "./sizerBase.ts";
import type {
  Insets,
  Justify,
  Resizable,
  SizerChildOptions,
  VAlign,
} from "./types.ts";
import { normalizeInsets } from "./types.ts";
import type { LayoutMetrics } from "../Layout.ts";

export interface HSizerConfig {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  gap?: number;
  align?: VAlign;
  justify?: Justify;
  padding?: number | Partial<Insets>;
}

interface ChildEntry {
  child: Phaser.GameObjects.GameObject;
  options: SizerChildOptions;
}

export class HSizer extends Phaser.GameObjects.Container implements Resizable {
  private gap: number;
  private align: VAlign;
  private justify: Justify;
  private padding: Insets;
  private fixedWidth: number | null;
  private fixedHeight: number | null;
  private entries: ChildEntry[] = [];
  private contentWidth = 0;
  private contentHeight = 0;

  constructor(scene: Phaser.Scene, config: HSizerConfig = {}) {
    super(scene, config.x ?? 0, config.y ?? 0);
    this.gap = config.gap ?? 0;
    this.align = config.align ?? "top";
    this.justify = config.justify ?? "start";
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
    options?: SizerChildOptions,
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
    const containerW =
      this.fixedWidth !== null
        ? Math.max(0, this.fixedWidth - padH)
        : measured.reduce((a, m) => a + m.width, 0) +
          this.gap * Math.max(0, measured.length - 1);

    const flex = computeFlex({
      containerSize: containerW,
      gap: this.gap,
      justify: this.justify,
      children: this.entries.map((e) => ({
        width: 0,
        height: 0,
        flex: e.options.flex,
      })),
      mainSizes: measured.map((m) => m.width),
    });

    const tallest = measured.reduce((max, m) => Math.max(max, m.height), 0);
    const containerH =
      this.fixedHeight !== null
        ? Math.max(0, this.fixedHeight - padV)
        : tallest;

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const childAlign = (entry.options.align ?? this.align) as
        | "top"
        | "center"
        | "bottom"
        | "stretch";
      const crossAlign =
        childAlign === "top"
          ? "start"
          : childAlign === "bottom"
            ? "end"
            : childAlign;
      const cross = alignCross(measured[i].height, containerH, crossAlign);
      const flexed = (entry.options.flex ?? 0) > 0;
      const stretched = childAlign === "stretch";
      if (flexed || stretched) {
        applyChildSize(
          entry.child,
          flexed ? flex.sizes[i] : measured[i].width,
          stretched ? cross.size : measured[i].height,
        );
      }
      placeChild(
        entry.child,
        this.padding.left + flex.positions[i],
        this.padding.top + cross.offset,
      );
    }

    this.contentWidth = containerW + padH;
    this.contentHeight = containerH + padV;
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

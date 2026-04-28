import * as Phaser from "phaser";
import { computeAnchor } from "./anchorMath.ts";
import { applyChildSize, placeChild, readChildSize } from "./sizerBase.ts";
import type { AnchorFill, AnchorPosition, Insets, Resizable } from "./types.ts";
import { normalizeInsets } from "./types.ts";
import type { LayoutMetrics } from "../Layout.ts";

export interface AnchorConfig {
  to: AnchorPosition;
  offset?: { x?: number; y?: number };
  fill?: AnchorFill;
  insets?: number | Partial<Insets>;
  /** Initial parent size; updated via onLayout / setParentSize. */
  parentWidth?: number;
  parentHeight?: number;
}

/**
 * Pin a single child to a corner/edge/center of a parent box.
 */
export class Anchor extends Phaser.GameObjects.Container implements Resizable {
  private to: AnchorPosition;
  private offset: { x?: number; y?: number };
  private fill: AnchorFill | undefined;
  private insets: Insets;
  private parentWidth: number;
  private parentHeight: number;
  private target: Phaser.GameObjects.GameObject | null = null;

  constructor(scene: Phaser.Scene, config: AnchorConfig) {
    super(scene, 0, 0);
    this.to = config.to;
    this.offset = config.offset ?? {};
    this.fill = config.fill;
    this.insets = normalizeInsets(config.insets ?? 0);
    this.parentWidth = config.parentWidth ?? scene.scale.width;
    this.parentHeight = config.parentHeight ?? scene.scale.height;
    scene.add.existing(this);
  }

  add(
    child: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[],
  ): this {
    const items = Array.isArray(child) ? child : [child];
    for (const item of items) {
      super.add(item);
      this.target = item;
    }
    this.apply();
    return this;
  }

  setParentSize(width: number, height: number): this {
    this.parentWidth = width;
    this.parentHeight = height;
    this.apply();
    return this;
  }

  onLayout(metrics: LayoutMetrics): void {
    this.parentWidth = metrics.gameWidth;
    this.parentHeight = metrics.gameHeight;
    this.apply();
  }

  private apply(): void {
    if (!this.target) return;
    const size = readChildSize(this.target);
    const result = computeAnchor({
      parentWidth: this.parentWidth,
      parentHeight: this.parentHeight,
      childWidth: size.width,
      childHeight: size.height,
      to: this.to,
      offset: this.offset,
      fill: this.fill,
      insets: this.insets,
    });
    if (this.fill) {
      applyChildSize(this.target, result.width, result.height);
    }
    placeChild(this.target, result.x, result.y);
  }
}

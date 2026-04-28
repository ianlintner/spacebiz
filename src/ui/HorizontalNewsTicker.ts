import * as Phaser from "phaser";
import { getTheme, colorToString } from "./index.ts";
import { applyClippingMask } from "@spacebiz/ui";
import type { TickerItem } from "../generation/news/types.ts";
import { CATEGORY_META } from "../generation/news/categories.ts";

const SCROLL_SPEED = 80; // px per second
const ITEM_SEPARATOR = "   •   ";
const FONT_SIZE = 11;

function buildMarqueeString(items: TickerItem[]): string {
  if (items.length === 0)
    return "GALACTIC NEWS NETWORK — Stand by for updates…";
  return items
    .map((item) => {
      const badge = CATEGORY_META[item.category]?.badge ?? "GNN";
      return `[${badge}] ${item.text}`;
    })
    .join(ITEM_SEPARATOR);
}

/**
 * Persistent horizontal news crawl rendered in GameHUDScene's ticker strip.
 * Items scroll right-to-left at a constant speed.
 *
 * `updateItems` does NOT interrupt the in-flight scroll. Incoming items become
 * the "pending" payload — replacing any earlier pending payload that has not
 * yet been shown — and take over only after the current pass completes
 * off-screen. If nothing is pending when a pass ends, the same items re-loop.
 */
export class HorizontalNewsTicker {
  private readonly scene: Phaser.Scene;
  private readonly x: number;
  private readonly y: number;
  private readonly width: number;
  private readonly height: number;

  private maskShape: Phaser.GameObjects.Graphics | null = null;
  private marqueeText: Phaser.GameObjects.Text | null = null;
  private scrollTween: Phaser.Tweens.Tween | null = null;
  private currentItems: TickerItem[] = [];
  private pendingItems: TickerItem[] | null = null;
  private destroyed = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.buildMask();
  }

  private buildMask(): void {
    this.maskShape = this.scene.add.graphics();
    this.maskShape.fillStyle(0xffffff, 1);
    this.maskShape.fillRect(this.x, this.y, this.width, this.height);
    this.maskShape.setVisible(false);
  }

  updateItems(items: TickerItem[]): void {
    if (this.scrollTween) {
      // Currently scrolling — queue this payload, replacing any earlier
      // pending payload that has not yet been displayed.
      this.pendingItems = items;
      return;
    }
    this.currentItems = items;
    this.pendingItems = null;
    this.startScrollPass(items);
  }

  private startScrollPass(items: TickerItem[]): void {
    if (this.destroyed) return;

    const theme = getTheme();
    const text = buildMarqueeString(items);

    // Determine color from first item, fall back to textDim.
    const firstColor =
      items.length > 0
        ? (items[0].color ?? theme.colors.textDim)
        : theme.colors.textDim;

    const textY = this.y + this.height / 2;

    this.marqueeText = this.scene.add.text(this.x + this.width, textY, text, {
      fontSize: `${FONT_SIZE}px`,
      fontFamily: "monospace",
      color: colorToString(firstColor),
    });
    this.marqueeText.setOrigin(0, 0.5);
    this.marqueeText.setDepth(300);

    // Apply mask so text doesn't bleed outside the strip.
    if (this.maskShape) {
      applyClippingMask(this.marqueeText, this.maskShape);
    }

    const textWidth = this.marqueeText.width;
    const totalTravel = this.width + textWidth;
    const duration = (totalTravel / SCROLL_SPEED) * 1000;

    // Single-pass tween from right edge to fully off-screen left. When the
    // pass finishes, drain the pending queue (or re-loop the same items).
    this.scrollTween = this.scene.tweens.add({
      targets: this.marqueeText,
      x: this.x - textWidth,
      duration,
      ease: "Linear",
      onComplete: () => this.onPassComplete(),
    });
  }

  private onPassComplete(): void {
    this.marqueeText?.destroy();
    this.marqueeText = null;
    this.scrollTween = null;
    if (this.destroyed) return;

    const next = this.pendingItems ?? this.currentItems;
    this.pendingItems = null;
    this.currentItems = next;
    this.startScrollPass(next);
  }

  destroy(): void {
    this.destroyed = true;
    this.scrollTween?.stop();
    this.scrollTween = null;
    this.marqueeText?.destroy();
    this.marqueeText = null;
    this.maskShape?.destroy();
    this.maskShape = null;
    this.pendingItems = null;
  }
}

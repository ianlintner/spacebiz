import * as Phaser from "phaser";
import { getTheme, colorToString } from "@spacebiz/ui";
import type { TickerItem } from "../../../../src/generation/news/types.ts";
import { CATEGORY_META } from "../../../../src/generation/news/categories.ts";

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
 * Items scroll right-to-left at a constant speed, cycling continuously.
 *
 * Non-interrupting update model: calling updateItems() while scrolling queues
 * the new items for the next natural cycle boundary. The currently visible
 * text is never reset mid-scroll.
 */
export class HorizontalNewsTicker {
  private readonly scene: Phaser.Scene;
  private x: number;
  private y: number;
  private width: number;
  private height: number;
  private lastItems: TickerItem[] = [];

  /** Items queued to replace lastItems at the next cycle boundary. */
  private scheduledItems: TickerItem[] | null = null;
  private destroyed = false;

  private maskShape: Phaser.GameObjects.Graphics | null = null;
  private marqueeText: Phaser.GameObjects.Text | null = null;
  private scrollTween: Phaser.Tweens.Tween | null = null;

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
    this.maskShape?.destroy();
    this.maskShape = this.scene.add.graphics();
    this.maskShape.fillStyle(0xffffff, 1);
    this.maskShape.fillRect(this.x, this.y, this.width, this.height);
    this.maskShape.setVisible(false);
  }

  /**
   * Resize the ticker viewport in place. Mask + scroll geometry are
   * rebuilt against the new bounds; the most up-to-date content is used.
   */
  setSize(width: number, height: number): this {
    this.width = width;
    this.height = height;
    this.rebuild();
    return this;
  }

  /** Move the ticker strip to a new origin and rebuild mask + scroll. */
  setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
    this.rebuild();
    return this;
  }

  private rebuild(): void {
    this.buildMask();
    if (this.marqueeText || this.lastItems.length > 0) {
      // Position/size changed — must restart with the most current content.
      const items = this.scheduledItems ?? this.lastItems;
      this.scrollTween?.stop();
      this.scrollTween = null;
      this.beginCycle(items);
    }
  }

  /**
   * Supply a new set of ticker items.
   *
   * If the ticker is currently mid-scroll the items are queued and will take
   * effect at the end of the current pass. The visible text is never reset.
   */
  updateItems(items: TickerItem[]): void {
    if (this.scrollTween && this.marqueeText) {
      this.scheduledItems = items;
      return;
    }
    this.beginCycle(items);
  }

  private beginCycle(items: TickerItem[]): void {
    if (this.destroyed) return;

    this.lastItems = items;
    this.scheduledItems = null;

    this.scrollTween?.stop();
    this.scrollTween = null;
    this.marqueeText?.destroy();
    this.marqueeText = null;

    const theme = getTheme();
    const text = buildMarqueeString(items);

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
    // Phaser 4: prefer the filter API; fall back to setMask for Canvas renderer.
    if (this.maskShape) {
      const textWithFilters = this.marqueeText as unknown as {
        filters?: {
          internal: { addMask(shape: Phaser.GameObjects.Graphics): void };
        };
      };
      if (textWithFilters.filters?.internal?.addMask) {
        textWithFilters.filters.internal.addMask(this.maskShape);
      } else {
        this.marqueeText.setMask(this.maskShape.createGeometryMask());
      }
    }

    const textWidth = this.marqueeText.width;
    const totalTravel = this.width + textWidth;
    const duration = (totalTravel / SCROLL_SPEED) * 1000;

    this.scrollTween = this.scene.tweens.add({
      targets: this.marqueeText,
      x: this.x - textWidth,
      duration,
      ease: "Linear",
      onComplete: () => {
        this.scrollTween = null;
        if (this.destroyed) return;
        const nextItems = this.scheduledItems ?? this.lastItems;
        this.beginCycle(nextItems);
      },
    });
  }

  destroy(): void {
    this.destroyed = true;
    this.scrollTween?.stop();
    this.scrollTween = null;
    this.marqueeText?.destroy();
    this.marqueeText = null;
    this.maskShape?.destroy();
    this.maskShape = null;
  }
}

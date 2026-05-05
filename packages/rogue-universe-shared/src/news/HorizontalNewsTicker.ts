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
 * Items scroll right-to-left at a constant speed, looping continuously.
 */
export class HorizontalNewsTicker {
  private readonly scene: Phaser.Scene;
  private x: number;
  private y: number;
  private width: number;
  private height: number;
  private lastItems: TickerItem[] = [];

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
   * rebuilt against the new bounds; existing items keep scrolling.
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
    if (this.lastItems.length > 0 || this.marqueeText) {
      this.updateItems(this.lastItems);
    }
  }

  updateItems(items: TickerItem[]): void {
    this.lastItems = items;
    this.scrollTween?.stop();
    this.scrollTween = null;
    this.marqueeText?.destroy();
    this.marqueeText = null;

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

    // Scroll from right edge to fully off-screen left, then repeat.
    this.scrollTween = this.scene.tweens.add({
      targets: this.marqueeText,
      x: this.x - textWidth,
      duration,
      ease: "Linear",
      repeat: -1,
      onRepeat: () => {
        // Reset to right edge for next cycle.
        if (this.marqueeText) {
          this.marqueeText.setX(this.x + this.width);
        }
      },
    });
  }

  destroy(): void {
    this.scrollTween?.stop();
    this.scrollTween = null;
    this.marqueeText?.destroy();
    this.marqueeText = null;
    this.maskShape?.destroy();
    this.maskShape = null;
  }
}

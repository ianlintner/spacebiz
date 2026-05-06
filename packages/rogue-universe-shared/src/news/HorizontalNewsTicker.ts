import * as Phaser from "phaser";
import { getTheme, colorToString } from "@spacebiz/ui";
import type { TickerItem } from "../../../../src/generation/news/types.ts";
import { CATEGORY_META } from "../../../../src/generation/news/categories.ts";

const SCROLL_SPEED = 80; // px per second
const ITEM_SEPARATOR = "   •   ";
const FONT_SIZE = 11;
const UNDERLINE_HEIGHT = 1;
const UNDERLINE_OFFSET_Y = 2;

export interface ItemOffset {
  item: TickerItem;
  startX: number;
  endX: number;
}

/**
 * Pure function: compute pixel start/end offsets for each item in the marquee.
 * Injected measureText makes this unit-testable without Phaser.
 * Offsets are in text-local space (0 = left edge of the Text object).
 */
export function buildItemOffsets(
  items: TickerItem[],
  measureText: (s: string) => number,
): ItemOffset[] {
  const sep = ITEM_SEPARATOR;
  const sepWidth = measureText(sep);
  const offsets: ItemOffset[] = [];
  let cursor = 0;

  for (let i = 0; i < items.length; i++) {
    const badge = CATEGORY_META[items[i].category]?.badge ?? "GNN";
    const str = `[${badge}] ${items[i].text}`;
    const w = measureText(str);
    offsets.push({ item: items[i], startX: cursor, endX: cursor + w });
    cursor += w;
    if (i < items.length - 1) cursor += sepWidth;
  }

  return offsets;
}

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
 * Items scroll right-to-left at constant speed, cycling continuously.
 * Hovering shows an underline; clicking fires onItemClick.
 */
export class HorizontalNewsTicker {
  private readonly scene: Phaser.Scene;
  private x: number;
  private y: number;
  private width: number;
  private height: number;
  private lastItems: TickerItem[] = [];
  private scheduledItems: TickerItem[] | null = null;
  private destroyed = false;
  private onItemClick: ((item: TickerItem) => void) | null = null;

  private maskShape: Phaser.GameObjects.Graphics | null = null;
  private marqueeText: Phaser.GameObjects.Text | null = null;
  private scrollTween: Phaser.Tweens.Tween | null = null;
  private hitZone: Phaser.GameObjects.Rectangle | null = null;
  private underlineGfx: Phaser.GameObjects.Graphics | null = null;
  private itemOffsets: ItemOffset[] = [];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    opts?: { onItemClick?: (item: TickerItem) => void },
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.onItemClick = opts?.onItemClick ?? null;

    this.buildMask();
    this.buildInteractiveZone();
  }

  private buildMask(): void {
    this.maskShape?.destroy();
    this.maskShape = this.scene.add.graphics();
    this.maskShape.fillStyle(0xffffff, 1);
    this.maskShape.fillRect(this.x, this.y, this.width, this.height);
    this.maskShape.setVisible(false);
  }

  private buildInteractiveZone(): void {
    this.hitZone?.destroy();
    this.underlineGfx?.destroy();

    this.underlineGfx = this.scene.add.graphics();
    this.underlineGfx.setDepth(301);

    this.hitZone = this.scene.add
      .rectangle(
        this.x + this.width / 2,
        this.y + this.height / 2,
        this.width,
        this.height,
      )
      .setAlpha(0.001)
      .setInteractive({ useHandCursor: true })
      .setDepth(302);

    this.hitZone.on(
      "pointermove",
      (pointer: Phaser.Input.Pointer) => {
        this.handlePointerMove(pointer);
      },
    );

    this.hitZone.on("pointerout", () => {
      this.clearUnderline();
    });

    this.hitZone.on(
      "pointerdown",
      (pointer: Phaser.Input.Pointer) => {
        const found = this.findItemAtPointer(pointer);
        if (found && this.onItemClick) this.onItemClick(found.item);
      },
    );
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.marqueeText || !this.underlineGfx) return;
    this.clearUnderline();
    const found = this.findItemAtPointer(pointer);
    if (!found) return;

    const screenX = found.startX + this.marqueeText.x;
    const itemW = found.endX - found.startX;
    if (screenX + itemW < this.x || screenX > this.x + this.width) return;

    const theme = getTheme();
    this.underlineGfx.fillStyle(theme.colors.accent, 0.8);
    this.underlineGfx.fillRect(
      screenX,
      this.y + this.height - UNDERLINE_OFFSET_Y - UNDERLINE_HEIGHT,
      itemW,
      UNDERLINE_HEIGHT,
    );
  }

  private findItemAtPointer(pointer: Phaser.Input.Pointer): ItemOffset | null {
    if (!this.marqueeText) return null;
    const textLocalX = pointer.x - this.marqueeText.x;
    return (
      this.itemOffsets.find(
        (o) => textLocalX >= o.startX && textLocalX < o.endX,
      ) ?? null
    );
  }

  private clearUnderline(): void {
    this.underlineGfx?.clear();
  }

  setOnItemClick(cb: (item: TickerItem) => void): this {
    this.onItemClick = cb;
    return this;
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
    this.buildInteractiveZone();
    if (this.marqueeText || this.lastItems.length > 0) {
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
    this.clearUnderline();

    const theme = getTheme();
    const text = buildMarqueeString(items);
    const textStyle = {
      fontSize: `${FONT_SIZE}px`,
      fontFamily: "monospace",
      color: colorToString(
        items.length > 0
          ? (items[0].color ?? theme.colors.textDim)
          : theme.colors.textDim,
      ),
    };

    const textY = this.y + this.height / 2;

    this.marqueeText = this.scene.add.text(
      this.x + this.width,
      textY,
      text,
      textStyle,
    );
    this.marqueeText.setOrigin(0, 0.5);
    this.marqueeText.setDepth(300);

    // Compute per-item pixel offsets using temp off-screen Text for accurate measurement.
    this.itemOffsets = buildItemOffsets(items, (s: string) => {
      const tmp = this.scene.add.text(-9999, -9999, s, textStyle);
      const w = tmp.width;
      tmp.destroy();
      return w;
    });

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
    this.hitZone?.destroy();
    this.hitZone = null;
    this.underlineGfx?.destroy();
    this.underlineGfx = null;
  }
}

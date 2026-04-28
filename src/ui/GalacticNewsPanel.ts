import * as Phaser from "phaser";
import { Panel, getTheme, colorToString } from "./index.ts";
import { applyClippingMask } from "@spacebiz/ui";
import type { TickerItem } from "../generation/news/types.ts";
import { CATEGORY_META } from "../generation/news/categories.ts";

export interface GalacticNewsPanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  items: TickerItem[];
  /** Auto-scroll cycle in ms (full loop). Default 12000. Set 0 to disable. */
  scrollDuration?: number;
}

/**
 * Panel that displays a feed of ticker items as scrolling lines.
 *
 * Each line: `[BADGE] headline` where the badge is colored by category and the
 * headline color is taken from the item (override) or category tone.
 *
 * The list auto-scrolls vertically when content exceeds visible area, looping
 * cleanly. Hover pauses scrolling so the player can read.
 */
export class GalacticNewsPanel extends Panel {
  private inner: Phaser.GameObjects.Container;
  private maskShape: Phaser.GameObjects.Graphics | null = null;
  private scrollTween: Phaser.Tweens.Tween | null = null;
  private isHovered = false;

  constructor(scene: Phaser.Scene, config: GalacticNewsPanelConfig) {
    super(scene, {
      x: config.x,
      y: config.y,
      width: config.width,
      height: config.height,
      title: "GALACTIC NEWS NETWORK",
    });

    const theme = getTheme();
    const content = this.getContentArea();

    // Inner container holds the rendered lines; we tween its y to scroll.
    this.inner = scene.add.container(content.x, content.y);
    this.add(this.inner);

    // Mask shape — clips inner to the content area in world coords.
    const maskShape = scene.add.graphics();
    maskShape.fillStyle(0xffffff, 1);
    maskShape.fillRect(
      config.x + content.x,
      config.y + content.y,
      content.width,
      content.height,
    );
    maskShape.setVisible(false);
    this.maskShape = maskShape;

    applyClippingMask(this.inner, maskShape);

    // Render the lines stacked vertically.
    const lineHeight = theme.fonts.body.size + 6;
    let y = 0;
    for (const item of config.items) {
      const meta = CATEGORY_META[item.category];
      const tone = item.color ?? toneToColor(meta.toneColor);

      const badge = scene.add.text(0, y, `[${meta.badge}]`, {
        fontSize: `${theme.fonts.caption.size}px`,
        fontFamily: theme.fonts.caption.family,
        color: colorToString(badgeColor(item.category)),
      });

      const headline = scene.add.text(56, y, item.text, {
        fontSize: `${theme.fonts.body.size}px`,
        fontFamily: theme.fonts.body.family,
        color: colorToString(tone),
        wordWrap: { width: content.width - 64, useAdvancedWrap: true },
      });

      this.inner.add([badge, headline]);

      // Advance y by the height of the wrapped headline (>= one line).
      const used = Math.max(lineHeight, headline.height + 4);
      y += used;
    }

    // Auto-scroll loop if content exceeds the viewport.
    const totalHeight = y;
    if (totalHeight > content.height && (config.scrollDuration ?? 12000) > 0) {
      this.startAutoScroll(
        totalHeight,
        content.height,
        config.scrollDuration ?? 12000,
      );
    }

    // Hover pause: register interactive zone over the panel area.
    const hitZone = scene.add
      .zone(content.x, content.y, content.width, content.height)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: false });
    hitZone.on("pointerover", () => {
      this.isHovered = true;
      this.scrollTween?.pause();
    });
    hitZone.on("pointerout", () => {
      this.isHovered = false;
      this.scrollTween?.resume();
    });
    this.add(hitZone);

    // Cleanup on scene shutdown.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    scene.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanup());
  }

  private startAutoScroll(
    totalHeight: number,
    viewHeight: number,
    duration: number,
  ): void {
    const distance = totalHeight - viewHeight;
    if (distance <= 0) return;
    const startY = this.inner.y;
    this.scrollTween = this.scene.tweens.add({
      targets: this.inner,
      y: startY - distance,
      duration,
      yoyo: true,
      repeat: -1,
      ease: "Linear",
      hold: 1500,
      repeatDelay: 1500,
    });
    if (this.isHovered) this.scrollTween.pause();
  }

  private cleanup(): void {
    this.scrollTween?.stop();
    this.scrollTween = null;
    this.maskShape?.destroy();
    this.maskShape = null;
  }
}

function toneToColor(
  tone: "accent" | "profit" | "loss" | "warning" | "text" | "textDim",
): number {
  const c = getTheme().colors;
  switch (tone) {
    case "accent":
      return c.accent;
    case "profit":
      return c.profit;
    case "loss":
      return c.loss;
    case "warning":
      return c.warning;
    case "textDim":
      return c.textDim;
    default:
      return c.text;
  }
}

function badgeColor(category: TickerItem["category"]): number {
  const c = getTheme().colors;
  switch (category) {
    case "headline":
      return c.accent;
    case "leader":
      return c.warning;
    case "stock":
      return c.text;
    default:
      return c.textDim;
  }
}

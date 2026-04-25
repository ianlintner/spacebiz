/**
 * FloatingText — dopamine-hit popup numbers and short messages.
 *
 * Usage:
 *   new FloatingText(scene, x, y, "+§1,500", 0x00ff88);
 *   new FloatingText(scene, x, y, "-§240", 0xff4444, { size: "large" });
 *
 * The object self-destructs after the animation completes; no cleanup needed.
 */
import * as Phaser from "phaser";
import { getTheme } from "./Theme.ts";

export interface FloatingTextConfig {
  /** "small" | "medium" | "large" | "huge" — controls font size */
  size?: "small" | "medium" | "large" | "huge";
  /** If true, the text bobs up then scales down instead of just drifting. */
  bounce?: boolean;
  /** Rise height in pixels. Default 60. */
  riseDistance?: number;
  /** Total animation duration in ms. Default 1200. */
  duration?: number;
  /** Horizontal drift (signed pixels). Default 0. */
  driftX?: number;
}

const SIZE_MAP = {
  small: 14,
  medium: 20,
  large: 28,
  huge: 42,
};

export class FloatingText {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    color: number,
    config: FloatingTextConfig = {},
  ) {
    const theme = getTheme();
    const sizeKey = config.size ?? "medium";
    const fontSize = SIZE_MAP[sizeKey];
    const riseDistance = config.riseDistance ?? 60;
    const duration = config.duration ?? 1200;
    const driftX = config.driftX ?? 0;
    const bounce = config.bounce ?? true;

    const colorHex = "#" + color.toString(16).padStart(6, "0");

    const txt = scene.add
      .text(x, y, text, {
        fontSize: `${fontSize}px`,
        fontFamily: theme.fonts.value.family,
        fontStyle: "bold",
        color: colorHex,
        stroke: "#000000",
        strokeThickness: Math.max(2, fontSize / 8),
      })
      .setOrigin(0.5, 0.5)
      .setDepth(1000)
      .setAlpha(0);

    // Phase 1: pop in (quick scale + fade in)
    const popDuration = Math.min(180, duration * 0.15);
    scene.tweens.add({
      targets: txt,
      scaleX: bounce ? 1.35 : 1.1,
      scaleY: bounce ? 1.35 : 1.1,
      alpha: 1,
      duration: popDuration,
      ease: "Back.easeOut",
      onComplete: () => {
        // Phase 2: settle scale + rise + fade
        scene.tweens.add({
          targets: txt,
          scaleX: 1,
          scaleY: 1,
          x: x + driftX,
          y: y - riseDistance,
          alpha: 0,
          duration: duration - popDuration,
          ease: "Cubic.easeOut",
          onComplete: () => {
            txt.destroy();
          },
        });
      },
    });
  }
}

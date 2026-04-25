/**
 * TextMetrics — shared text measurement utilities for @spacebiz/ui.
 *
 * All functions create a temporary off-screen Phaser.Text, measure it,
 * then destroy it immediately so there is zero rendering cost.
 */
import * as Phaser from "phaser";

export interface TextSize {
  width: number;
  height: number;
}

/**
 * Measure the rendered pixel size of a string at the given font settings.
 * Safe to call at any point after scene creation.
 */
export function measureText(
  scene: Phaser.Scene,
  text: string,
  fontFamily: string,
  fontSize: number,
): TextSize {
  const probe = scene.add.text(-9999, -9999, text, {
    fontFamily,
    fontSize: `${fontSize}px`,
  });
  const result: TextSize = { width: probe.width, height: probe.height };
  probe.destroy();
  return result;
}

/**
 * Truncate `text` so it fits within `maxWidth` pixels, appending `…` if needed.
 * Returns the original string unchanged if it already fits.
 */
export function fitTextWithEllipsis(
  scene: Phaser.Scene,
  text: string,
  maxWidth: number,
  fontFamily: string,
  fontSize: number,
): string {
  if (measureText(scene, text, fontFamily, fontSize).width <= maxWidth) {
    return text;
  }
  const ellipsis = "…";
  let truncated = text;
  while (
    truncated.length > 0 &&
    measureText(scene, truncated + ellipsis, fontFamily, fontSize).width >
      maxWidth
  ) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + ellipsis;
}

/**
 * Compute the ideal button width from its label text, measured precisely.
 * Adds `paddingX` of padding on each side (default: 20px per side = 40 total).
 * The result is clamped to `minWidth`.
 */
export function autoButtonWidth(
  scene: Phaser.Scene,
  label: string,
  fontFamily: string,
  fontSize: number,
  minWidth: number,
  paddingX = 20,
): number {
  const measured = measureText(scene, label, fontFamily, fontSize);
  return Math.max(minWidth, measured.width + paddingX * 2);
}

/**
 * Pick the largest font size from `candidates` (descending order preferred)
 * such that the text fits within `maxWidth`.
 * Falls back to the smallest candidate if nothing fits.
 */
export function fitFontSize(
  scene: Phaser.Scene,
  text: string,
  fontFamily: string,
  maxWidth: number,
  candidates: number[],
): number {
  for (const size of candidates) {
    if (measureText(scene, text, fontFamily, size).width <= maxWidth) {
      return size;
    }
  }
  return candidates[candidates.length - 1];
}

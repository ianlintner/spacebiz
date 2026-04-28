/**
 * Pure positioning math for ContextMenu, factored into its own module so
 * unit tests can import it without pulling in Phaser.
 */

export interface ContextMenuMetrics {
  width: number;
  height: number;
}

export interface ViewportRect {
  width: number;
  height: number;
}

/**
 * Given a desired anchor point (e.g. the click position) and the menu's
 * measured size, return a top-left position that keeps the menu inside the
 * viewport. Auto-flips to the left if it would overflow the right edge, and
 * upward if it would overflow the bottom; then clamps to the edge margin
 * for any residual overflow (e.g. menu larger than viewport).
 */
export function clampMenuPosition(
  anchorX: number,
  anchorY: number,
  metrics: ContextMenuMetrics,
  viewport: ViewportRect,
  edgeMargin = 6,
): { x: number; y: number } {
  let x = anchorX;
  let y = anchorY;
  if (x + metrics.width + edgeMargin > viewport.width) {
    x = anchorX - metrics.width;
  }
  if (y + metrics.height + edgeMargin > viewport.height) {
    y = anchorY - metrics.height;
  }
  x = Math.max(
    edgeMargin,
    Math.min(x, viewport.width - metrics.width - edgeMargin),
  );
  y = Math.max(
    edgeMargin,
    Math.min(y, viewport.height - metrics.height - edgeMargin),
  );
  return { x, y };
}

import { describe, it, expect } from "vitest";
import { clampMenuPosition } from "../contextMenuLogic.ts";

const viewport = { width: 800, height: 600 };
const metrics = { width: 160, height: 120 };

describe("ContextMenu positioning math", () => {
  it("keeps the menu at the anchor when there is room", () => {
    const { x, y } = clampMenuPosition(100, 100, metrics, viewport);
    expect(x).toBe(100);
    expect(y).toBe(100);
  });

  it("flips left when the menu would overflow the right edge", () => {
    const anchorX = 750;
    const { x } = clampMenuPosition(anchorX, 100, metrics, viewport);
    expect(x).toBe(anchorX - metrics.width);
  });

  it("flips up when the menu would overflow the bottom edge", () => {
    const anchorY = 580;
    const { y } = clampMenuPosition(100, anchorY, metrics, viewport);
    expect(y).toBe(anchorY - metrics.height);
  });

  it("flips both axes when in the bottom-right corner", () => {
    const { x, y } = clampMenuPosition(790, 590, metrics, viewport);
    expect(x).toBe(790 - metrics.width);
    expect(y).toBe(590 - metrics.height);
  });

  it("clamps to the edge margin when the flipped position is still off-screen", () => {
    const tinyViewport = { width: 100, height: 100 };
    const big = { width: 80, height: 80 };
    const { x, y } = clampMenuPosition(95, 95, big, tinyViewport, 6);
    expect(x).toBeGreaterThanOrEqual(6);
    expect(y).toBeGreaterThanOrEqual(6);
    expect(x + big.width).toBeLessThanOrEqual(tinyViewport.width - 6);
    expect(y + big.height).toBeLessThanOrEqual(tinyViewport.height - 6);
  });

  it("respects a custom edge margin", () => {
    const { x } = clampMenuPosition(0, 0, metrics, viewport, 20);
    expect(x).toBe(20);
  });
});

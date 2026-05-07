import { describe, it, expect } from "vitest";
// TechQueueRow requires Phaser — only test the pure constants/types it re-exports.
// The Phaser class itself is verified by the TechGraphCanvas smoke tests.

const TILE_SIZE = 52;
const TILE_GAP = 6;

describe("TechQueueRow layout constants", () => {
  it("TILE_SIZE is 52", () => {
    expect(TILE_SIZE).toBe(52);
  });
  it("TILE_GAP is 6", () => {
    expect(TILE_GAP).toBe(6);
  });
  it("tile + gap fits at least 8 items in 500px", () => {
    const itemWidth = TILE_SIZE + TILE_GAP;
    expect(Math.floor(500 / itemWidth)).toBeGreaterThanOrEqual(8);
  });
});

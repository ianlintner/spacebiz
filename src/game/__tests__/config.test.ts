import { describe, it, expect } from "vitest";
import {
  calculateGameSize,
  BASE_HEIGHT,
  MIN_WIDTH,
  MAX_WIDTH,
} from "../calculateGameSize.ts";

describe("calculateGameSize", () => {
  describe("landscape (ratio >= 1)", () => {
    it("locks height to BASE_HEIGHT and scales width with the ratio", () => {
      const size = calculateGameSize(1920, 1080);
      expect(size.height).toBe(BASE_HEIGHT);
      // width ≈ 720 * (1920/1080) = 1280
      expect(size.width).toBe(Math.round(BASE_HEIGHT * (1920 / 1080)));
    });

    it("clamps width to MIN_WIDTH on near-square viewports", () => {
      // 720x720 ratio is 1.0 → width = 720, but clamped to MIN_WIDTH (960)
      const size = calculateGameSize(720, 720);
      expect(size.width).toBe(MIN_WIDTH);
      expect(size.height).toBe(BASE_HEIGHT);
    });

    it("clamps width to MAX_WIDTH on ultra-wide viewports", () => {
      const size = calculateGameSize(5120, 720); // ultra-wide ratio
      expect(size.width).toBe(MAX_WIDTH);
      expect(size.height).toBe(BASE_HEIGHT);
    });

    // 16" MacBook Pro effective viewport — the new MAX_WIDTH cap of 2400
    // should easily accommodate this without clamping.
    it("scales width proportionally for the 16-inch MacBook viewport", () => {
      const size = calculateGameSize(1728, 1117);
      expect(size.height).toBe(BASE_HEIGHT);
      const expected = Math.round(BASE_HEIGHT * (1728 / 1117));
      expect(size.width).toBe(expected);
      expect(size.width).toBeLessThan(MAX_WIDTH);
    });

    // External 4K panel (16:9) — width comes out at 720 * 16/9 = 1280, well
    // under the new cap. MAX_WIDTH only activates for ultra-wide aspects.
    it("returns a 1280-wide canvas for a 2560x1440 16:9 panel", () => {
      const size = calculateGameSize(2560, 1440);
      expect(size.height).toBe(BASE_HEIGHT);
      expect(size.width).toBe(Math.round(BASE_HEIGHT * (2560 / 1440)));
      expect(size.width).toBeLessThan(MAX_WIDTH);
    });

    // MAX_WIDTH was bumped from 1920 to 2400 — confirm the new ceiling is
    // exposed and that an ultra-wide aspect ratio that previously clamped to
    // 1920 now resolves higher.
    it("uses the bumped MAX_WIDTH ceiling on ultra-wide aspects", () => {
      expect(MAX_WIDTH).toBe(2400);
      // 720 * (3.4) = 2448, which is between the old (1920) and new (2400) caps.
      const size = calculateGameSize(3440, 1000);
      expect(size.width).toBe(MAX_WIDTH);
    });

    it("is stable when called twice with the same inputs", () => {
      const a = calculateGameSize(1440, 900);
      const b = calculateGameSize(1440, 900);
      expect(a).toEqual(b);
    });

    // Regression for the resize feedback loop: when the source width is
    // already at MAX_WIDTH, sub-pixel changes in either axis must collapse
    // to the same clamped output. Otherwise the main.ts dedupe can't break
    // the loop on ultra-wide displays.
    it("collapses to the same size when the result is clamped to MAX_WIDTH", () => {
      const a = calculateGameSize(5120, 720);
      const b = calculateGameSize(5121, 720);
      expect(a).toEqual(b);
      expect(a.width).toBe(MAX_WIDTH);
    });
  });

  describe("portrait (ratio < 1)", () => {
    it("locks width to MIN_WIDTH and scales height inversely", () => {
      const size = calculateGameSize(600, 1200); // ratio 0.5
      expect(size.width).toBe(MIN_WIDTH);
      // height = MIN_WIDTH / ratio = 960 / 0.5 = 1920, capped at 1600
      expect(size.height).toBe(1600);
    });

    it("respects the 1600px portrait cap", () => {
      const size = calculateGameSize(360, 800);
      expect(size.height).toBeLessThanOrEqual(1600);
    });
  });

  describe("defensive defaults", () => {
    it("falls back to safe values for zero or negative inputs", () => {
      const size = calculateGameSize(0, 0);
      expect(size.width).toBeGreaterThan(0);
      expect(size.height).toBeGreaterThan(0);
    });
  });
});

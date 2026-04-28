import { describe, it, expect, vi } from "vitest";
import type * as Phaser from "phaser";

// Phaser's runtime touches `window` on import. Stub it out — these tests only
// need the Phaser TYPES; the source files do `import * as Phaser from "phaser"`
// for nothing more than scene typing in the public API.
vi.mock("phaser", () => ({}));

import {
  measureText,
  fitTextWithEllipsis,
  fitFontSize,
  autoButtonWidth,
} from "../../TextMetrics.ts";

/**
 * `scene.add.text()` returns a Text-shaped probe whose `.width` is computed
 * from a heuristic (chars × fontSize × 0.6) so tests can reason about layout
 * without a real renderer. `.destroy()` increments `destroyCount`.
 */
function makeMockScene(): {
  scene: Phaser.Scene;
  destroyCount: { value: number };
} {
  const destroyCount = { value: 0 };

  const scene = {
    add: {
      text: (
        _x: number,
        _y: number,
        text: string,
        style: { fontFamily: string; fontSize: string },
      ) => {
        const sizePx = Number.parseInt(style.fontSize, 10);
        return {
          width: text.length * sizePx * 0.6,
          height: sizePx * 1.2,
          destroy: () => {
            destroyCount.value += 1;
          },
        };
      },
    },
  } as unknown as Phaser.Scene;

  return { scene, destroyCount };
}

describe("TextMetrics", () => {
  describe("measureText", () => {
    it("returns the heuristic width and height", () => {
      const { scene } = makeMockScene();
      const size = measureText(scene, "ABCD", "monospace", 16);
      // 4 chars × 16 × 0.6 = 38.4
      expect(size.width).toBeCloseTo(4 * 16 * 0.6);
      expect(size.height).toBeCloseTo(16 * 1.2);
    });

    it("destroys the probe Text after measuring", () => {
      const { scene, destroyCount } = makeMockScene();
      measureText(scene, "hi", "monospace", 16);
      expect(destroyCount.value).toBe(1);
    });
  });

  describe("fitTextWithEllipsis", () => {
    it("returns the original string when it already fits", () => {
      const { scene } = makeMockScene();
      // "ABC" at fontSize=10 = 18px; maxWidth=200 fits easily.
      const result = fitTextWithEllipsis(scene, "ABC", 200, "monospace", 10);
      expect(result).toBe("ABC");
    });

    it("truncates with ellipsis when text overflows", () => {
      const { scene } = makeMockScene();
      // Long string at fontSize=10 forced into a tiny maxWidth.
      const result = fitTextWithEllipsis(
        scene,
        "ABCDEFGHIJKLMNOP",
        30,
        "monospace",
        10,
      );
      expect(result.endsWith("…")).toBe(true);
      expect(result.length).toBeLessThan("ABCDEFGHIJKLMNOP".length + 1);
    });

    it("collapses to just the ellipsis when nothing fits", () => {
      const { scene } = makeMockScene();
      const result = fitTextWithEllipsis(scene, "XXXX", 1, "monospace", 100);
      expect(result).toBe("…");
    });
  });

  describe("autoButtonWidth", () => {
    it("returns minWidth when label is short", () => {
      const { scene } = makeMockScene();
      // "OK" at 16px = ~19.2 px, +40 padding = ~59. minWidth=200 wins.
      expect(autoButtonWidth(scene, "OK", "monospace", 16, 200)).toBe(200);
    });

    it("expands beyond minWidth for long labels", () => {
      const { scene } = makeMockScene();
      const longLabel = "A very long button label";
      const result = autoButtonWidth(scene, longLabel, "monospace", 16, 80);
      // 24 chars × 16 × 0.6 = 230.4 + 40 padding = 270.4 > 80.
      expect(result).toBeGreaterThan(80);
      expect(result).toBeCloseTo(longLabel.length * 16 * 0.6 + 40);
    });

    it("respects custom paddingX", () => {
      const { scene } = makeMockScene();
      const r1 = autoButtonWidth(scene, "AAAA", "monospace", 10, 0, 0);
      const r2 = autoButtonWidth(scene, "AAAA", "monospace", 10, 0, 50);
      expect(r2 - r1).toBe(100);
    });
  });

  describe("fitFontSize", () => {
    it("picks the largest candidate that fits", () => {
      const { scene } = makeMockScene();
      // "ABC" widths: 18@10, 27@15, 36@20, 54@30
      // maxWidth=30 should select 15.
      const size = fitFontSize(scene, "ABC", "monospace", 30, [30, 20, 15, 10]);
      expect(size).toBe(15);
    });

    it("falls back to the smallest candidate when none fit", () => {
      const { scene } = makeMockScene();
      const size = fitFontSize(
        scene,
        "VERY LONG LABEL",
        "monospace",
        5,
        [40, 30, 20],
      );
      expect(size).toBe(20);
    });
  });
});

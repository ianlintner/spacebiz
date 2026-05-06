import { describe, it, expect } from "vitest";
import { buildItemOffsets } from "../HorizontalNewsTicker.ts";
import type { TickerItem } from "../../../../../src/generation/news/types.ts";

// Simple mock: returns string.length * 10 (simulates 10px-per-char monospace)
const measure = (s: string): number => s.length * 10;

describe("buildItemOffsets", () => {
  const items: TickerItem[] = [
    { category: "headline", text: "News one", priority: 100 },
    { category: "stock", text: "MKT up", priority: 60 },
  ];

  it("first item starts at 0", () => {
    const offsets = buildItemOffsets(items, measure);
    expect(offsets[0].startX).toBe(0);
  });

  it("first item endX equals measured width of '[TOP] News one'", () => {
    const offsets = buildItemOffsets(items, measure);
    const expected = measure("[TOP] News one");
    expect(offsets[0].endX).toBe(expected);
  });

  it("second item starts after first item + separator", () => {
    const offsets = buildItemOffsets(items, measure);
    const sep = "   •   ";
    const firstWidth = measure("[TOP] News one");
    const sepWidth = measure(sep);
    expect(offsets[1].startX).toBe(firstWidth + sepWidth);
  });

  it("preserves item reference", () => {
    const offsets = buildItemOffsets(items, measure);
    expect(offsets[0].item).toBe(items[0]);
    expect(offsets[1].item).toBe(items[1]);
  });

  it("empty items returns empty array", () => {
    expect(buildItemOffsets([], measure)).toHaveLength(0);
  });
});

import { describe, it, expect } from "vitest";
import { layoutToolbar } from "../toolbarLogic.ts";

describe("Toolbar layout", () => {
  it("packs items in a single group with itemGap between them", () => {
    const r = layoutToolbar([{ widths: [40, 60, 80] }], 8, 16);
    expect(r.dividerXs).toEqual([]);
    expect(r.items.map((i) => i.x)).toEqual([0, 48, 116]);
    expect(r.totalWidth).toBe(0 + 40 + 8 + 60 + 8 + 80);
  });

  it("inserts a divider between groups, centered in the groupGap", () => {
    const r = layoutToolbar([{ widths: [40] }, { widths: [40] }], 8, 16);
    expect(r.items.map((i) => i.x)).toEqual([0, 56]);
    expect(r.dividerXs).toEqual([48]);
    expect(r.totalWidth).toBe(40 + 16 + 40);
  });

  it("tags each item with the correct group index", () => {
    const r = layoutToolbar(
      [{ widths: [10, 20] }, { widths: [30] }, { widths: [40, 50] }],
      4,
      12,
    );
    expect(r.items.map((i) => i.groupIndex)).toEqual([0, 0, 1, 2, 2]);
    expect(r.dividerXs.length).toBe(2);
  });

  it("produces an empty layout for empty groups", () => {
    const r = layoutToolbar([], 8, 16);
    expect(r.items).toEqual([]);
    expect(r.dividerXs).toEqual([]);
    expect(r.totalWidth).toBe(0);
  });

  it("handles a group with a single item without an extra leading gap", () => {
    const r = layoutToolbar([{ widths: [40] }], 8, 16);
    expect(r.items[0].x).toBe(0);
    expect(r.totalWidth).toBe(40);
  });
});

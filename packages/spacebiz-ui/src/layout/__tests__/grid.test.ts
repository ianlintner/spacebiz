import { describe, it, expect } from "vitest";
import { placeGrid, spanSize, trackOffset } from "../gridMath.ts";

describe("placeGrid", () => {
  it("packs children left-to-right, top-to-bottom", () => {
    const r = placeGrid({
      columns: 3,
      columnGap: 0,
      rowGap: 0,
      children: [
        { width: 10, height: 10, colspan: 1, rowspan: 1 },
        { width: 10, height: 10, colspan: 1, rowspan: 1 },
        { width: 10, height: 10, colspan: 1, rowspan: 1 },
        { width: 10, height: 10, colspan: 1, rowspan: 1 },
      ],
    });
    expect(r.placements[0]).toEqual({ col: 0, row: 0, colspan: 1, rowspan: 1 });
    expect(r.placements[2]).toEqual({ col: 2, row: 0, colspan: 1, rowspan: 1 });
    expect(r.placements[3]).toEqual({ col: 0, row: 1, colspan: 1, rowspan: 1 });
  });

  it("respects colspan and skips occupied cells", () => {
    const r = placeGrid({
      columns: 3,
      columnGap: 0,
      rowGap: 0,
      children: [
        { width: 20, height: 10, colspan: 2, rowspan: 1 },
        { width: 10, height: 10, colspan: 1, rowspan: 1 },
        { width: 10, height: 10, colspan: 1, rowspan: 1 },
      ],
    });
    expect(r.placements[0]).toEqual({ col: 0, row: 0, colspan: 2, rowspan: 1 });
    expect(r.placements[1]).toEqual({ col: 2, row: 0, colspan: 1, rowspan: 1 });
    expect(r.placements[2]).toEqual({ col: 0, row: 1, colspan: 1, rowspan: 1 });
  });

  it("respects rowspan", () => {
    const r = placeGrid({
      columns: 2,
      columnGap: 0,
      rowGap: 0,
      children: [
        { width: 10, height: 30, colspan: 1, rowspan: 2 },
        { width: 10, height: 10, colspan: 1, rowspan: 1 },
        { width: 10, height: 10, colspan: 1, rowspan: 1 },
      ],
    });
    expect(r.placements[0]).toEqual({ col: 0, row: 0, colspan: 1, rowspan: 2 });
    expect(r.placements[1]).toEqual({ col: 1, row: 0, colspan: 1, rowspan: 1 });
    expect(r.placements[2]).toEqual({ col: 1, row: 1, colspan: 1, rowspan: 1 });
  });

  it("computes total size including gaps", () => {
    const r = placeGrid({
      columns: 2,
      columnGap: 5,
      rowGap: 5,
      children: [
        { width: 10, height: 10, colspan: 1, rowspan: 1 },
        { width: 10, height: 10, colspan: 1, rowspan: 1 },
        { width: 10, height: 10, colspan: 1, rowspan: 1 },
        { width: 10, height: 10, colspan: 1, rowspan: 1 },
      ],
    });
    expect(r.totalWidth).toBe(25);
    expect(r.totalHeight).toBe(25);
  });
});

describe("trackOffset / spanSize", () => {
  it("computes offsets across tracks", () => {
    expect(trackOffset([10, 20, 30], 5, 0)).toBe(0);
    expect(trackOffset([10, 20, 30], 5, 1)).toBe(15);
    expect(trackOffset([10, 20, 30], 5, 2)).toBe(40);
  });
  it("computes span sizes including internal gaps", () => {
    expect(spanSize([10, 20, 30], 5, 0, 1)).toBe(10);
    expect(spanSize([10, 20, 30], 5, 0, 2)).toBe(35);
    expect(spanSize([10, 20, 30], 5, 0, 3)).toBe(70);
  });
});

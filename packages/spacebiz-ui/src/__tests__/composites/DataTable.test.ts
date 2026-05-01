import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockScene, type MockScene } from "../_harness/mockPhaser.ts";
import {
  containers,
  rectangles,
  allTextStrings,
  asMock,
  type MockContainerLike,
  type MockRectLike,
} from "../_harness/inspect.ts";

vi.mock("phaser", () => import("../_harness/mockPhaser.ts"));

import { DataTable, type ColumnDef } from "../../DataTable.ts";

const COLUMNS: ColumnDef[] = [
  { key: "name", label: "Name", width: 100, sortable: true },
  { key: "value", label: "Value", width: 100, sortable: true, align: "right" },
];

describe("DataTable", () => {
  let scene: MockScene;

  beforeEach(() => {
    scene = createMockScene();
  });

  it("expands columns proportionally so they fill the available width", () => {
    const table = new DataTable(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 400,
      columns: [
        { key: "a", label: "A", width: 100 },
        { key: "b", label: "B", width: 100 },
      ],
    });
    // Header text labels appear in the first child container.
    expect(containers(table).length).toBeGreaterThan(0);
  });

  it("renders empty-state text when no rows have been set", () => {
    const table = new DataTable(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      columns: COLUMNS,
      emptyStateText: "Nothing here",
      emptyStateHint: "Try adding entries",
    });
    table.setRows([]);

    const all = allTextStrings(table);
    expect(all).toContain("Nothing here");
    expect(all).toContain("Try adding entries");
  });

  it("setRows renders one row per data entry, then re-renders on subsequent calls", () => {
    const table = new DataTable(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 400,
      columns: COLUMNS,
    });
    table.setRows([
      { name: "Alpha", value: 1 },
      { name: "Beta", value: 2 },
      { name: "Gamma", value: 3 },
    ]);

    // After 3 rows, contentHeight > headerHeight (36).
    expect(table.contentHeight).toBeGreaterThan(36);

    // Replace with a single row — contentHeight should shrink.
    const before = table.contentHeight;
    table.setRows([{ name: "Solo", value: 99 }]);
    expect(table.contentHeight).toBeLessThan(before);
  });

  it("sorts ascending on first sortable header click, descending on second", () => {
    const table = new DataTable(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 400,
      columns: COLUMNS,
    });
    table.setRows([
      { name: "Charlie", value: 30 },
      { name: "Alice", value: 10 },
      { name: "Bob", value: 20 },
    ]);

    const headerContainer = getHeaderContainer(table);
    const hitAreas = rectangles(headerContainer).filter(
      (r) => r.getData?.("consumesWheel") === true,
    );
    expect(hitAreas.length).toBe(2);

    hitAreas[0].emit("pointerup");
    const ascRows = collectRowTexts(table);
    expect(ascRows[0]).toContain("Alice");
    expect(ascRows[1]).toContain("Bob");
    expect(ascRows[2]).toContain("Charlie");

    hitAreas[0].emit("pointerup");
    const descRows = collectRowTexts(table);
    expect(descRows[0]).toContain("Charlie");
    expect(descRows[2]).toContain("Alice");
  });

  it("invokes onRowSelect with index and row data when a row is clicked", () => {
    const onRowSelect = vi.fn();
    const table = new DataTable(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 400,
      columns: COLUMNS,
      onRowSelect,
    });
    const rows = [
      { name: "Alpha", value: 1 },
      { name: "Beta", value: 2 },
    ];
    table.setRows(rows);

    const rowBg = findRowBackgrounds(table)[1];
    rowBg.emit("pointerup");

    expect(onRowSelect).toHaveBeenCalledTimes(1);
    expect(onRowSelect).toHaveBeenCalledWith(1, rows[1]);
    expect(table.getSelectedRowIndex()).toBe(1);
    expect(table.getSelectedRow()).toEqual(rows[1]);
  });

  it("getSelectedRow returns null when nothing has been selected", () => {
    const table = new DataTable(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 400,
      columns: COLUMNS,
    });
    table.setRows([{ name: "A", value: 1 }]);
    expect(table.getSelectedRow()).toBeNull();
  });

  it("setEmptyState updates copy and re-renders the table", () => {
    const table = new DataTable(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      columns: COLUMNS,
    });
    table.setRows([]);
    table.setEmptyState("Nada", "Filter is too strict");

    const all = allTextStrings(table);
    expect(all).toContain("Nada");
    expect(all).toContain("Filter is too strict");
  });

  it("contentSized mode emits contentResize on setRows", () => {
    const table = new DataTable(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 400,
      columns: COLUMNS,
      contentSized: true,
    });
    const listener = vi.fn();
    table.on("contentResize", listener);
    table.setRows([{ name: "A", value: 1 }]);
    expect(listener).toHaveBeenCalled();
    const payload = listener.mock.calls[0][0] as { height: number };
    expect(payload.height).toBeGreaterThan(0);
  });

  it("contentSized mode counter-scrolls the header for fixed viewport headers", () => {
    const table = new DataTable(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 400,
      columns: COLUMNS,
      contentSized: true,
    });

    table.setViewportScrollY(96);

    expect(getHeaderContainer(table).y).toBe(96);
    expect(getBodyContainer(table).y).toBe(36);
    const tableContainers = containers(table);
    expect(tableContainers.at(-1)).toBe(getHeaderContainer(table));
  });

  it("keyboard navigation moves selection with ArrowDown when focused", () => {
    const onRowSelect = vi.fn();
    const table = new DataTable(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 400,
      columns: COLUMNS,
      keyboardNavigation: true,
      autoFocus: true,
      onRowSelect,
    });
    table.setRows([
      { name: "A", value: 1 },
      { name: "B", value: 2 },
      { name: "C", value: 3 },
    ]);

    scene.input.keyboard.emit("keydown", {
      code: "ArrowDown",
      preventDefault: () => undefined,
    });
    expect(table.getSelectedRowIndex()).toBe(1);
    expect(onRowSelect).toHaveBeenCalled();
  });

  it("keyboard Enter triggers onRowActivate", () => {
    const onRowActivate = vi.fn();
    const table = new DataTable(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 400,
      columns: COLUMNS,
      keyboardNavigation: true,
      autoFocus: true,
      onRowActivate,
    });
    table.setRows([{ name: "A", value: 1 }]);

    scene.input.keyboard.emit("keydown", {
      code: "Enter",
      preventDefault: () => undefined,
    });
    expect(onRowActivate).toHaveBeenCalledWith(0, { name: "A", value: 1 });
  });

  it("destroy cleans up without throwing", () => {
    const table = new DataTable(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 400,
      columns: COLUMNS,
      keyboardNavigation: true,
    });
    table.setRows([{ name: "A", value: 1 }]);
    expect(() => table.destroy()).not.toThrow();
  });

  describe("setSize", () => {
    it("returns this for chaining", () => {
      const table = new DataTable(scene as never, {
        x: 0,
        y: 0,
        width: 300,
        height: 400,
        columns: COLUMNS,
      });
      expect(table.setSize(500, 600)).toBe(table);
    });

    it("updates width reported by the container", () => {
      const table = new DataTable(scene as never, {
        x: 0,
        y: 0,
        width: 300,
        height: 400,
        columns: COLUMNS,
      });
      table.setSize(500, 600);
      expect(table.width).toBe(500);
    });

    it("does not add new children to the table container", () => {
      const table = new DataTable(scene as never, {
        x: 0,
        y: 0,
        width: 300,
        height: 400,
        columns: COLUMNS,
      });
      const childCountBefore = table.list.length;
      table.setSize(500, 600);
      expect(table.list.length).toBe(childCountBefore);
    });

    it("contentSized: height argument is ignored (height remains row-driven)", () => {
      const table = new DataTable(scene as never, {
        x: 0,
        y: 0,
        width: 300,
        height: 400,
        columns: COLUMNS,
        contentSized: true,
      });
      table.setRows([{ name: "A", value: 1 }]);
      const contentHeightBefore = table.contentHeight;
      table.setSize(500, 999);
      // contentHeight should not be affected by the height arg in contentSized mode
      expect(table.contentHeight).toBe(contentHeightBefore);
    });
  });

  describe("flex columns", () => {
    it("with no flex columns and outer width at base sum + scrollbar, widths are unchanged", () => {
      // Outer width = base sum + 4px scrollbar reserve, so the legacy
      // expandColumns scaling is a no-op AND there's no surplus for flex
      // to distribute. Effective widths should equal the configured widths.
      const table = new DataTable(scene as never, {
        x: 0,
        y: 0,
        width: 204,
        height: 400,
        columns: [
          { key: "a", label: "A", width: 100 },
          { key: "b", label: "B", width: 100 },
        ],
      });
      const widths = computeEffectiveWidths(table);
      expect(widths).toEqual([100, 100]);
    });

    it("single flex column absorbs the entire surplus", () => {
      const table = new DataTable(scene as never, {
        x: 0,
        y: 0,
        // base sum = 300, outer = 600 → 300 surplus
        width: 600,
        height: 400,
        columns: [
          { key: "a", label: "A", width: 100, flex: 1 },
          { key: "b", label: "B", width: 100 },
          { key: "c", label: "C", width: 100 },
        ],
      });
      const widths = computeEffectiveWidths(table);
      expect(widths).toEqual([400, 100, 100]);
      expect(widths.reduce((s, w) => s + w, 0)).toBe(600);
    });

    it("multiple flex columns split surplus proportionally", () => {
      const table = new DataTable(scene as never, {
        x: 0,
        y: 0,
        // base sum = 300, outer = 600 → 300 surplus.
        // flex 1 + 2 = 3 → col A gets 100, col B gets 200.
        width: 600,
        height: 400,
        columns: [
          { key: "a", label: "A", width: 100, flex: 1 },
          { key: "b", label: "B", width: 100, flex: 2 },
          { key: "c", label: "C", width: 100 },
        ],
      });
      const widths = computeEffectiveWidths(table);
      expect(widths[0]).toBe(200); // 100 base + 100 surplus share
      expect(widths[1]).toBe(300); // 100 base + 200 surplus share
      expect(widths[2]).toBe(100);
      expect(widths.reduce((s, w) => s + w, 0)).toBe(600);
    });

    it("sum of effective widths equals max(outer width, sum of base widths)", () => {
      // outer wider than base sum → flex distributes
      const wide = new DataTable(scene as never, {
        x: 0,
        y: 0,
        width: 700,
        height: 400,
        columns: [
          { key: "a", label: "A", width: 100, flex: 1 },
          { key: "b", label: "B", width: 100 },
        ],
      });
      expect(computeEffectiveWidths(wide).reduce((s, w) => s + w, 0)).toBe(700);

      // outer narrower than base sum → effective widths == base widths
      const narrow = new DataTable(scene as never, {
        x: 0,
        y: 0,
        width: 100,
        height: 400,
        columns: [
          { key: "a", label: "A", width: 100, flex: 1 },
          { key: "b", label: "B", width: 100 },
        ],
      });
      expect(computeEffectiveWidths(narrow).reduce((s, w) => s + w, 0)).toBe(
        200,
      );
    });

    it("setSize re-flows: right-aligned cell text repositions when its column grows", () => {
      const table = new DataTable(scene as never, {
        x: 0,
        y: 0,
        // base sum = 200 = outer width: no surplus, so no flex distribution yet.
        width: 200,
        height: 400,
        columns: [
          { key: "name", label: "Name", width: 100, flex: 1 },
          { key: "value", label: "Value", width: 100, align: "right" },
        ],
      });
      table.setRows([{ name: "Alpha", value: 42 }]);

      // Right-aligned text origin sits at (col-x + col-width - 8). With name flexed
      // from 100 → 200, the value column shifts from x=100 to x=200, so the text
      // should sit at x = 200 + 100 - 8 = 292.
      const valueTextBefore = findRightAlignedValueText(table);
      expect(valueTextBefore.x).toBe(100 + 100 - 8);

      table.setSize(400, 400); // surplus = 200, all goes to flex column 'name'
      const widths = computeEffectiveWidths(table);
      expect(widths).toEqual([300, 100]);

      const valueTextAfter = findRightAlignedValueText(table);
      expect(valueTextAfter.x).toBe(300 + 100 - 8);
    });
  });
});

function computeEffectiveWidths(table: DataTable): number[] {
  return asMock<{ computeEffectiveWidths: () => number[] }>(
    table,
  ).computeEffectiveWidths();
}

function findRightAlignedValueText(table: DataTable) {
  const body = asMock<{ bodyContainer: MockContainerLike }>(
    table,
  ).bodyContainer;
  // The "value" cell is the last text rendered in the row.
  const allTexts = body.list.filter(
    (child) => (child as { type?: string }).type === "Text",
  );
  return asMock<{ x: number; text: string }>(allTexts[allTexts.length - 1]);
}

// ─────────────────────────────────────────────────────────────────────────
// DataTable-specific helpers (row backgrounds keyed off table width).
// ─────────────────────────────────────────────────────────────────────────

function findRowBackgrounds(table: DataTable): MockRectLike[] {
  const tableWidth = asMock<{ tableConfig?: { width: number } }>(table)
    .tableConfig?.width;
  const body = getBodyContainer(table);
  return rectangles(body).filter((r) => r.width === tableWidth);
}

function collectRowTexts(table: DataTable): string[] {
  // Group same-Y texts into a single pipe-joined row signature.
  const body = getBodyContainer(table);
  const out: string[] = [];
  let acc = "";
  let lastY = -Infinity;
  for (const child of body.list) {
    if (child.type !== "Text") continue;
    const t = asMock<{ text: string; y: number }>(child);
    if (t.y !== lastY && acc) {
      out.push(acc);
      acc = "";
    }
    acc += `${acc ? "|" : ""}${t.text}`;
    lastY = t.y;
  }
  if (acc) out.push(acc);
  return out;
}

function getHeaderContainer(table: DataTable) {
  return asMock<{ headerContainer: MockContainerLike }>(table).headerContainer;
}

function getBodyContainer(table: DataTable) {
  return asMock<{ bodyContainer: MockContainerLike }>(table).bodyContainer;
}

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockScene, type MockScene } from "../_harness/mockPhaser.ts";
import {
  containers,
  rectangles,
  allTextStrings,
  asMock,
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

    const headerContainer = containers(table)[0];
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
});

// ─────────────────────────────────────────────────────────────────────────
// DataTable-specific helpers (row backgrounds keyed off table width).
// ─────────────────────────────────────────────────────────────────────────

function findRowBackgrounds(table: DataTable): MockRectLike[] {
  const tableWidth = asMock<{ tableConfig?: { width: number } }>(table)
    .tableConfig?.width;
  const body = containers(table)[1];
  return rectangles(body).filter((r) => r.width === tableWidth);
}

function collectRowTexts(table: DataTable): string[] {
  // Group same-Y texts into a single pipe-joined row signature.
  const body = containers(table)[1];
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

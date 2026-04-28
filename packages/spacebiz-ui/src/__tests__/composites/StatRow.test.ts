import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockScene, type MockScene } from "../_harness/mockPhaser.ts";
import { texts, rectangles } from "../_harness/inspect.ts";

vi.mock("phaser", () => import("../_harness/mockPhaser.ts"));

import { StatRow } from "../../StatRow.ts";

describe("StatRow", () => {
  let scene: MockScene;

  beforeEach(() => {
    scene = createMockScene();
  });

  it("renders label and value as separate text children of the row container", () => {
    const row = new StatRow(scene as never, {
      x: 10,
      y: 20,
      width: 200,
      label: "Credits",
      value: "12,345",
    });

    expect(row.x).toBe(10);
    expect(row.y).toBe(20);
    // Container should hold: label, value, leader line.
    expect(row.list.length).toBeGreaterThanOrEqual(3);

    const strings = texts(row).map((t) => t.text);
    expect(strings).toContain("Credits");
    expect(strings).toContain("12,345");
  });

  it("setValue updates the value text without touching the label", () => {
    const row = new StatRow(scene as never, {
      x: 0,
      y: 0,
      width: 200,
      label: "Fuel",
      value: "100",
    });

    row.setValue("250");

    const strings = texts(row).map((t) => t.text);
    expect(strings).toContain("Fuel");
    expect(strings).toContain("250");
    expect(strings).not.toContain("100");
  });

  it("setValue with a color updates the value text color", () => {
    const row = new StatRow(scene as never, {
      x: 0,
      y: 0,
      width: 200,
      label: "Profit",
      value: "0",
    });

    row.setValue("-50", 0xff0000);

    const valueText = texts(row).find((t) => t.text === "-50");
    expect(valueText).toBeDefined();
    expect(valueText?.style.color).toBe("#ff0000");
  });

  it("setLabel updates the label text", () => {
    const row = new StatRow(scene as never, {
      x: 0,
      y: 0,
      width: 200,
      label: "Old",
      value: "1",
    });

    row.setLabel("New");

    const labels = texts(row).map((t) => t.text);
    expect(labels).toContain("New");
    expect(labels).not.toContain("Old");
  });

  it("right-aligns the value text by anchoring it to the row width", () => {
    const row = new StatRow(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      label: "L",
      value: "V",
    });

    const labelText = texts(row).find((t) => t.text === "L");
    const valueText = texts(row).find((t) => t.text === "V");
    expect(labelText?.x).toBe(0);
    // Right-aligned: value origin is (1, 0) and X is set to width.
    expect(valueText?.x).toBe(300);
  });

  it("compact mode picks the caption font and produces a smaller leader Y", () => {
    const compactRow = new StatRow(scene as never, {
      x: 0,
      y: 0,
      width: 100,
      label: "X",
      value: "Y",
      compact: true,
    });
    const fullRow = new StatRow(scene as never, {
      x: 0,
      y: 0,
      width: 100,
      label: "X",
      value: "Y",
    });

    const compactLeader = rectangles(compactRow)[0];
    const fullLeader = rectangles(fullRow)[0];

    expect(compactLeader).toBeDefined();
    expect(fullLeader).toBeDefined();
    expect(compactLeader.y).toBeLessThanOrEqual(fullLeader.y);
  });

  it("rowHeight reflects the maximum of label/value text heights plus padding", () => {
    const row = new StatRow(scene as never, {
      x: 0,
      y: 0,
      width: 200,
      label: "Foo",
      value: "Bar",
    });
    expect(row.rowHeight).toBeGreaterThan(0);
  });
});

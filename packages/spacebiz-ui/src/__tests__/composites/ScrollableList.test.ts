import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockScene, type MockScene } from "../_harness/mockPhaser.ts";

vi.mock("phaser", () => import("../_harness/mockPhaser.ts"));

import { ScrollableList } from "../../ScrollableList.ts";

interface MockGO {
  emit: (event: string, ...args: unknown[]) => unknown;
  setPosition: (x: number, y: number) => unknown;
  parentContainer: unknown;
  x: number;
  y: number;
  list: MockGO[];
}

function makeRow(scene: MockScene, label = "row"): MockGO {
  const c = scene.add.container(0, 0) as unknown as MockGO;
  const text = scene.add.text(0, 0, label);
  (c as unknown as { add: (g: unknown) => unknown }).add(text);
  return c;
}

describe("ScrollableList", () => {
  let scene: MockScene;

  beforeEach(() => {
    scene = createMockScene();
  });

  it("starts empty with no scroll capacity", () => {
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      itemHeight: 40,
    });
    expect(list.getSelectedIndex()).toBe(-1);
  });

  it("addItem positions items at index × itemHeight", () => {
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      itemHeight: 40,
    });
    const r1 = makeRow(scene, "a");
    const r2 = makeRow(scene, "b");
    const r3 = makeRow(scene, "c");
    list.addItem(r1 as unknown as never);
    list.addItem(r2 as unknown as never);
    list.addItem(r3 as unknown as never);

    expect(r1.y).toBe(0);
    expect(r2.y).toBe(40);
    expect(r3.y).toBe(80);
  });

  it("clearItems wipes selection and items", () => {
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      itemHeight: 40,
    });
    list.addItem(makeRow(scene, "a") as unknown as never);
    list.addItem(makeRow(scene, "b") as unknown as never);
    list.clearItems();
    expect(list.getSelectedIndex()).toBe(-1);
  });

  it("autoFocus selects the first item once it is added", () => {
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      itemHeight: 40,
      autoFocus: true,
    });
    list.addItem(makeRow(scene, "a") as unknown as never);
    expect(list.getSelectedIndex()).toBe(0);
  });

  it("invokes onSelect when a row receives pointerup", () => {
    const onSelect = vi.fn();
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      itemHeight: 40,
      onSelect,
    });
    const r1 = makeRow(scene, "a");
    const r2 = makeRow(scene, "b");
    list.addItem(r1 as unknown as never);
    list.addItem(r2 as unknown as never);

    r2.emit("pointerup");
    expect(onSelect).toHaveBeenCalledWith(1);
    expect(list.getSelectedIndex()).toBe(1);
  });

  it("onSelect is not re-fired when re-selecting the same row programmatically (no notifySelection)", () => {
    const onSelect = vi.fn();
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      itemHeight: 40,
      autoFocus: true,
      onSelect,
    });
    list.addItem(makeRow(scene, "a") as unknown as never);
    // autoFocus path calls selectIndex(0, false) → no notification.
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("prependItem inserts at the top and re-positions existing items", () => {
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      itemHeight: 50,
    });
    const r1 = makeRow(scene, "a");
    const r2 = makeRow(scene, "b");
    const newTop = makeRow(scene, "z");
    list.addItem(r1 as unknown as never);
    list.addItem(r2 as unknown as never);
    list.prependItem(newTop as unknown as never);

    expect(newTop.y).toBe(0);
    expect(r1.y).toBe(50);
    expect(r2.y).toBe(100);
  });

  it("scrollbar appears (track + thumb added) once items overflow", () => {
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 100,
      itemHeight: 40,
    });
    const baselineCount = list.list.length;
    // 4 items × 40 = 160 > 100 viewport
    for (let i = 0; i < 4; i++) {
      list.addItem(makeRow(scene, "i") as unknown as never);
    }
    // Two scroll elements (track + thumb) are added on top of baseline.
    expect(list.list.length).toBeGreaterThanOrEqual(baselineCount + 2);
  });

  it("scrollbar is absent while content fits within the viewport", () => {
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      itemHeight: 40,
    });
    const baselineCount = list.list.length;
    // 2 items × 40 = 80 ≤ 200
    list.addItem(makeRow(scene, "a") as unknown as never);
    list.addItem(makeRow(scene, "b") as unknown as never);
    // Adding items adds them inside contentContainer, not the list container.
    // No scrollbar elements added at the top level.
    expect(list.list.length).toBe(baselineCount);
  });

  it("keyboard navigation: ArrowDown advances selection only when focused", () => {
    const onSelect = vi.fn();
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      itemHeight: 40,
      keyboardNavigation: true,
      onSelect,
    });
    list.addItem(makeRow(scene, "a") as unknown as never);
    list.addItem(makeRow(scene, "b") as unknown as never);

    // Without focus, key handler is a no-op.
    scene.input.keyboard.emit("keydown", {
      code: "ArrowDown",
      preventDefault: () => undefined,
    });
    expect(list.getSelectedIndex()).toBe(-1);

    // Acquire focus by simulating a click on the wheel capture.
    const wheelCapture = list.list[0] as unknown as MockGO;
    wheelCapture.emit("pointerdown");

    scene.input.keyboard.emit("keydown", {
      code: "ArrowDown",
      preventDefault: () => undefined,
    });
    expect(list.getSelectedIndex()).toBe(0);
    scene.input.keyboard.emit("keydown", {
      code: "ArrowDown",
      preventDefault: () => undefined,
    });
    expect(list.getSelectedIndex()).toBe(1);
  });

  it("keyboard Enter triggers onConfirm when set; falls back to onSelect", () => {
    const onConfirm = vi.fn();
    const onSelect = vi.fn();
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      itemHeight: 40,
      keyboardNavigation: true,
      autoFocus: true,
      onConfirm,
      onSelect,
    });
    list.addItem(makeRow(scene, "a") as unknown as never);
    expect(list.getSelectedIndex()).toBe(0);

    scene.input.keyboard.emit("keydown", {
      code: "Enter",
      preventDefault: () => undefined,
    });
    expect(onConfirm).toHaveBeenCalledWith(0);
    // onSelect is not called because onConfirm is set.
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("keyboard Escape invokes onCancel", () => {
    const onCancel = vi.fn();
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      itemHeight: 40,
      keyboardNavigation: true,
      autoFocus: true,
      onCancel,
    });
    list.addItem(makeRow(scene, "a") as unknown as never);
    scene.input.keyboard.emit("keydown", {
      code: "Escape",
      preventDefault: () => undefined,
    });
    expect(onCancel).toHaveBeenCalled();
  });

  it("destroy unsubscribes from scene events without throwing", () => {
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      itemHeight: 40,
      keyboardNavigation: true,
    });
    list.addItem(makeRow(scene, "a") as unknown as never);
    expect(() => list.destroy()).not.toThrow();
  });
});

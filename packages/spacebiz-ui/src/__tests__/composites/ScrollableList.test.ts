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

describe("ScrollableList.setSize", () => {
  let scene: MockScene;

  beforeEach(() => {
    scene = createMockScene();
  });

  it("returns the ScrollableList instance for chaining", () => {
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      itemHeight: 40,
    });
    expect(list.setSize(400, 250)).toBe(list);
  });

  it("syncs inherited width and height", () => {
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      itemHeight: 40,
    });
    list.setSize(450, 350);
    expect(list.width).toBe(450);
    expect(list.height).toBe(350);
  });

  it("updates the wheel capture hit-area to the new dimensions", () => {
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      itemHeight: 40,
    });
    const wheelCapture = list.list[0] as unknown as {
      width: number;
      height: number;
    };
    list.setSize(500, 300);
    expect(wheelCapture.width).toBe(500);
    expect(wheelCapture.height).toBe(300);
  });

  it("redraws the mask shape in place (no new mask object)", () => {
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      itemHeight: 40,
    });
    const before = (list as unknown as { maskGraphics: object }).maskGraphics;
    list.setSize(400, 250);
    const after = (list as unknown as { maskGraphics: object }).maskGraphics;
    expect(after).toBe(before);
  });

  it("clamps scrollY when growing the viewport so content no longer overflows", () => {
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 100,
      itemHeight: 40,
    });
    // 4 items × 40 = 160 > 100 viewport → maxScroll = 60.
    for (let i = 0; i < 4; i++) {
      list.addItem(makeRow(scene, "i") as unknown as never);
    }

    // Grow the viewport so all content fits — maxScroll becomes 0.
    list.setSize(300, 400);
    const internal = list as unknown as {
      maxScroll: number;
      scrollY: number;
      contentContainer: { y: number };
    };
    expect(internal.maxScroll).toBe(0);
    expect(internal.scrollY).toBe(0);
    // -0 and +0 are both acceptable here.
    expect(Math.abs(internal.contentContainer.y)).toBe(0);
  });

  it("does not add new top-level children when content fits both before and after", () => {
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      itemHeight: 40,
    });
    list.addItem(makeRow(scene, "a") as unknown as never);
    const before = list.list.length;
    list.setSize(400, 300);
    expect(list.list.length).toBe(before);
  });

  it("destroy still works cleanly after a setSize call", () => {
    const list = new ScrollableList(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      itemHeight: 40,
      keyboardNavigation: true,
    });
    list.addItem(makeRow(scene, "a") as unknown as never);
    list.setSize(500, 400);
    expect(() => list.destroy()).not.toThrow();
  });
});

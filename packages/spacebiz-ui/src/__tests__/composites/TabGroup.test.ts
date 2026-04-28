import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockScene, type MockScene } from "../_harness/mockPhaser.ts";

vi.mock("phaser", () => import("../_harness/mockPhaser.ts"));

import { TabGroup } from "../../TabGroup.ts";

interface MockText {
  type: string;
  text: string;
  style: { color?: string };
}

interface MockRect {
  type: string;
  fillColor: number;
  fillAlpha: number;
  alpha: number;
  width: number;
  height: number;
  setFillStyle?: (color: number) => unknown;
  emit: (event: string, ...args: unknown[]) => unknown;
}

function makeContent(scene: MockScene): never {
  return scene.add.container(0, 0) as unknown as never;
}

describe("TabGroup", () => {
  let scene: MockScene;

  beforeEach(() => {
    scene = createMockScene();
  });

  it("defaults to tab index 0 active when no defaultTab is provided", () => {
    const tg = new TabGroup(scene as never, {
      x: 0,
      y: 0,
      width: 600,
      tabs: [
        { label: "One", content: makeContent(scene) },
        { label: "Two", content: makeContent(scene) },
        { label: "Three", content: makeContent(scene) },
      ],
    });

    expect(tg.getActiveIndex()).toBe(0);
  });

  it("honors a custom defaultTab on construction", () => {
    const tg = new TabGroup(scene as never, {
      x: 0,
      y: 0,
      width: 600,
      defaultTab: 2,
      tabs: [
        { label: "A", content: makeContent(scene) },
        { label: "B", content: makeContent(scene) },
        { label: "C", content: makeContent(scene) },
      ],
    });

    expect(tg.getActiveIndex()).toBe(2);
  });

  it("only the active tab's content is visible after construction", () => {
    const a = makeContent(scene);
    const b = makeContent(scene);
    const tg = new TabGroup(scene as never, {
      x: 0,
      y: 0,
      width: 400,
      defaultTab: 0,
      tabs: [
        { label: "A", content: a },
        { label: "B", content: b },
      ],
    });
    void tg;

    expect((a as unknown as { visible: boolean }).visible).toBe(true);
    expect((b as unknown as { visible: boolean }).visible).toBe(false);
  });

  it("setActiveTab switches visible content and updates the active index", () => {
    const a = makeContent(scene);
    const b = makeContent(scene);
    const tg = new TabGroup(scene as never, {
      x: 0,
      y: 0,
      width: 400,
      tabs: [
        { label: "A", content: a },
        { label: "B", content: b },
      ],
    });

    tg.setActiveTab(1);

    expect(tg.getActiveIndex()).toBe(1);
    expect((a as unknown as { visible: boolean }).visible).toBe(false);
    expect((b as unknown as { visible: boolean }).visible).toBe(true);
  });

  it("setActiveTab is a no-op for out-of-range indices", () => {
    const tg = new TabGroup(scene as never, {
      x: 0,
      y: 0,
      width: 400,
      tabs: [
        { label: "A", content: makeContent(scene) },
        { label: "B", content: makeContent(scene) },
      ],
    });

    tg.setActiveTab(-1);
    expect(tg.getActiveIndex()).toBe(0);
    tg.setActiveTab(99);
    expect(tg.getActiveIndex()).toBe(0);
  });

  it("clicking a tab button (pointerup on bg) activates that tab", () => {
    const a = makeContent(scene);
    const b = makeContent(scene);
    const c = makeContent(scene);
    const tg = new TabGroup(scene as never, {
      x: 0,
      y: 0,
      width: 600,
      tabs: [
        { label: "A", content: a },
        { label: "B", content: b },
        { label: "C", content: c },
      ],
    });

    // tabButtons array is private but indices alternate in the list:
    // [tabBtn0, content0, tabBtn1, content1, tabBtn2, content2].
    // We extract via stride so we don't depend on internal arrays.
    const tabButtons = tg.list.filter(
      (_, idx) => idx % 2 === 0,
    ) as unknown as Array<{ list: MockRect[] }>;

    const tabBBg = tabButtons[1].list[0];
    tabBBg.emit("pointerup");

    expect(tg.getActiveIndex()).toBe(1);
    expect((b as unknown as { visible: boolean }).visible).toBe(true);
    expect((a as unknown as { visible: boolean }).visible).toBe(false);
  });

  it("clicking the already-active tab does not change index", () => {
    const tg = new TabGroup(scene as never, {
      x: 0,
      y: 0,
      width: 400,
      tabs: [
        { label: "A", content: makeContent(scene) },
        { label: "B", content: makeContent(scene) },
      ],
    });

    const tabButtons = tg.list.filter(
      (_, idx) => idx % 2 === 0,
    ) as unknown as Array<{ list: MockRect[] }>;
    tabButtons[0].list[0].emit("pointerup");
    expect(tg.getActiveIndex()).toBe(0);
  });

  it("active tab label uses accent color, inactive uses dim color", () => {
    const tg = new TabGroup(scene as never, {
      x: 0,
      y: 0,
      width: 400,
      tabs: [
        { label: "A", content: makeContent(scene) },
        { label: "B", content: makeContent(scene) },
      ],
    });

    const tabButtons = tg.list.filter(
      (_, idx) => idx % 2 === 0,
    ) as unknown as Array<{ list: Array<MockRect | MockText> }>;

    const labelA = tabButtons[0].list[1] as MockText;
    const labelB = tabButtons[1].list[1] as MockText;
    const activeColor = labelA.style.color;
    const inactiveColor = labelB.style.color;
    expect(activeColor).toBeDefined();
    expect(inactiveColor).toBeDefined();
    expect(activeColor).not.toBe(inactiveColor);

    tg.setActiveTab(1);
    // After switching, B should now use accent (was A's color), A should use dim
    expect(labelB.style.color).toBe(activeColor);
    expect(labelA.style.color).toBe(inactiveColor);
  });

  it("active indicator strip (child index 3) is positioned at the tab width × index", () => {
    const tg = new TabGroup(scene as never, {
      x: 0,
      y: 0,
      width: 600,
      tabs: [
        { label: "A", content: makeContent(scene) },
        { label: "B", content: makeContent(scene) },
        { label: "C", content: makeContent(scene) },
      ],
    });

    const tabButtons = tg.list.filter(
      (_, idx) => idx % 2 === 0,
    ) as unknown as Array<{ x: number; list: Array<{ width: number }> }>;

    expect(tabButtons[0].x).toBe(0);
    expect(tabButtons[1].x).toBe(200);
    expect(tabButtons[2].x).toBe(400);
    // Indicator (child 3) inherits tab width
    expect(tabButtons[0].list[3].width).toBe(200);
  });

  it("getTabWidth returns the configured group width", () => {
    const tg = new TabGroup(scene as never, {
      x: 0,
      y: 0,
      width: 720,
      tabs: [{ label: "A", content: makeContent(scene) }],
    });
    expect(tg.getTabWidth()).toBe(720);
  });
});

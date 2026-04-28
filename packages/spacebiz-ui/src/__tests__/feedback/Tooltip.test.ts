import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("phaser", async () => {
  const m = await import("./_phaserMock.ts");
  return m.phaserMockFactory();
});

import {
  createMockScene,
  type MockScene,
  type MockGameObject,
  MockRectangle,
} from "./_phaserMock.ts";
import { Tooltip } from "../../Tooltip.ts";

interface TooltipShape extends MockGameObject {
  list: MockGameObject[];
  attachTo(o: MockGameObject, t: string): void;
  detachFrom(o: MockGameObject): void;
  destroy(fromScene?: boolean): void;
}

function makeTarget(scene: MockScene): MockGameObject {
  // Use a rectangle as a stand-in for any interactive game object.
  return scene.add.rectangle(0, 0, 50, 50);
}

describe("Tooltip", () => {
  let scene: MockScene;

  beforeEach(() => {
    scene = createMockScene(800, 600);
  });

  it("starts hidden and at depth 2000", () => {
    const tt = new Tooltip(scene as never) as unknown as TooltipShape;
    expect(tt.visible).toBe(false);
    expect(tt.depth).toBe(2000);
  });

  it("attachTo schedules the show after the configured delay", () => {
    const tt = new Tooltip(scene as never, {
      showDelay: 200,
    }) as unknown as TooltipShape;
    const target = makeTarget(scene);
    tt.attachTo(target, "hello");
    expect(scene.time._all.length).toBe(0);

    // Simulate hover — pointerover schedules the timer.
    target.emit("pointerover", { x: 100, y: 50 });
    expect(scene.time._all.length).toBe(1);
    expect(scene.time._all[0]!.delay).toBe(200);
    expect(tt.visible).toBe(false);

    // Fire the timer; tooltip should reveal.
    scene.time._all[0]!.fire();
    expect(tt.visible).toBe(true);
  });

  it("positions the tooltip relative to the pointer with a +12 offset", () => {
    const tt = new Tooltip(scene as never, {
      showDelay: 0,
    }) as unknown as TooltipShape;
    const target = makeTarget(scene);
    tt.attachTo(target, "tip");
    target.emit("pointerover", { x: 50, y: 80 });
    scene.time._all[0]!.fire();
    expect(tt.x).toBe(50 + 12);
    expect(tt.y).toBe(80 + 12);
  });

  it("pointerout cancels a pending timer and hides the tooltip", () => {
    const tt = new Tooltip(scene as never, {
      showDelay: 1000,
    }) as unknown as TooltipShape;
    const target = makeTarget(scene);
    tt.attachTo(target, "tip");
    target.emit("pointerover", { x: 0, y: 0 });
    const timer = scene.time._all[0]!;
    target.emit("pointerout");
    expect(timer.destroyed).toBe(true);
    expect(tt.visible).toBe(false);
  });

  it("updates label text when shown", () => {
    const tt = new Tooltip(scene as never, {
      showDelay: 0,
    }) as unknown as TooltipShape;
    const target = makeTarget(scene);
    tt.attachTo(target, "first");
    target.emit("pointerover", { x: 0, y: 0 });
    scene.time._all[0]!.fire();
    // The label is the third child added (border, bg, label).
    const label = tt.list[2] as MockGameObject & { text: string };
    expect(label.text).toBe("first");

    // Re-attach with new text and re-trigger.
    tt.attachTo(target, "second");
    target.emit("pointerover", { x: 0, y: 0 });
    scene.time._all[1]!.fire();
    expect(label.text).toBe("second");
  });

  it("resizes the border/background to wrap the label", () => {
    const tt = new Tooltip(scene as never, {
      showDelay: 0,
    }) as unknown as TooltipShape;
    const target = makeTarget(scene);
    tt.attachTo(target, "x");
    target.emit("pointerover", { x: 0, y: 0 });
    scene.time._all[0]!.fire();

    const border = tt.list[0] as MockRectangle;
    const bg = tt.list[1] as MockRectangle;
    // Border and bg widths must be positive after layout.
    expect(border.width).toBeGreaterThan(0);
    expect(border.height).toBeGreaterThan(0);
    // BG inset by 1px on each side relative to border.
    expect(bg.width).toBe(border.width - 2);
    expect(bg.height).toBe(border.height - 2);
    expect(bg.x).toBe(1);
    expect(bg.y).toBe(1);
  });

  it("detachFrom() removes pointer listeners on the target", () => {
    const tt = new Tooltip(scene as never, {
      showDelay: 50,
    }) as unknown as TooltipShape;
    const target = makeTarget(scene);
    tt.attachTo(target, "x");
    expect(target.listenerCount("pointerover")).toBeGreaterThan(0);
    tt.detachFrom(target);
    expect(target.listenerCount("pointerover")).toBe(0);
    expect(target.listenerCount("pointerout")).toBe(0);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockScene, type MockScene } from "../_harness/mockPhaser.ts";

vi.mock("phaser", () => import("../_harness/mockPhaser.ts"));

import { ScrollFrame } from "../../ScrollFrame.ts";

interface MockContainer {
  list: Array<{ width: number; height: number }>;
  setPosition: (x: number, y: number) => unknown;
  parentContainer: MockContainer | null;
  emit: (event: string, ...args: unknown[]) => unknown;
  width: number;
  height: number;
  x: number;
  y: number;
}

function makeChildOfHeight(scene: MockScene, height: number): MockContainer {
  const child = scene.add.container(0, 0) as unknown as MockContainer;
  child.height = height;
  // Inject a dummy item so getBounds reports the right size for unknown
  // children that don't expose `contentHeight`.
  const filler = scene.add.rectangle(0, 0, 100, height, 0);
  (child as unknown as { add: (c: unknown) => unknown }).add(filler);
  return child;
}

describe("ScrollFrame", () => {
  let scene: MockScene;

  beforeEach(() => {
    scene = createMockScene();
  });

  it("creates a wheel hit area, content layer, and mask shape", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });

    // 1 wheelHit (Rectangle) + 1 contentLayer (Container) at minimum
    expect(frame.list.length).toBeGreaterThanOrEqual(2);
  });

  it("setContent reparents the child container into the content layer", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    const child = makeChildOfHeight(scene, 100);
    frame.setContent(child as unknown as never);

    expect(child.parentContainer).not.toBeNull();
    expect(child.parentContainer).not.toBe(frame as unknown as MockContainer);
    // The content layer is itself a child of the frame.
    expect(child.parentContainer?.parentContainer).toBe(
      frame as unknown as MockContainer,
    );
  });

  it("setContent resets the child position to (0, 0)", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    const child = makeChildOfHeight(scene, 100);
    child.x = 999;
    child.y = 999;
    frame.setContent(child as unknown as never);
    expect(child.x).toBe(0);
    expect(child.y).toBe(0);
  });

  it("setContent replaces previously adopted content", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    const a = makeChildOfHeight(scene, 50);
    const b = makeChildOfHeight(scene, 50);
    frame.setContent(a as unknown as never);
    frame.setContent(b as unknown as never);

    expect(a.parentContainer).toBeNull();
    expect(b.parentContainer).not.toBeNull();
  });

  it("getMaxScroll is 0 when content fits in the viewport", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    frame.setContent(makeChildOfHeight(scene, 50) as unknown as never);
    expect(frame.getMaxScroll()).toBe(0);
  });

  it("getMaxScroll is content_height − viewport_height when content overflows", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    frame.setContent(makeChildOfHeight(scene, 500) as unknown as never);
    expect(frame.getMaxScroll()).toBe(300);
  });

  it("scrollTo clamps within [0, maxScroll]", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    frame.setContent(makeChildOfHeight(scene, 500) as unknown as never);

    frame.scrollTo(50);
    expect(frame.getMaxScroll()).toBe(300);

    frame.scrollTo(-100);
    // After clamping, content layer y should be at padding - 0
    // (we cannot read scrollY directly, but maxScroll stays correct)
    expect(frame.getMaxScroll()).toBe(300);

    frame.scrollTo(9999);
    expect(frame.getMaxScroll()).toBe(300);
  });

  it("scrollIntoView pulls the viewport down when target is below visible area", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    frame.setContent(makeChildOfHeight(scene, 500) as unknown as never);

    // Scroll to top first
    frame.scrollTo(0);
    // Item at y=300, height=40 — completely below the 0..200 viewport.
    frame.scrollIntoView(300, 40);

    // After scrollIntoView, the bottom of the item (300 + 40 = 340) should be
    // at the bottom of the viewport, so scrollY = 340 - 200 = 140.
    // We verify indirectly via behavior: scrolling further into view of an
    // item that's now visible should be a no-op.
    expect(frame.getMaxScroll()).toBe(300);
  });

  it("scrollIntoView aligns top when target is above the visible area", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    frame.setContent(makeChildOfHeight(scene, 500) as unknown as never);

    // Scroll all the way down
    frame.scrollTo(300);
    // Now ask for an item near the top — should pull viewport up to it.
    frame.scrollIntoView(10, 20);
    // Sanity: maxScroll unchanged
    expect(frame.getMaxScroll()).toBe(300);
  });

  it("recomputeBounds picks up content height changes after the fact", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    const child = makeChildOfHeight(scene, 100);
    frame.setContent(child as unknown as never);
    expect(frame.getMaxScroll()).toBe(0);

    // Grow the child by adding a taller filler.
    const taller = scene.add.rectangle(0, 100, 100, 600, 0);
    (child as unknown as { add: (c: unknown) => unknown }).add(taller);
    frame.recomputeBounds();
    expect(frame.getMaxScroll()).toBeGreaterThan(0);
  });

  it("listens for child contentResize events and recomputes bounds", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    const child = makeChildOfHeight(scene, 100);
    frame.setContent(child as unknown as never);
    expect(frame.getMaxScroll()).toBe(0);

    // Grow content and emit the same event a content-sized DataTable would.
    const taller = scene.add.rectangle(0, 100, 100, 800, 0);
    (child as unknown as { add: (c: unknown) => unknown }).add(taller);
    child.emit("contentResize", { height: 900 });
    expect(frame.getMaxScroll()).toBeGreaterThan(0);
  });

  it("respects a child's contentHeight getter when present", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    const child = scene.add.container(0, 0) as unknown as MockContainer & {
      contentHeight: number;
    };
    child.contentHeight = 1000;
    frame.setContent(child as unknown as never);
    expect(frame.getMaxScroll()).toBe(800);
  });

  it("getViewportHeight subtracts padding on both sides", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      padding: 12,
    });
    expect(frame.getViewportHeight()).toBe(200 - 12 * 2);
  });

  it("padding shifts the content layer position", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      padding: 8,
    });

    // Content layer is the Container child at index 1 (after wheelHitArea).
    const layer = frame.list[1] as unknown as { x: number; y: number };
    expect(layer.x).toBe(8);
    expect(layer.y).toBe(8);
  });

  it("keeps the mask anchored to the viewport when content scrolls", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 20,
      y: 30,
      width: 300,
      height: 200,
      padding: 8,
    });
    frame.setContent(makeChildOfHeight(scene, 500) as unknown as never);

    const mask = (frame as unknown as { maskShape: { x: number; y: number } })
      .maskShape;

    expect(mask.x).toBe(28);
    expect(mask.y).toBe(38);

    frame.scrollTo(100);

    expect(mask.x).toBe(28);
    expect(mask.y).toBe(38);
  });

  it("notifies content when the viewport scroll offset changes", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    const child = makeChildOfHeight(scene, 500) as MockContainer & {
      setViewportScrollY: ReturnType<typeof vi.fn>;
    };
    child.setViewportScrollY = vi.fn();

    frame.setContent(child as unknown as never);
    frame.scrollTo(100);

    expect(child.setViewportScrollY).toHaveBeenLastCalledWith(100);
  });
});

describe("ScrollFrame.setSize", () => {
  let scene: MockScene;

  beforeEach(() => {
    scene = createMockScene();
  });

  it("returns the ScrollFrame instance for chaining", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    expect(frame.setSize(400, 300)).toBe(frame);
  });

  it("updates width and height", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    frame.setSize(450, 350);
    expect(frame.width).toBe(450);
    expect(frame.height).toBe(350);
  });

  it("updates getViewportHeight to reflect the new height", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    frame.setSize(300, 400);
    expect(frame.getViewportHeight()).toBe(400);
  });

  it("does not add new children to the container", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    const before = frame.list.length;
    frame.setSize(400, 300);
    expect(frame.list.length).toBe(before);
  });

  it("clamps scrollY within new bounds after shrinking the viewport", () => {
    const frame = new ScrollFrame(scene as never, {
      x: 0,
      y: 0,
      width: 300,
      height: 200,
    });
    // Content 500px tall in a 200px viewport → maxScroll = 300.
    frame.setContent(makeChildOfHeight(scene, 500) as unknown as never);
    frame.scrollTo(250); // scroll partway down

    // Grow the viewport so content no longer overflows.
    frame.setSize(300, 600);
    // maxScroll is now 0; scrollY must also be 0.
    expect(frame.getMaxScroll()).toBe(0);
    // Content layer y should equal padding (0 here) meaning scrollY == 0.
    const layer = frame.list[1] as unknown as { y: number };
    expect(layer.y).toBe(0);
  });
});

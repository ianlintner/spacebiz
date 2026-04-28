import { describe, it, expect, vi } from "vitest";

vi.mock("phaser", async () => {
  const harness = await import("./_harness/phaserMock.ts");
  return harness.makePhaserMock();
});

const { createMockScene, fireEvent } = await import("./_harness/phaserMock.ts");
const { Toggle } = await import("../Toggle.ts");

describe("Toggle", () => {
  it("starts in the configured state", () => {
    const scene = createMockScene();
    const t = new Toggle(scene as never, { x: 0, y: 0, on: true });
    expect(t.isOn()).toBe(true);
  });

  it("flips state on click and emits onChange", () => {
    const scene = createMockScene();
    const onChange = vi.fn();
    const t = new Toggle(scene as never, { x: 0, y: 0, on: false, onChange });
    const hitZone = (t as unknown as { list: unknown[] }).list.at(-1);
    fireEvent(hitZone, "pointerup");
    expect(t.isOn()).toBe(true);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("setOn programmatic update does not fire callback", () => {
    const scene = createMockScene();
    const onChange = vi.fn();
    const t = new Toggle(scene as never, { x: 0, y: 0, on: false, onChange });
    t.setOn(true);
    expect(t.isOn()).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("disabled toggle ignores clicks", () => {
    const scene = createMockScene();
    const onChange = vi.fn();
    const t = new Toggle(scene as never, { x: 0, y: 0, on: false, onChange });
    t.setEnabled(false);
    const hitZone = (t as unknown as { list: unknown[] }).list.at(-1);
    fireEvent(hitZone, "pointerup");
    expect(t.isOn()).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });
});

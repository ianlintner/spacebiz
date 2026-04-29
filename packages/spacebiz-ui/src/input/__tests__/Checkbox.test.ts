import { describe, it, expect, vi } from "vitest";

vi.mock("phaser", async () => {
  const harness = await import("./_harness/phaserMock.ts");
  return harness.makePhaserMock();
});

const { createMockScene, fireEvent } = await import("./_harness/phaserMock.ts");
const { Checkbox } = await import("../Checkbox.ts");

describe("Checkbox", () => {
  it("starts in the configured state", () => {
    const scene = createMockScene();
    const cb = new Checkbox(scene as never, { x: 0, y: 0, checked: true });
    expect(cb.isChecked()).toBe(true);
  });

  it("toggles state and fires onChange when clicked", () => {
    const scene = createMockScene();
    const onChange = vi.fn();
    const cb = new Checkbox(scene as never, {
      x: 0,
      y: 0,
      checked: false,
      onChange,
    });
    const hitZone = (cb as unknown as { list: unknown[] }).list.at(-1);
    fireEvent(hitZone, "pointerup");
    expect(cb.isChecked()).toBe(true);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("setChecked does not fire callback by default", () => {
    const scene = createMockScene();
    const onChange = vi.fn();
    const cb = new Checkbox(scene as never, {
      x: 0,
      y: 0,
      checked: false,
      onChange,
    });
    cb.setChecked(true);
    expect(cb.isChecked()).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("setEnabled(false) blocks click toggling", () => {
    const scene = createMockScene();
    const onChange = vi.fn();
    const cb = new Checkbox(scene as never, {
      x: 0,
      y: 0,
      checked: false,
      onChange,
    });
    cb.setEnabled(false);
    const hitZone = (cb as unknown as { list: unknown[] }).list.at(-1);
    fireEvent(hitZone, "pointerup");
    expect(cb.isChecked()).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });
});

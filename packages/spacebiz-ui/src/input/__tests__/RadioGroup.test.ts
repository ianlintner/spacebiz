import { describe, it, expect, vi } from "vitest";

vi.mock("phaser", async () => {
  const harness = await import("./_harness/phaserMock.ts");
  return harness.makePhaserMock();
});

const { createMockScene, fireEvent } = await import("./_harness/phaserMock.ts");
const { RadioGroup } = await import("../RadioGroup.ts");

const OPTS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];

interface RadioGroupInternals {
  list: unknown[];
  rows: Array<{ hitZone: unknown }>;
}

describe("RadioGroup", () => {
  it("starts with the configured value selected", () => {
    const scene = createMockScene();
    const g = new RadioGroup(scene as never, {
      x: 0,
      y: 0,
      options: OPTS,
      value: "b",
    });
    expect(g.getValue()).toBe("b");
  });

  it("changes value on click and fires onChange exactly once", () => {
    const scene = createMockScene();
    const onChange = vi.fn();
    const g = new RadioGroup(scene as never, {
      x: 0,
      y: 0,
      options: OPTS,
      value: "a",
      onChange,
    });
    const internals = g as unknown as RadioGroupInternals;
    fireEvent(internals.rows[2].hitZone, "pointerup");
    expect(g.getValue()).toBe("c");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("c");
  });

  it("does not re-fire onChange when clicking the already-selected row", () => {
    const scene = createMockScene();
    const onChange = vi.fn();
    const g = new RadioGroup(scene as never, {
      x: 0,
      y: 0,
      options: OPTS,
      value: "a",
      onChange,
    });
    const internals = g as unknown as RadioGroupInternals;
    fireEvent(internals.rows[0].hitZone, "pointerup");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("setValue programmatic update is silent", () => {
    const scene = createMockScene();
    const onChange = vi.fn();
    const g = new RadioGroup(scene as never, {
      x: 0,
      y: 0,
      options: OPTS,
      value: "a",
      onChange,
    });
    g.setValue("c");
    expect(g.getValue()).toBe("c");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("setValue ignores values not in the option list", () => {
    const scene = createMockScene();
    const g = new RadioGroup(scene as never, {
      x: 0,
      y: 0,
      options: OPTS,
      value: "a",
    });
    g.setValue("nope");
    expect(g.getValue()).toBe("a");
  });

  it("setEnabled(false) blocks click selection", () => {
    const scene = createMockScene();
    const onChange = vi.fn();
    const g = new RadioGroup(scene as never, {
      x: 0,
      y: 0,
      options: OPTS,
      value: "a",
      onChange,
    });
    g.setEnabled(false);
    const internals = g as unknown as RadioGroupInternals;
    fireEvent(internals.rows[1].hitZone, "pointerup");
    expect(g.getValue()).toBe("a");
    expect(onChange).not.toHaveBeenCalled();
  });
});

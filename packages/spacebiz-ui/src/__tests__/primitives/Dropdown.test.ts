import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("phaser", async () => {
  const harness = await import("../_harness/phaserMock.ts");
  return harness.makePhaserMock();
});

import { Dropdown, type DropdownOption } from "../../Dropdown.ts";
import { createMockScene, type MockScene } from "../_harness/phaserMock.ts";

let scene: MockScene;

const opts: DropdownOption[] = [
  { label: "Alpha", value: "a" },
  { label: "Beta", value: "b" },
  { label: "Gamma", value: "g" },
];

beforeEach(() => {
  scene = createMockScene("DropdownScene");
});

function makeDropdown(
  overrides: {
    defaultIndex?: number;
    onChange?: (v: string, i: number) => void;
  } = {},
) {
  return new Dropdown(scene as unknown as Phaser.Scene, {
    x: 0,
    y: 0,
    width: 200,
    options: opts,
    ...overrides,
  });
}

describe("Dropdown construction", () => {
  it("displays the default option label at index 0", () => {
    const dd = makeDropdown();
    expect(dd.getSelectedIndex()).toBe(0);
    expect(dd.getSelectedValue()).toBe("a");
  });

  it("respects defaultIndex", () => {
    const dd = makeDropdown({ defaultIndex: 2 });
    expect(dd.getSelectedIndex()).toBe(2);
    expect(dd.getSelectedValue()).toBe("g");
  });

  it("starts in the closed state with no overlay objects", () => {
    const dd = makeDropdown();
    const overlays = (dd as unknown as { overlayObjects: unknown[] })
      .overlayObjects;
    expect(overlays).toHaveLength(0);
  });
});

describe("Dropdown.setSelectedIndex", () => {
  it("updates selection within bounds", () => {
    const dd = makeDropdown();
    dd.setSelectedIndex(1);
    expect(dd.getSelectedIndex()).toBe(1);
    expect(dd.getSelectedValue()).toBe("b");
  });

  it("ignores out-of-range indices", () => {
    const dd = makeDropdown({ defaultIndex: 1 });
    dd.setSelectedIndex(-1);
    dd.setSelectedIndex(99);
    expect(dd.getSelectedIndex()).toBe(1);
  });
});

describe("Dropdown opening and closing", () => {
  it("opens on pointerdown of the trigger and creates per-option overlay objects", () => {
    const dd = makeDropdown();
    const bg = (dd as unknown as { bg: { emit: (e: string) => void } }).bg;
    bg.emit("pointerdown");
    const overlays = (dd as unknown as { overlayObjects: unknown[] })
      .overlayObjects;
    // Each option contributes 3 overlay objects (bg, border, label).
    expect(overlays.length).toBe(opts.length * 3);
  });

  it("closes on a second pointerdown of the trigger", () => {
    const dd = makeDropdown();
    const bg = (dd as unknown as { bg: { emit: (e: string) => void } }).bg;
    bg.emit("pointerdown");
    bg.emit("pointerdown");
    const overlays = (dd as unknown as { overlayObjects: unknown[] })
      .overlayObjects;
    expect(overlays).toHaveLength(0);
  });
});

describe("Dropdown selection callback", () => {
  it("calls onChange with the picked value and its index", () => {
    const onChange = vi.fn();
    const dd = makeDropdown({ onChange });
    const bg = (dd as unknown as { bg: { emit: (e: string) => void } }).bg;
    bg.emit("pointerdown");
    const overlays = (
      dd as unknown as {
        overlayObjects: Array<{ emit?: (e: string) => void }>;
      }
    ).overlayObjects;
    // The first overlay group is for index 0 (bg); pick index 1 -> overlay at offset 3
    overlays[3]?.emit?.("pointerdown");
    expect(onChange).toHaveBeenCalledWith("b", 1);
    expect(dd.getSelectedIndex()).toBe(1);
  });

  it("is a no-op when no onChange handler is provided", () => {
    const dd = makeDropdown();
    const bg = (dd as unknown as { bg: { emit: (e: string) => void } }).bg;
    bg.emit("pointerdown");
    const overlays = (
      dd as unknown as {
        overlayObjects: Array<{ emit?: (e: string) => void }>;
      }
    ).overlayObjects;
    expect(() => overlays[0]?.emit?.("pointerdown")).not.toThrow();
    expect(dd.getSelectedIndex()).toBe(0);
  });
});

describe("Dropdown.destroy", () => {
  it("closes any open overlay before destroy and does not throw", () => {
    const dd = makeDropdown();
    const bg = (dd as unknown as { bg: { emit: (e: string) => void } }).bg;
    bg.emit("pointerdown");
    expect(() => dd.destroy()).not.toThrow();
    expect(
      (dd as unknown as { overlayObjects: unknown[] }).overlayObjects,
    ).toHaveLength(0);
  });
});

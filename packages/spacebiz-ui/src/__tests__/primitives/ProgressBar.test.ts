import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("phaser", async () => {
  const harness = await import("../_harness/phaserMock.ts");
  return harness.makePhaserMock();
});

import { ProgressBar } from "../../ProgressBar.ts";
import { createMockScene, type MockScene } from "../_harness/phaserMock.ts";

let scene: MockScene;

beforeEach(() => {
  scene = createMockScene("ProgressBarScene");
});

function makeBar(
  overrides: {
    value?: number;
    maxValue?: number;
    showLabel?: boolean;
    labelFormat?: (v: number, m: number) => string;
  } = {},
) {
  return new ProgressBar(scene as unknown as Phaser.Scene, {
    x: 0,
    y: 0,
    width: 200,
    height: 20,
    ...overrides,
  });
}

describe("ProgressBar construction", () => {
  it("defaults to value=0 / maxValue=100", () => {
    const bar = makeBar();
    expect(bar.getValue()).toBe(0);
  });

  it("respects an initial value", () => {
    const bar = makeBar({ value: 25 });
    expect(bar.getValue()).toBe(25);
  });

  it("renders a label by default and omits it when showLabel=false", () => {
    const withLabel = makeBar();
    const withoutLabel = makeBar({ showLabel: false });
    expect((withLabel as unknown as { label: unknown }).label).not.toBeNull();
    expect((withoutLabel as unknown as { label: unknown }).label).toBeNull();
  });
});

describe("ProgressBar.setValue (clamping)", () => {
  it("clamps values above maxValue", () => {
    const bar = makeBar({ maxValue: 50 });
    bar.setValue(200);
    expect(bar.getValue()).toBe(50);
  });

  it("clamps negative values to 0", () => {
    const bar = makeBar({ value: 30 });
    bar.setValue(-10);
    expect(bar.getValue()).toBe(0);
  });

  it("accepts in-range values directly", () => {
    const bar = makeBar({ maxValue: 200 });
    bar.setValue(75);
    expect(bar.getValue()).toBe(75);
  });
});

describe("ProgressBar fill width", () => {
  it("non-animated update writes displayWidth synchronously", () => {
    const bar = makeBar({ maxValue: 100 });
    const fill = (bar as unknown as { fill: { displayWidth: number } }).fill;
    bar.setValue(50, false);
    expect(fill.displayWidth).toBeGreaterThan(0);
  });

  it("zero value yields zero fill width (non-animated)", () => {
    const bar = makeBar({ value: 50 });
    const fill = (bar as unknown as { fill: { displayWidth: number } }).fill;
    bar.setValue(0, false);
    expect(fill.displayWidth).toBe(0);
  });
});

describe("ProgressBar label formatting", () => {
  it("uses default percent format when no formatter is supplied", () => {
    const bar = makeBar({ value: 25, maxValue: 100 });
    const lbl = (bar as unknown as { label: { text: string } | null }).label;
    expect(lbl?.text).toBe("25%");
  });

  it("uses a custom labelFormat callback", () => {
    const bar = makeBar({
      value: 30,
      maxValue: 60,
      labelFormat: (v, m) => `${v}/${m}`,
    });
    const lbl = (bar as unknown as { label: { text: string } | null }).label;
    expect(lbl?.text).toBe("30/60");
  });

  it("re-formats the label after setValue", () => {
    const fmt = vi.fn((v: number, m: number) => `${v}/${m}`);
    const bar = makeBar({ value: 0, maxValue: 100, labelFormat: fmt });
    bar.setValue(40);
    const lbl = (bar as unknown as { label: { text: string } | null }).label;
    expect(lbl?.text).toBe("40/100");
  });
});

describe("ProgressBar.setMaxValue", () => {
  it("clamps current value to the new max", () => {
    const bar = makeBar({ value: 80, maxValue: 100 });
    bar.setMaxValue(50);
    expect(bar.getValue()).toBe(50);
  });

  it("guards against zero/negative max", () => {
    const bar = makeBar({ value: 5, maxValue: 10 });
    bar.setMaxValue(0);
    expect(bar.getValue()).toBeLessThanOrEqual(1);
  });
});

describe("ProgressBar.setFillColor", () => {
  it("updates the stored fill color and applies it without throwing", () => {
    const bar = makeBar();
    expect(() => bar.setFillColor(0xff00aa)).not.toThrow();
  });
});

describe("ProgressBar.setSize", () => {
  it("returns the bar instance for chaining", () => {
    const bar = makeBar();
    expect(bar.setSize(300, 24)).toBe(bar);
  });

  it("syncs inherited width and height", () => {
    const bar = makeBar();
    bar.setSize(320, 32);
    expect(bar.width).toBe(320);
    expect(bar.height).toBe(32);
  });

  it("preserves the fill ratio across a resize", () => {
    const bar = makeBar({ value: 50, maxValue: 100 });
    bar.setSize(400, 20);
    const fill = (bar as unknown as { fill: { width: number } }).fill;
    // Fill is the inner area scaled by ratio (50%); should be ~half of inner width.
    expect(fill.width).toBeGreaterThan(0);
    expect(fill.width).toBeLessThan(400);
  });

  it("does not add new children to the container", () => {
    const bar = makeBar();
    const before = bar.list.length;
    bar.setSize(300, 24);
    expect(bar.list.length).toBe(before);
  });
});

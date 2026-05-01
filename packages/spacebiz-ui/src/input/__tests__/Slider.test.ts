import { describe, it, expect, vi } from "vitest";

vi.mock("phaser", async () => {
  const harness = await import("./_harness/phaserMock.ts");
  return harness.makePhaserMock();
});

const { quantizeSliderValue } = await import("../sliderMath.ts");
const { createMockScene } = await import("./_harness/phaserMock.ts");
const { Slider } = await import("../Slider.ts");

describe("quantizeSliderValue", () => {
  it("clamps below min", () => {
    expect(quantizeSliderValue(-5, 0, 10)).toBe(0);
  });

  it("clamps above max", () => {
    expect(quantizeSliderValue(50, 0, 10)).toBe(10);
  });

  it("returns the value unchanged when in range and no step", () => {
    expect(quantizeSliderValue(3.7, 0, 10)).toBeCloseTo(3.7);
  });

  it("rounds to the nearest step anchored at min", () => {
    expect(quantizeSliderValue(7, 0, 10, 5)).toBe(5);
    expect(quantizeSliderValue(8, 0, 10, 5)).toBe(10);
    expect(quantizeSliderValue(12, 10, 30, 5)).toBe(10);
    expect(quantizeSliderValue(13, 10, 30, 5)).toBe(15);
  });

  it("respects a non-zero min when stepping", () => {
    expect(quantizeSliderValue(11, 10, 50, 5)).toBe(10);
    expect(quantizeSliderValue(13, 10, 50, 5)).toBe(15);
  });

  it("ignores step <= 0", () => {
    expect(quantizeSliderValue(3.3, 0, 10, 0)).toBeCloseTo(3.3);
    expect(quantizeSliderValue(3.3, 0, 10, -1)).toBeCloseTo(3.3);
  });

  it("never exceeds the max even after step rounding", () => {
    expect(quantizeSliderValue(9.9, 0, 10, 3)).toBeLessThanOrEqual(10);
  });
});

describe("Slider", () => {
  it("clamps the initial value into range", () => {
    const scene = createMockScene();
    const s = new Slider(scene as never, {
      x: 0,
      y: 0,
      width: 100,
      min: 0,
      max: 10,
      value: 99,
    });
    expect(s.getValue()).toBe(10);
  });

  it("setValue applies step rounding and does not invoke onChange", () => {
    const scene = createMockScene();
    const onChange = vi.fn();
    const s = new Slider(scene as never, {
      x: 0,
      y: 0,
      width: 100,
      min: 0,
      max: 100,
      step: 10,
      value: 0,
      onChange,
    });
    s.setValue(43);
    expect(s.getValue()).toBe(40);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("setEnabled(false) reports disabled state", () => {
    const scene = createMockScene();
    const s = new Slider(scene as never, {
      x: 0,
      y: 0,
      width: 100,
      min: 0,
      max: 10,
      value: 5,
    });
    expect(s.isEnabled()).toBe(true);
    s.setEnabled(false);
    expect(s.isEnabled()).toBe(false);
  });

  it("setSize flexes the track width and re-anchors the thumb to current value", () => {
    const scene = createMockScene();
    const s = new Slider(scene as never, {
      x: 0,
      y: 0,
      width: 100,
      min: 0,
      max: 100,
      value: 50,
    });
    expect(s.setSize(400, 24)).toBe(s);
    expect(s.width).toBe(400);
    const thumb = (s as unknown as { thumb: { x: number } }).thumb;
    // 50% across a 400px track ⇒ thumbX ≈ 200
    expect(thumb.x).toBe(200);
    const track = (s as unknown as { track: { width: number } }).track;
    expect(track.width).toBe(400);
  });

  it("setSize preserves the slider value", () => {
    const scene = createMockScene();
    const s = new Slider(scene as never, {
      x: 0,
      y: 0,
      width: 100,
      min: 0,
      max: 10,
      value: 7,
    });
    s.setSize(300, 24);
    expect(s.getValue()).toBe(7);
  });
});

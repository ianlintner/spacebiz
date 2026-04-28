import { describe, it, expect } from "vitest";
import { computeAnchor } from "../anchorMath.ts";

const base = {
  parentWidth: 1000,
  parentHeight: 800,
  childWidth: 100,
  childHeight: 50,
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

describe("computeAnchor", () => {
  it("pins to topLeft", () => {
    const r = computeAnchor({ ...base, to: "topLeft" });
    expect(r).toMatchObject({ x: 0, y: 0, width: 100, height: 50 });
  });

  it("pins to topRight", () => {
    const r = computeAnchor({ ...base, to: "topRight" });
    expect(r.x).toBe(900);
    expect(r.y).toBe(0);
  });

  it("pins to bottomRight", () => {
    const r = computeAnchor({ ...base, to: "bottomRight" });
    expect(r.x).toBe(900);
    expect(r.y).toBe(750);
  });

  it("pins to center", () => {
    const r = computeAnchor({ ...base, to: "center" });
    expect(r.x).toBe(450);
    expect(r.y).toBe(375);
  });

  it("applies offsets", () => {
    const r = computeAnchor({
      ...base,
      to: "topLeft",
      offset: { x: 10, y: 20 },
    });
    expect(r).toMatchObject({ x: 10, y: 20 });
  });

  it("applies insets to inner edges", () => {
    const r = computeAnchor({
      ...base,
      to: "topRight",
      insets: { top: 10, right: 20, bottom: 30, left: 40 },
    });
    // inner right = 1000 - 20 = 980; pin x = 980 - 100 = 880
    expect(r.x).toBe(880);
    expect(r.y).toBe(10);
  });

  it("fills horizontally", () => {
    const r = computeAnchor({
      ...base,
      to: "top",
      fill: "horizontal",
      insets: { top: 0, right: 12, bottom: 0, left: 12 },
    });
    expect(r.width).toBe(976);
    expect(r.x).toBe(12);
    expect(r.y).toBe(0);
  });

  it("fills vertically", () => {
    const r = computeAnchor({
      ...base,
      to: "left",
      fill: "vertical",
    });
    expect(r.height).toBe(800);
    expect(r.y).toBe(0);
  });

  it("fills both", () => {
    const r = computeAnchor({
      ...base,
      to: "center",
      fill: "both",
      insets: { top: 5, right: 5, bottom: 5, left: 5 },
    });
    expect(r.width).toBe(990);
    expect(r.height).toBe(790);
    expect(r.x).toBe(5);
    expect(r.y).toBe(5);
  });
});

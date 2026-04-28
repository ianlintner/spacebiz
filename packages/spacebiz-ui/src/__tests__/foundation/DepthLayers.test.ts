import { describe, it, expect } from "vitest";
import {
  DEPTH_STARFIELD,
  DEPTH_AMBIENT_MID,
  DEPTH_CONTENT,
  DEPTH_UI,
  DEPTH_MODAL,
  DEPTH_HUD,
} from "../../DepthLayers.ts";

describe("DepthLayers", () => {
  it("exports numeric constants", () => {
    for (const value of [
      DEPTH_STARFIELD,
      DEPTH_AMBIENT_MID,
      DEPTH_CONTENT,
      DEPTH_UI,
      DEPTH_MODAL,
      DEPTH_HUD,
    ]) {
      expect(typeof value).toBe("number");
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it("orders layers from background to foreground", () => {
    expect(DEPTH_STARFIELD).toBeLessThan(DEPTH_AMBIENT_MID);
    expect(DEPTH_AMBIENT_MID).toBeLessThan(DEPTH_CONTENT);
    expect(DEPTH_CONTENT).toBeLessThan(DEPTH_UI);
    expect(DEPTH_UI).toBeLessThan(DEPTH_MODAL);
    expect(DEPTH_MODAL).toBeLessThan(DEPTH_HUD);
  });

  it("contains no duplicate depth values", () => {
    const values = [
      DEPTH_STARFIELD,
      DEPTH_AMBIENT_MID,
      DEPTH_CONTENT,
      DEPTH_UI,
      DEPTH_MODAL,
      DEPTH_HUD,
    ];
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it("places content layer at the natural zero baseline", () => {
    expect(DEPTH_CONTENT).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
// Vite "?raw" loads the file content as a string at test time without
// pulling Phaser through a normal `import`. The Vitest config runs in
// node and the unblocked harness for headless component tests lands in
// plan unit 6.
import colorSwatchSource from "../ColorSwatch.ts?raw";

describe("ColorSwatch (file shape)", () => {
  it("exports a ColorSwatch class and ColorSwatchConfig type", () => {
    expect(colorSwatchSource).toMatch(/export class ColorSwatch/);
    expect(colorSwatchSource).toMatch(/export interface ColorSwatchConfig/);
  });

  it("wires onClick through a pointerdown handler", () => {
    expect(colorSwatchSource).toMatch(/pointerdown/);
    expect(colorSwatchSource).toMatch(/onClick/);
  });
});

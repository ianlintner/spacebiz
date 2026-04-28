import { describe, it, expect } from "vitest";
// Vite "?raw" loads the source text without invoking the module body
// (Phaser, which references `window`, would otherwise blow up in node).
// Plan unit 6 introduces a jsdom harness that will allow real
// construction tests.
import textInputSource from "../TextInput.ts?raw";

describe("TextInput (file shape)", () => {
  it("exports the documented surface", () => {
    expect(textInputSource).toMatch(/export class TextInput/);
    expect(textInputSource).toMatch(/export interface TextInputConfig/);
    expect(textInputSource).toMatch(/export type TextInputType/);
  });

  it("mounts a DOM <input> overlay positioned over the canvas", () => {
    expect(textInputSource).toMatch(/document\.createElement\(['"]input['"]\)/);
    expect(textInputSource).toMatch(/getBoundingClientRect/);
    expect(textInputSource).toMatch(/position\s*=\s*['"]absolute['"]/);
  });

  it("cleans up the DOM input on destroy", () => {
    expect(textInputSource).toMatch(/removeChild/);
    expect(textInputSource).toMatch(/teardownDom/);
  });

  it("guards DOM access so module loads safely in node", () => {
    expect(textInputSource).toMatch(/typeof document === ['"]undefined['"]/);
  });
});

// Vitest setup file. Runs once per test file before any test code.
// Installs the canvas polyfill so Phaser's text/texture pipeline can boot
// inside jsdom without throwing on `getContext('2d')`.
import { installCanvasMock } from "./mockCanvas.ts";

installCanvasMock();

// jsdom logs "Not implemented: window.focus" whenever Phaser starts the game
// loop. The call is harmless — replace it with a no-op so the noise doesn't
// drown out real test output.
if (typeof window !== "undefined") {
  window.focus = () => undefined;
}

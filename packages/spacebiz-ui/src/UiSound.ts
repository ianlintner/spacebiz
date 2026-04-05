/**
 * UiSound — injectable sound event handler for the UI library.
 *
 * The library itself has no dependency on any audio engine. Games register
 * a handler on startup and the library calls it via `playUiSfx()`.
 *
 * Usage (game bootstrap):
 *   import { registerUiSoundHandler } from "@spacebiz/ui";
 *   registerUiSoundHandler({ sfx: (key) => audioDirector.sfx(key) });
 */

export interface UiSoundHandler {
  sfx(key: string): void;
}

let handler: UiSoundHandler | null = null;

/** Register an audio back-end. Call once during game boot. */
export function registerUiSoundHandler(h: UiSoundHandler): void {
  handler = h;
}

/** Play a UI sound effect if a handler has been registered. No-op otherwise. */
export function playUiSfx(key: string): void {
  handler?.sfx(key);
}

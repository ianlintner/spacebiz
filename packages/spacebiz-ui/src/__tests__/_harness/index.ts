/**
 * Headless component test harness for `@spacebiz/ui`.
 *
 * Three tools, used independently:
 *
 *   1. `installCanvasMock()` / `restoreCanvasMock()`
 *      Polyfill `HTMLCanvasElement.prototype.getContext('2d')` so jsdom can
 *      satisfy Phaser's text-measurement and texture pipelines. Wired into
 *      Vitest globally via `setup.ts`; call directly only if you opt out of
 *      the global setup.
 *
 *   2. `mockScene()`
 *      Returns a minimal Phaser.Scene-shaped object backed by stubs and a
 *      real EventEmitter. Use for tests that exercise pure logic / wiring
 *      without instantiating real GameObjects.
 *
 *   3. `mountComponent(factory)`
 *      Boots a real Phaser HEADLESS game on jsdom and resolves with
 *      `{ scene, component, destroy }` once the component's constructor has
 *      run inside the scene's `create()`. Use this when assertions depend on
 *      real GameObject behavior. Always call `destroy()` in `afterEach` to
 *      avoid leaking the game across tests.
 *
 * This module is intentionally not re-exported from the package's public
 * `src/index.ts` — it's an internal test utility.
 */

export { installCanvasMock, restoreCanvasMock } from "./mockCanvas.ts";
export { mockScene } from "./mockScene.ts";
export type { MockScene } from "./mockScene.ts";
export { mountComponent } from "./mountComponent.ts";
export type { MountedComponent } from "./mountComponent.ts";

import type * as Phaser from "phaser";
import { setWidgetHook } from "../../packages/spacebiz-ui/src/WidgetHooks.ts";
import { widgetRegistry } from "./WidgetRegistry.ts";
import { createTestAPI } from "./TestAPI.ts";
import type { SftTestAPI } from "./TestAPI.ts";
import { startInvariantListener } from "./Invariants.ts";
import { logs } from "./log.ts";

declare global {
  interface Window {
    __sft?: SftTestAPI;
    /**
     * Backdoor to the active Phaser.Game for e2e specs that need to peek at
     * subsystems the QA façade doesn't expose (Phaser TextureManager, etc.).
     * Set in `installTestAPI`. Not for production use.
     */
    __SFT_GAME?: Phaser.Game;
  }
}

let installed = false;

export type SftInstallMode = "dev" | "debug";

export function installTestAPI(
  game: Phaser.Game,
  mode: SftInstallMode = "dev",
): SftTestAPI {
  if (!installed) {
    setWidgetHook(widgetRegistry.hook);
    startInvariantListener();
    installed = true;
  }
  const api = createTestAPI(game);
  if (typeof window !== "undefined") {
    window.__sft = api;
    window.__SFT_GAME = game;
  }
  if (mode === "debug") {
    console.warn(
      "⚠️ SFT QA console enabled via ?debug=1 — not for untrusted users",
    );
  }
  logs.sft.info(`QA console API installed (v${api.version}, mode=${mode})`, {
    scenes: game.scene.scenes.map((s) => s.scene.key),
  });
  return api;
}

export { widgetRegistry } from "./WidgetRegistry.ts";
export { logs, logController, channel } from "./log.ts";
export { invariants } from "./Invariants.ts";
export type { SftTestAPI } from "./TestAPI.ts";

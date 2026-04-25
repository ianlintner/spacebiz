import type * as Phaser from "phaser";
import { SftTestError } from "./types.ts";
import type { ClickResult } from "./types.ts";
import { widgetRegistry } from "./WidgetRegistry.ts";
import { gameStore } from "../data/GameStore.ts";
import { logs } from "./log.ts";

let gameRef: Phaser.Game | null = null;

export function setGame(game: Phaser.Game): void {
  gameRef = game;
}

export function getGame(): Phaser.Game {
  if (!gameRef) {
    throw new SftTestError("no-game", "Phaser.Game not attached yet", {
      hint: "installTestAPI(game) must be called after new Phaser.Game()",
    });
  }
  return gameRef;
}

export function click(testId: string): ClickResult {
  const hit = widgetRegistry.find(testId);
  if (!hit) {
    const available = widgetRegistry.list().map((e) => e.testId);
    throw new SftTestError("unknown-test-id", `No widget with testId "${testId}"`, {
      testId,
      hint: `Try __sft.list(). Current scene widgets: ${available.slice(0, 12).join(", ")}${available.length > 12 ? ", ..." : ""}`,
    });
  }
  const reg = hit.registration;
  if (!reg.isVisible()) {
    throw new SftTestError("widget-not-visible", `Widget "${testId}" is not visible`, { testId });
  }
  if (!reg.isEnabled()) {
    throw new SftTestError("widget-disabled", `Widget "${testId}" is disabled`, { testId });
  }
  logs.sft.debug(`click ${testId}`, { label: reg.label, scene: hit.scene.scene.key });
  reg.invoke();
  return {
    ok: true,
    testId,
    label: reg.label,
    scene: hit.scene.scene.key,
  };
}

export function clickIfPresent(testId: string): ClickResult | null {
  const hit = widgetRegistry.find(testId);
  if (!hit) return null;
  return click(testId);
}

export function goToScene(key: string, data?: object): void {
  const game = getGame();
  const mgr = game.scene;
  const target = mgr.getScene(key);
  if (!target) {
    throw new SftTestError("scene-not-found", `Scene "${key}" not registered`, {
      hint: `Known scenes: ${mgr.scenes.map((s) => s.scene.key).join(", ")}`,
    });
  }
  for (const s of mgr.getScenes(true)) {
    mgr.stop(s.scene.key);
  }
  mgr.start(key, data);
}

export function waitFor(
  pred: () => boolean,
  timeoutMs = 5000,
  pollMs = 50,
): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = (): void => {
      try {
        if (pred()) return resolve();
      } catch (err) {
        return reject(err);
      }
      if (Date.now() - start >= timeoutMs) {
        return reject(new SftTestError("timeout", "waitFor predicate never became true"));
      }
      setTimeout(tick, pollMs);
    };
    tick();
  });
}

export interface SemanticActions {
  newGame: (seed?: number) => Promise<void>;
  endTurn: () => ClickResult | null;
  openScene: (key: string, data?: object) => void;
  closeModal: () => void;
  seed: (n: number) => void;
  getSeed: () => number;
}

export function makeSemanticActions(): SemanticActions {
  return {
    newGame: async (seed?: number) => {
      const game = getGame();
      if (seed !== undefined) gameStore.reset(seed);
      // Navigate: stop everything, start MainMenu -> then click the "New Campaign" path.
      const mgr = game.scene;
      for (const s of mgr.getScenes(true)) mgr.stop(s.scene.key);
      mgr.start("MainMenuScene");
      await waitFor(() => {
        return widgetRegistry
          .list()
          .some((e) => e.testId === "btn-new-campaign" || e.testId === "btn-new-game");
      }, 3000);
      const newCampaign =
        clickIfPresent("btn-new-campaign") ?? clickIfPresent("btn-new-game");
      if (!newCampaign) {
        throw new SftTestError("unknown-test-id", "Could not find New Campaign button", {
          hint: "__sft.list() to inspect MainMenuScene buttons",
        });
      }
    },
    endTurn: () => clickIfPresent("btn-end-turn"),
    openScene: (key, data) => goToScene(key, data),
    closeModal: () => {
      // Modals render a close "×" as a Text, not a Button — clicking the overlay also cancels.
      // For MVP, press Escape through the global keyboard.
      const game = getGame();
      const scenes = game.scene.getScenes(true);
      const evt = new KeyboardEvent("keydown", { code: "Escape", key: "Escape" });
      for (const s of scenes) {
        s.input?.keyboard?.emit("keydown", evt);
      }
    },
    seed: (n) => {
      const state = gameStore.getState();
      gameStore.update({ seed: n });
      logs.sft.info("seed reset", { from: state.seed, to: n });
    },
    getSeed: () => gameStore.getState().seed,
  };
}

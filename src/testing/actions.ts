import type * as Phaser from "phaser";
import { SftTestError } from "./types.ts";
import type { ClickResult } from "./types.ts";
import { widgetRegistry } from "./WidgetRegistry.ts";
import { gameStore } from "../data/GameStore.ts";
import { logs } from "./log.ts";
import { SeededRNG } from "../utils/SeededRNG.ts";
import { selectDilemma } from "../game/events/Storyteller.ts";
import { DILEMMA_TEMPLATES } from "../game/events/DilemmaDefinitions.ts";
import {
  SimulationRunner,
  type SimulationConfig,
  type SimulationResult,
} from "../game/simulation/SimulationRunner.ts";
import type { ChoiceEvent, DilemmaTemplate, GameState } from "../data/types.ts";

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
    throw new SftTestError(
      "unknown-test-id",
      `No widget with testId "${testId}"`,
      {
        testId,
        hint: `Try __sft.list(). Current scene widgets: ${available.slice(0, 12).join(", ")}${available.length > 12 ? ", ..." : ""}`,
      },
    );
  }
  const reg = hit.registration;
  if (!reg.isVisible()) {
    throw new SftTestError(
      "widget-not-visible",
      `Widget "${testId}" is not visible`,
      { testId },
    );
  }
  if (!reg.isEnabled()) {
    throw new SftTestError(
      "widget-disabled",
      `Widget "${testId}" is disabled`,
      { testId },
    );
  }
  logs.sft.debug(`click ${testId}`, {
    label: reg.label,
    scene: hit.scene.scene.key,
  });
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
        return reject(
          new SftTestError("timeout", "waitFor predicate never became true"),
        );
      }
      setTimeout(tick, pollMs);
    };
    tick();
  });
}

export interface SandboxRunOptions {
  seed?: number;
  turns?: number;
  gameSize?: "quick" | "standard" | "epic";
  galaxyShape?: "spiral" | "elliptical" | "ring" | "irregular";
  companyCount?: number;
}

export interface SemanticActions {
  newGame: (seed?: number) => Promise<void>;
  endTurn: () => ClickResult | null;
  openScene: (key: string, data?: object) => void;
  closeModal: () => void;
  seed: (n: number) => void;
  getSeed: () => number;
  /**
   * Push a deterministic dilemma into `pendingChoiceEvents` and switch to
   * DilemmaScene. Used by e2e visual specs so the modal can be screenshotted
   * without playing through enough turns to get the storyteller to fire one
   * organically. `templateId` defaults to the first registered dilemma; pass
   * one explicitly to capture a specific category. Returns the event id.
   */
  triggerDilemma: (templateId?: string) => string;
  /**
   * Set the game into a terminal "completed" / "bankruptcy" state and switch
   * to GameOverScene. Used by e2e visual specs — bypasses the normal
   * end-of-game animation so the screenshot is stable.
   */
  forceGameOver: (reason?: "completed" | "bankruptcy") => void;
  /**
   * Run the AI sandbox synchronously to completion and switch directly to
   * SimPlaybackScene with a frozen tween scale so the playback animation
   * pauses on its first frame. Returns the simulation result.
   */
  startSandboxPlayback: (opts?: SandboxRunOptions) => SimulationResult;
  /**
   * Run the AI sandbox synchronously to completion and switch directly to
   * SimSummaryScene with the final SimulationResult attached as init data.
   */
  startSandboxSummary: (opts?: SandboxRunOptions) => SimulationResult;
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
          .some(
            (e) =>
              e.testId === "btn-new-campaign" || e.testId === "btn-new-game",
          );
      }, 3000);
      const newCampaign =
        clickIfPresent("btn-new-campaign") ?? clickIfPresent("btn-new-game");
      if (!newCampaign) {
        throw new SftTestError(
          "unknown-test-id",
          "Could not find New Campaign button",
          {
            hint: "__sft.list() to inspect MainMenuScene buttons",
          },
        );
      }
    },
    endTurn: () => clickIfPresent("btn-end-turn"),
    openScene: (key, data) => goToScene(key, data),
    closeModal: () => {
      // Modals render a close "×" as a Text, not a Button — clicking the overlay also cancels.
      // For MVP, press Escape through the global keyboard.
      const game = getGame();
      const scenes = game.scene.getScenes(true);
      const evt = new KeyboardEvent("keydown", {
        code: "Escape",
        key: "Escape",
      });
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
    triggerDilemma: (templateId?: string) => {
      const game = getGame();
      const state = gameStore.getState();

      let event: ChoiceEvent | null = null;
      if (!templateId) {
        // Storyteller is RNG-driven and deterministic; try it first so seeded
        // runs surface a state-appropriate dilemma when one's eligible.
        const rng = new SeededRNG(state.seed + state.turn + 17);
        event = selectDilemma(rng, state);
      }
      if (!event) {
        const tpl = templateId
          ? DILEMMA_TEMPLATES.find((t) => t.id === templateId)
          : DILEMMA_TEMPLATES[0];
        if (!tpl) {
          throw new SftTestError(
            "unknown-test-id",
            templateId
              ? `Dilemma template "${templateId}" not registered`
              : "No dilemma templates registered",
            {
              hint: `Known templates: ${DILEMMA_TEMPLATES.map((t) => t.id).join(", ")}`,
            },
          );
        }
        event = synthesiseDilemma(tpl, state.turn);
      }

      gameStore.update({
        pendingChoiceEvents: [...state.pendingChoiceEvents, event],
      });

      const mgr = game.scene;
      for (const s of mgr.getScenes(true)) mgr.stop(s.scene.key);
      mgr.start("DilemmaScene");
      logs.sft.info("triggerDilemma", {
        id: event.id,
        dilemmaId: event.dilemmaId,
      });
      return event.id;
    },
    forceGameOver: (reason: "completed" | "bankruptcy" = "completed") => {
      const game = getGame();
      const state = gameStore.getState();
      const partial: Partial<GameState> = {
        gameOver: true,
        gameOverReason: reason,
        // Force a non-trivial final turn so the subtitle copy doesn't read
        // "Bankrupt after 0 turns".
        turn: Math.max(state.turn, state.maxTurns),
        // Skip the "Rex's Reveal" AdviserPanel — it's a stateful drawer that
        // relayout() rebuilds on every resize, and its internal Rectangle
        // can outlive a SCENE.start() boundary in QA flows that re-enter
        // GameOverScene at multiple viewports. Pretending the secret is
        // already revealed gives a stable, repeatable screenshot.
        adviser: state.adviser
          ? { ...state.adviser, secretRevealed: true }
          : state.adviser,
      };
      gameStore.update(partial);

      const mgr = game.scene;
      for (const s of mgr.getScenes(true)) mgr.stop(s.scene.key);
      mgr.start("GameOverScene");
      logs.sft.info("forceGameOver", { reason });
    },
    startSandboxPlayback: (opts: SandboxRunOptions = {}) => {
      const game = getGame();
      // SimPlaybackScene is the player's end-of-turn animation: it reads
      // gameStore at create() time and runs simulateTurn() against it. We
      // run a headless sandbox sim purely to return a deterministic
      // SimulationResult to the caller for diagnostics; the visible scene
      // is driven by whatever game state already exists in the store.
      const result = runSandboxSync(opts);

      const mgr = game.scene;
      for (const s of mgr.getScenes(true)) mgr.stop(s.scene.key);

      // GameHUDScene is the persistent overlay above SimPlaybackScene; it
      // also fields the post-animation switchContentScene call. We freeze
      // the tween + timer pipeline below so that call never fires.
      mgr.start("GameHUDScene");
      mgr.start("SimPlaybackScene");

      // Freeze the tween + timer pipeline so the screenshot is stable on
      // the first painted frame. Run on the next microtask so the Scene has
      // finished `create()` (where the tweens are constructed) first.
      Promise.resolve().then(() => {
        const playback = mgr.getScene("SimPlaybackScene") as
          | (Phaser.Scene & {
              tweens: { timeScale: number };
              time: { timeScale: number };
            })
          | null;
        if (playback) {
          playback.tweens.timeScale = 0;
          playback.time.timeScale = 0;
        }
      });

      logs.sft.info("startSandboxPlayback", {
        seed: result.config.seed,
        turns: result.summary.totalTurns,
      });
      return result;
    },
    startSandboxSummary: (opts: SandboxRunOptions = {}) => {
      const game = getGame();
      const result = runSandboxSync(opts);

      const mgr = game.scene;
      for (const s of mgr.getScenes(true)) mgr.stop(s.scene.key);
      mgr.start("SimSummaryScene", { result });
      logs.sft.info("startSandboxSummary", {
        seed: result.config.seed,
        turns: result.summary.totalTurns,
      });
      return result;
    },
  };
}

/**
 * Build a minimal ChoiceEvent from a DilemmaTemplate, bypassing the
 * Storyteller's eligibility/cooldown gates. Used when QA wants a specific
 * template or when the Storyteller bails out for the current state.
 */
function synthesiseDilemma(tpl: DilemmaTemplate, turn: number): ChoiceEvent {
  const optionSuccess: Record<string, number> = {};
  for (const o of tpl.options) optionSuccess[o.id] = o.baseSuccess ?? 60;
  return {
    id: `dilemma_qa_${tpl.id}_${turn}`,
    eventId: tpl.id,
    prompt: tpl.prompt,
    options: tpl.options,
    turnCreated: turn,
    optionSuccess,
    dilemmaId: tpl.id,
    category: tpl.category,
    imageKey: tpl.imageKey,
  };
}

/**
 * Run a sandbox simulation synchronously (no UI animations) for the QA
 * helpers. Defaults: seed=2026, gameSize=quick, 4 spiral companies. `turns`
 * caps `maxTurns` so visual tests don't sit on a 60-turn run.
 */
function runSandboxSync(opts: SandboxRunOptions): SimulationResult {
  const config: SimulationConfig = {
    seed: opts.seed ?? 2026,
    gameSize: opts.gameSize ?? "quick",
    galaxyShape: opts.galaxyShape ?? "spiral",
    companyCount: opts.companyCount ?? 4,
    maxTurns: opts.turns ?? 8,
    logLevel: "summary",
  };
  const runner = new SimulationRunner();
  return runner.run(config);
}

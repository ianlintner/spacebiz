import type * as Phaser from "phaser";
import type {
  GameStateSnapshot,
  SceneInfo,
  TestIdEntry,
  ClickResult,
} from "./types.ts";
import { widgetRegistry } from "./WidgetRegistry.ts";
import {
  click,
  clickIfPresent,
  goToScene,
  waitFor,
  setGame,
  makeSemanticActions,
} from "./actions.ts";
import type { SemanticActions } from "./actions.ts";
import { logController } from "./log.ts";
import type { LogController } from "./log.ts";
import { invariants } from "./Invariants.ts";
import type { InvariantController } from "./Invariants.ts";
import { snapshot as takeSnapshot, getSceneInfo } from "./snapshot.ts";
import { gameStore } from "../data/GameStore.ts";
import {
  getPortrait,
  getNewsItems,
  getAdviserState,
  seedFakeTurnResult,
} from "./tier2.ts";
import type { PortraitStatus, AdviserSnapshot } from "./tier2.ts";
import type { TickerItem } from "../generation/news/types.ts";

export const TEST_API_VERSION = "0.2.0";

export interface SftTestAPI {
  readonly version: string;
  help: () => string;
  list: (filter?: string) => TestIdEntry[];
  currentScene: () => SceneInfo;
  click: (testId: string) => ClickResult;
  clickIfPresent: (testId: string) => ClickResult | null;
  goToScene: (key: string, data?: object) => void;
  snapshot: () => GameStateSnapshot;
  state: () => Readonly<ReturnType<typeof gameStore.getState>>;
  waitFor: (pred: () => boolean, timeoutMs?: number) => Promise<void>;
  actions: SemanticActions;
  log: LogController;
  invariants: InvariantController;
  seed: (n: number) => void;
  getSeed: () => number;
  /** Tier-2 inspection: portrait load status (defaults to player CEO). */
  getPortrait: (ceoId?: string) => PortraitStatus;
  /** Tier-2 inspection: current galactic news ticker items. */
  getNewsItems: () => TickerItem[];
  /** Tier-2 inspection: adviser subsystem state + current message. */
  getAdviserState: () => AdviserSnapshot;
  /** Test-only: append a synthetic TurnResult so news pipeline has data. */
  _seedFakeTurnResult: () => number;
}

export function createTestAPI(game: Phaser.Game): SftTestAPI {
  setGame(game);
  const actions = makeSemanticActions();
  return {
    version: TEST_API_VERSION,
    help: () => {
      const lines = [
        `Star Freight Tycoon — QA console API v${TEST_API_VERSION}`,
        "",
        "Discovery:",
        "  __sft.list(filter?)       → widgets in active scenes",
        "  __sft.currentScene()      → { active[], modalStack[] }",
        "  __sft.snapshot()          → { version, turn, seed, state, scene }",
        "",
        "Interaction:",
        "  __sft.click(testId)       → fire a widget's onClick",
        "  __sft.clickIfPresent(id)  → click if found, else null",
        "  __sft.goToScene(key)      → stop all, start key",
        "",
        "Semantic actions:",
        "  __sft.actions.newGame(seed?)",
        "  __sft.actions.endTurn()",
        "  __sft.actions.openScene(key)",
        "  __sft.actions.closeModal()",
        "  __sft.actions.seed(n) / getSeed()",
        "",
        "Async helpers:",
        "  await __sft.waitFor(() => predicate, timeoutMs=5000)",
        "",
        "Logging:",
        "  __sft.log.tail(50)  setLevel(ch, lvl)  only(...ch)  all()  clear()",
        "  channels: economy contracts routes fleet sim ai events ui invariants sft",
        "",
        "Invariants:",
        "  __sft.invariants.list() / run() / recent() / strict(true|false)",
        "",
        "Determinism:",
        "  __sft.seed(n)  /  __sft.getSeed()",
        "",
        "Tier-2 inspection:",
        "  __sft.getPortrait(ceoId?)  → { ceoId, textureKey, loaded, ... }",
        "  __sft.getNewsItems()       → TickerItem[]",
        "  __sft.getAdviserState()    → { state, pending, current }",
        "",
        "Docs: docs/qa/console-api.md",
      ];
      const text = lines.join("\n");
      console.info(text);
      return text;
    },
    list: (filter) => widgetRegistry.list(filter),
    currentScene: () => getSceneInfo(game),
    click,
    clickIfPresent,
    goToScene,
    snapshot: () => takeSnapshot(game),
    state: () => gameStore.getState(),
    waitFor,
    actions,
    log: logController,
    invariants,
    seed: (n) => actions.seed(n),
    getSeed: () => actions.getSeed(),
    getPortrait,
    getNewsItems,
    getAdviserState,
    _seedFakeTurnResult: seedFakeTurnResult,
  };
}

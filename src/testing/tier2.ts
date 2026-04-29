/**
 * Tier-2 inspection helpers exposed via the `__sft` QA console.
 *
 * Tier-2 components (CEO portraits, galactic news ticker, adviser panel,
 * empire borders, ship map sprites) live in `src/ui/` today and will move to
 * `packages/rogue-universe-shared/` per work unit 15. These helpers read live
 * runtime state so e2e specs and the MCP tools can verify those subsystems
 * without poking at private internals.
 */
import type * as Phaser from "phaser";
import { gameStore } from "../data/GameStore.ts";
import { generateTickerFeed } from "../generation/news/tickerFeed.ts";
import { CEO_PORTRAITS, getPortraitTextureKey } from "../data/portraits.ts";
import type { TickerItem } from "../generation/news/types.ts";
import type {
  AdviserMessage,
  AdviserState,
  PortraitCategory,
} from "../data/types.ts";
import { getGame } from "./actions.ts";

export interface PortraitStatus {
  ceoId: string;
  textureKey: string;
  loaded: boolean;
  category: PortraitCategory | null;
  /** True when the requested ceoId matches the player's current CEO. */
  isPlayer: boolean;
}

export interface AdviserSnapshot {
  state: AdviserState;
  /** Number of pending messages still queued. */
  pending: number;
  /** Most-recent message (if any) for quick assertions. */
  current: AdviserMessage | null;
}

/**
 * Return whether a CEO portrait texture is loaded into Phaser's TextureManager.
 * If `ceoId` is omitted, defaults to the player's CEO portrait id.
 */
export function getPortrait(ceoId?: string): PortraitStatus {
  const state = gameStore.getState();
  const id = ceoId ?? state.ceoPortrait?.portraitId ?? "";
  const textureKey = id ? getPortraitTextureKey(id) : "";
  const game = getGame();
  // Phaser's TextureManager is global to the Game instance; any active scene
  // sees the same set of keys.
  const firstScene = game.scene.getScenes(true)[0] ?? game.scene.scenes[0];
  const loaded = !!textureKey && !!firstScene?.textures.exists(textureKey);
  const def = CEO_PORTRAITS.find((p) => p.id === id) ?? null;
  return {
    ceoId: id,
    textureKey,
    loaded,
    category: def?.category ?? null,
    isPlayer: id === state.ceoPortrait?.portraitId,
  };
}

/**
 * Return the ticker items the news panel would currently render. Mirrors the
 * computation in `GameHUDScene.buildTickerItems`. Returns `[]` before the
 * first turn completes (no `TurnResult` yet).
 */
export function getNewsItems(): TickerItem[] {
  const state = gameStore.getState();
  const lastTurn = state.history[state.history.length - 1];
  if (!lastTurn) return [];
  return generateTickerFeed(state, lastTurn);
}

/** Snapshot of the adviser subsystem (state + currently-displayed message). */
export function getAdviserState(): AdviserSnapshot {
  const state = gameStore.getState();
  const adviser = state.adviser;
  const current =
    adviser.pendingMessages.length > 0 ? adviser.pendingMessages[0] : null;
  return {
    state: adviser,
    pending: adviser.pendingMessages.length,
    current,
  };
}

/** For tests that need direct access to the underlying scene set. */
export function getActiveScenes(): Phaser.Scene[] {
  return getGame().scene.getScenes(true);
}

/**
 * Inject a minimal synthetic `TurnResult` into `state.history` so the news
 * ticker pipeline has data to render without requiring a full simulation
 * playback. Test-only — not part of the production API. Returns the new
 * history length.
 */
export function seedFakeTurnResult(): number {
  const state = gameStore.getState();
  const turnResult = {
    turn: state.turn,
    eventsOccurred: [] as string[],
    aiSummaries: [] as unknown[],
    deltaCash: 0,
    revenue: 0,
    expenses: 0,
    contractsCompleted: 0,
    marketShifts: [] as unknown[],
    narrativeBeats: [] as unknown[],
    diplomaticChanges: [] as unknown[],
  } as unknown as (typeof state.history)[number];
  gameStore.update({ history: [...state.history, turnResult] });
  return gameStore.getState().history.length;
}

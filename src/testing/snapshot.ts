import type * as Phaser from "phaser";
import type { GameStateSnapshot, SceneInfo } from "./types.ts";
import { gameStore } from "../data/GameStore.ts";

const VERSION = "0.1.0";

export function getSceneInfo(game: Phaser.Game | null): SceneInfo {
  if (!game) return { active: [], modalStack: [] };
  const active: string[] = [];
  for (const scene of game.scene.getScenes(true)) {
    active.push(scene.scene.key);
  }
  return { active, modalStack: [] };
}

export function snapshot(game: Phaser.Game | null): GameStateSnapshot {
  const state = gameStore.getState();
  return {
    version: VERSION,
    ts: Date.now(),
    scene: getSceneInfo(game),
    seed: state.seed,
    turn: state.turn,
    state: JSON.parse(JSON.stringify(state)) as typeof state,
  };
}

export const SNAPSHOT_VERSION = VERSION;

import { gameStore } from "../data/GameStore.ts";
import type { GameState } from "../data/types.ts";
import { initAdviserState } from "./adviser/AdviserEngine.ts";

const SAVE_KEY = "sft_save";
const AUTOSAVE_KEY = "sft_autosave";

interface SaveEnvelope {
  version: 1;
  timestamp: number;
  turn: number;
  state: GameState;
}

function writeSave(key: string, state: GameState): void {
  const envelope: SaveEnvelope = {
    version: 1,
    timestamp: Date.now(),
    turn: state.turn,
    state,
  };
  localStorage.setItem(key, JSON.stringify(envelope));
}

function readSave(key: string): GameState | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  try {
    const envelope = JSON.parse(raw) as SaveEnvelope;
    if (
      envelope &&
      typeof envelope === "object" &&
      envelope.version === 1 &&
      envelope.state &&
      typeof envelope.state.turn === "number"
    ) {
      return envelope.state;
    }
    return null;
  } catch {
    return null;
  }
}

/** Migrate older saves that lack newer fields. */
function migrateSave(state: GameState): GameState {
  let migrated = state;
  if (!migrated.adviser) {
    migrated = { ...migrated, adviser: initAdviserState() };
  }
  if (migrated.stationHub === undefined) {
    migrated = { ...migrated, stationHub: null };
  }
  return migrated;
}

/** Serialize the current game state to localStorage under the manual-save key. */
export function saveGame(state: GameState): void {
  writeSave(SAVE_KEY, state);
}

/** Read a previously saved game from localStorage. Returns null if no save exists or data is corrupted. */
export function loadGame(): GameState | null {
  const state = readSave(SAVE_KEY);
  return state ? migrateSave(state) : null;
}

/** Returns true when a valid manual save exists in localStorage. */
export function hasSaveGame(): boolean {
  return readSave(SAVE_KEY) !== null;
}

/** Remove the manual save from localStorage. */
export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

/** Serialize state to localStorage under the auto-save key (called after each turn). */
export function autoSave(state: GameState): void {
  writeSave(AUTOSAVE_KEY, state);
}

/** Load auto-save data. Returns null if none exists or data is corrupted. */
export function loadAutoSave(): GameState | null {
  const state = readSave(AUTOSAVE_KEY);
  return state ? migrateSave(state) : null;
}

/** Remove the auto-save from localStorage. */
export function deleteAutoSave(): void {
  localStorage.removeItem(AUTOSAVE_KEY);
}

/**
 * Convenience: save + restore into gameStore in one call.
 * Returns true if a save was found and loaded, false otherwise.
 */
export function loadGameIntoStore(): boolean {
  const state = loadGame();
  if (!state) return false;
  gameStore.setState(state);
  return true;
}
